/* =====================================================
   بي كير — secure-checkout.js
   الدفع الآمن — تحقق بطاقات عالمي (Luhn + كشف النوع)
===================================================== */
'use strict';

/* ─── كشف نوع البطاقة (IIN/BIN) ───────────────────── */
const CARD_TYPES = [
  { name:'Visa',       prefix:/^4/,                       len:[13,16,19], cvv:3 },
  { name:'Mastercard', prefix:/^5[1-5]|^2(2[2-9]|[3-6]\d|7[01]|720)/,len:[16], cvv:3 },
  { name:'Amex',       prefix:/^3[47]/,                   len:[15],       cvv:4 },
  { name:'Mada',       prefix:/^4(0117[5-9]|01180|01181[0-4]|02|06|28|36|49|51|55|57|58|6304|6759|676[1-3]|9)/,len:[16],cvv:3},
  { name:'Discover',   prefix:/^6(01100|01105|01109|01[2-9]|22126|2213|6221[3-9]|622[2-8]|6229[01]|64|65)/,len:[16,19],cvv:3},
];

function detectCardType(num) {
  const clean = num.replace(/\s/g,'');
  return CARD_TYPES.find(t => t.prefix.test(clean)) || null;
}

/* ─── خوارزمية Luhn ─────────────────────────────── */
function luhn(num) {
  const clean = num.replace(/\D/g,'');
  if (!clean.length) return false;
  let sum = 0;
  let alt = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let d = parseInt(clean[i], 10);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/* ─── تنسيق رقم البطاقة ─────────────────────────── */
function formatCardNumber(raw, type) {
  const clean = raw.replace(/\D/g,'');
  if (type?.name === 'Amex') {
    /* 4-6-5 */
    return clean.replace(/(\d{4})(\d{1,6})?(\d{1,5})?/,'(_1 _2 _3)'
      .replace('_1','$1').replace('_2','$2').replace('_3','$3')).trim()
      .replace(/^(\d{4})(\d{6})(\d{0,5})/,'$1 $2 $3').trim();
  }
  /* 4-4-4-4 */
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

/* ─── قراءة sessionStorage ────────────────────────── */
function loadCheckoutData() {
  try {
    const offer  = JSON.parse(sessionStorage.getItem('bcare_offer')  || '{}');
    const policy = JSON.parse(sessionStorage.getItem('bcare_policy') || '{}');

    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };

    /* ملخص المبلغ */
    setTxt('co-amount-company', offer.companyName || '—');
    setTxt('co-amount-price',   offer.total ? 'ر.س ' + parseFloat(offer.total).toFixed(2) : '—');

    /* ملخص العملية */
    setTxt('co-sum-company', offer.companyName || '—');
    setTxt('co-sum-total',   offer.total ? 'ر.س ' + parseFloat(offer.total).toFixed(2) : '—');

    /* اسم حامل البطاقة من policy-details */
    const nameInp = document.getElementById('cc-name');
    if (nameInp && policy.fullName) {
      nameInp.value = policy.fullName;
      updatePreviewName(policy.fullName);
    }
  } catch(e) { /* ignore */ }
}

/* ─── معاينة البطاقة ────────────────────────────── */
function updatePreviewNumber(formatted) {
  const el = document.getElementById('prev-number');
  if (!el) return;
  el.textContent = formatted || '•••• •••• •••• ••••';
}
function updatePreviewName(name) {
  const el = document.getElementById('prev-name');
  if (!el) return;
  el.textContent = name?.trim().toUpperCase() || 'الاسم الكامل';
}
function updatePreviewExpiry(month, year) {
  const el = document.getElementById('prev-expiry');
  if (!el) return;
  el.textContent = (month||'MM') + '/' + (year ? year.slice(-2) : 'YY');
}
function updatePreviewType(typeName) {
  const el = document.getElementById('prev-type');
  if (!el) return;
  el.textContent = typeName || '';
}

/* ─── نظام التحقق ────────────────────────────────── */
function showErr(id, msg) {
  const e = document.getElementById('err-' + id);
  const i = document.getElementById('cc-' + id);
  if (e) e.textContent = msg;
  if (i) i.classList.add('off-err');
}
function clearErr(id) {
  const e = document.getElementById('err-' + id);
  const i = document.getElementById('cc-' + id);
  if (e) e.textContent = '';
  if (i) i.classList.remove('off-err');
}

function checkCardNumber() {
  const raw   = (document.getElementById('cc-number')||{}).value||'';
  const clean = raw.replace(/\D/g,'');
  if (!clean) { showErr('number','رقم البطاقة مطلوب'); return false; }
  if (clean.length < 13) { showErr('number','رقم البطاقة قصير جداً'); return false; }
  if (!luhn(clean)) { showErr('number','رقم البطاقة غير صحيح'); return false; }
  clearErr('number'); return true;
}
function checkCardName() {
  const v = (document.getElementById('cc-name')||{}).value||'';
  if (!v.trim()) { showErr('name','اسم حامل البطاقة مطلوب'); return false; }
  if (v.trim().length < 3) { showErr('name','يرجى إدخال الاسم الكامل'); return false; }
  clearErr('name'); return true;
}
function checkExpiry() {
  const mo = parseInt((document.getElementById('cc-month')||{}).value||'0');
  const yr = parseInt((document.getElementById('cc-year') ||{}).value||'0');
  const now = new Date();
  const curY = now.getFullYear();
  const curM = now.getMonth() + 1;

  if (!mo || mo < 1 || mo > 12) { showErr('month','شهر الانتهاء غير صحيح (1-12)'); return false; }
  clearErr('month');

  const fullYr = yr < 100 ? 2000 + yr : yr;
  if (!yr || fullYr < curY) { showErr('year','سنة الانتهاء غير صحيحة'); return false; }
  if (fullYr === curY && mo < curM) { showErr('year','البطاقة منتهية الصلاحية'); return false; }
  clearErr('year'); return true;
}
function checkCVV() {
  const v    = (document.getElementById('cc-cvv')||{}).value||'';
  const raw  = (document.getElementById('cc-number')||{}).value||'';
  const type = detectCardType(raw);
  const len  = type?.name === 'Amex' ? 4 : 3;
  if (!v.trim()) { showErr('cvv','رمز الأمان مطلوب'); return false; }
  if (!/^\d+$/.test(v) || v.length !== len) {
    showErr('cvv', `رمز الأمان يجب أن يكون ${len} أرقام`);
    return false;
  }
  clearErr('cvv'); return true;
}
function validateAll() {
  const r1 = checkCardNumber();
  const r2 = checkCardName();
  const r3 = checkExpiry();
  const r4 = checkCVV();
  return r1 && r2 && r3 && r4;
}

/* ─── تهيئة حقل رقم البطاقة ─────────────────────── */
function initCardNumberInput() {
  const inp = document.getElementById('cc-number');
  if (!inp) return;

  inp.addEventListener('input', () => {
    const raw   = inp.value.replace(/\D/g,'');
    const type  = detectCardType(raw);
    const formatted = formatCardNumber(raw, type);

    /* تحديد الحد الأقصى للطول */
    const maxLen = type?.name === 'Amex' ? 17 : 19;
    if (formatted.length > maxLen) return;
    inp.value = formatted;

    /* تحديث المعاينة */
    updatePreviewNumber(formatted);
    updatePreviewType(type?.name || '');

    /* أيقونة النوع */
    const badge = document.getElementById('card-type-badge');
    if (badge) badge.textContent = type?.name || '';

    /* مسح الخطأ عند الكتابة */
    clearErr('number');
  });
  inp.addEventListener('blur', checkCardNumber);
}

/* ─── حقول أخرى ─────────────────────────────────── */
function initOtherInputs() {
  /* الاسم */
  const nameInp = document.getElementById('cc-name');
  if (nameInp) {
    nameInp.addEventListener('input', () => { updatePreviewName(nameInp.value); clearErr('name'); });
    nameInp.addEventListener('blur', checkCardName);
  }
  /* الشهر */
  const moInp = document.getElementById('cc-month');
  if (moInp) {
    moInp.addEventListener('input', () => {
      moInp.value = moInp.value.replace(/\D/g,'');
      updatePreviewExpiry(moInp.value, (document.getElementById('cc-year')||{}).value);
      clearErr('month');
    });
    moInp.addEventListener('blur', checkExpiry);
  }
  /* السنة */
  const yrInp = document.getElementById('cc-year');
  if (yrInp) {
    yrInp.addEventListener('input', () => {
      yrInp.value = yrInp.value.replace(/\D/g,'');
      updatePreviewExpiry((document.getElementById('cc-month')||{}).value, yrInp.value);
      clearErr('year');
    });
    yrInp.addEventListener('blur', checkExpiry);
  }
  /* CVV */
  const cvvInp = document.getElementById('cc-cvv');
  if (cvvInp) {
    cvvInp.addEventListener('input', () => { cvvInp.value = cvvInp.value.replace(/\D/g,''); clearErr('cvv'); });
    cvvInp.addEventListener('blur', checkCVV);
  }
}

/* ─── إرسال النموذج ─────────────────────────────── */
function initFormSubmit() {
  const form = document.getElementById('checkout-form');
  const btn  = document.getElementById('pay-now-btn');
  if (!form || !btn) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateAll()) {
      const firstErr = form.querySelector('.off-err');
      if (firstErr) firstErr.scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }

    /* محاكاة تحميل */
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons" style="font-size:1rem;animation:spin .8s linear infinite">autorenew</span> جاري معالجة الدفع...';

    setTimeout(() => {
      /* إخفاء نموذج الدفع وإظهار شاشة النجاح */
      const checkoutCard = document.getElementById('checkout-card');
      const successCard  = document.getElementById('success-card');
      if (checkoutCard) checkoutCard.classList.add('hidden');
      if (successCard)  successCard.classList.remove('hidden');

      /* تحديث شاشة النجاح */
      try {
        const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
        const ref   = 'BC-' + Date.now().toString().slice(-8).toUpperCase();
        const setTxt = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
        setTxt('success-ref-num',  ref);
        setTxt('success-company',  offer.companyName || '—');
        setTxt('success-amount',   offer.total ? 'ر.س ' + parseFloat(offer.total).toFixed(2) : '—');

        /* تخزين رقم المرجع */
        offer.refNumber = ref;
        sessionStorage.setItem('bcare_offer', JSON.stringify(offer));
      } catch(e) {}

      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 2000);
  });
}

/* ─── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadCheckoutData();
  initCardNumberInput();
  initOtherInputs();
  initFormSubmit();
});
