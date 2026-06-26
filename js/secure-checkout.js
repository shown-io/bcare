/* =====================================================
   بي كير — secure-checkout.js  v2
   Stripe-style: حقل MM/YY موحّد + Luhn + كشف نوع البطاقة
===================================================== */
'use strict';

/* ─── كشف نوع البطاقة ────────────────────────────── */
const CARD_TYPES = [
  { name:'Visa',       cls:'visa', prefix:/^4/,                                           len:[13,16,19], cvv:3 },
  { name:'Mastercard', cls:'mc',   prefix:/^5[1-5]|^2(2[2-9]|[3-6]\d|7[01]|720)/,        len:[16],       cvv:3 },
  { name:'Amex',       cls:'amex', prefix:/^3[47]/,                                        len:[15],       cvv:4 },
  { name:'Mada',       cls:'mada', prefix:/^(4(0117[5-9]|01180|28|36|49|51|55|58|6304|6759|676[1-3]|9))|^9682/,len:[16],cvv:3},
];

function detectType(raw) {
  const c = raw.replace(/\D/g,'');
  return CARD_TYPES.find(t => t.prefix.test(c)) || null;
}

/* ─── Luhn ───────────────────────────────────────── */
function luhn(raw) {
  const c = raw.replace(/\D/g,'');
  if (!c.length) return false;
  let sum = 0, alt = false;
  for (let i = c.length-1; i >= 0; i--) {
    let d = parseInt(c[i],10);
    if (alt) { d *= 2; if(d>9) d-=9; }
    sum += d; alt = !alt;
  }
  return sum % 10 === 0;
}

/* ─── تنسيق رقم البطاقة ──────────────────────────── */
function fmtCardNum(raw, type) {
  const c = raw.replace(/\D/g,'');
  if (type?.name === 'Amex') {
    /* 4-6-5 */
    const p1 = c.slice(0,4), p2 = c.slice(4,10), p3 = c.slice(10,15);
    return [p1,p2,p3].filter(Boolean).join(' ');
  }
  return c.match(/.{1,4}/g)?.join(' ') || c;
}

/* ─── تنسيق MM/YY ────────────────────────────────── */
function fmtExpiry(raw) {
  const c = raw.replace(/\D/g,'');
  if (c.length <= 2) return c;
  return c.slice(0,2) + '/' + c.slice(2,4);
}

/* ─── قراءة بيانات الجلسة ───────────────────────── */
function loadData() {
  try {
    const offer  = JSON.parse(sessionStorage.getItem('bcare_offer')  || '{}');
    const policy = JSON.parse(sessionStorage.getItem('bcare_policy') || '{}');
    const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };

    set('co-amount-company', offer.companyName || '—');
    set('co-amount-price',   offer.total ? 'ر.س '+parseFloat(offer.total).toFixed(2) : '—');
    set('co-sum-company',    offer.companyName || '—');
    set('co-sum-total',      offer.total ? 'ر.س '+parseFloat(offer.total).toFixed(2) : '—');

    /* اسم الحامل من policy-details */
    const nameInp = document.getElementById('cc-name');
    if (nameInp && policy.fullName) {
      nameInp.value = policy.fullName;
      updatePrevName(policy.fullName);
    }
  } catch(e) {}
}

/* ─── تحديث البطاقة البصرية ─────────────────────── */
function updatePrevNum(fmt) {
  const e = document.getElementById('prev-number');
  if (e) e.innerHTML = fmt ? fmt.replace(/ /g,' &nbsp;') : '•••• &nbsp;•••• &nbsp;•••• &nbsp;••••';
}
function updatePrevName(v) {
  const e = document.getElementById('prev-name');
  if (e) e.textContent = v?.trim().toUpperCase() || 'الاسم الكامل';
}
function updatePrevExpiry(v) {
  const e = document.getElementById('prev-expiry');
  if (e) e.textContent = v || 'MM/YY';
}
function updatePrevType(name) {
  const e = document.getElementById('prev-type');
  if (e) e.textContent = name || '';
}

/* ─── خطأ / مسح خطأ ──────────────────────────────── */
function setCardErr(msg) {
  const e = document.getElementById('err-card');
  const b = document.getElementById('card-fields-box');
  if (e) e.textContent = msg;
  if (b) { msg ? b.classList.add('has-error') : b.classList.remove('has-error'); }
}
function setNameErr(msg) {
  const e = document.getElementById('err-name');
  const b = document.getElementById('name-field-box');
  if (e) e.textContent = msg;
  if (b) { msg ? b.classList.add('has-error') : b.classList.remove('has-error'); }
}

/* ─── تحقق الحقول ────────────────────────────────── */
function checkNum() {
  const raw = (document.getElementById('cc-number')||{}).value||'';
  const c   = raw.replace(/\D/g,'');
  if (!c) { setCardErr('رقم البطاقة مطلوب'); return false; }
  if (c.length < 13) { setCardErr('رقم البطاقة قصير — تأكد من الإدخال'); return false; }
  if (!luhn(c)) { setCardErr('رقم البطاقة غير صحيح'); return false; }
  return true;
}
function checkExpiry() {
  const v = (document.getElementById('cc-expiry')||{}).value||'';
  const parts = v.split('/');
  const mo = parseInt(parts[0]||'0',10);
  const yr = parseInt((parts[1]||'').trim(),10);
  if (!mo || mo<1 || mo>12) { setCardErr('تاريخ الانتهاء غير صحيح — أدخل MM/YY'); return false; }
  const now = new Date();
  const fullYr = yr < 100 ? 2000+yr : yr;
  if (!yr || fullYr < now.getFullYear()) { setCardErr('البطاقة منتهية الصلاحية'); return false; }
  if (fullYr === now.getFullYear() && mo < now.getMonth()+1) { setCardErr('البطاقة منتهية الصلاحية'); return false; }
  return true;
}
function checkCVV() {
  const v    = (document.getElementById('cc-cvv')||{}).value||'';
  const raw  = (document.getElementById('cc-number')||{}).value||'';
  const type = detectType(raw);
  const len  = type?.name === 'Amex' ? 4 : 3;
  if (!v) { setCardErr('رمز CVV مطلوب'); return false; }
  if (!/^\d+$/.test(v) || v.length !== len) { setCardErr(`رمز CVV يجب أن يكون ${len} أرقام`); return false; }
  return true;
}
function checkName() {
  const v = (document.getElementById('cc-name')||{}).value||'';
  if (!v.trim()) { setNameErr('اسم حامل البطاقة مطلوب'); return false; }
  if (v.trim().length < 3) { setNameErr('يرجى إدخال الاسم الكامل'); return false; }
  setNameErr(''); return true;
}

function validateAll() {
  const r1 = checkNum();
  const r2 = r1 && checkExpiry(); /* نعرض خطأ رقم البطاقة أولاً */
  const r3 = r1 && r2 && checkCVV();
  const r4 = checkName();
  return r1 && r2 && r3 && r4;
}

/* ─── حقل رقم البطاقة ────────────────────────────── */
function initCardNum() {
  const inp = document.getElementById('cc-number');
  if (!inp) return;

  inp.addEventListener('input', () => {
    const type   = detectType(inp.value);
    const maxRaw = type?.name==='Amex' ? 15 : 16;
    const raw    = inp.value.replace(/\D/g,'').slice(0, maxRaw);
    const fmt    = fmtCardNum(raw, type);
    inp.value    = fmt;

    /* معاينة */
    updatePrevNum(fmt);
    updatePrevType(type?.name || '');

    /* pill */
    const pill = document.getElementById('card-type-pill');
    if (pill) {
      pill.textContent = type?.name || '';
      pill.className   = 'sc-card-type-pill ' + (type?.cls||'');
    }

    /* مسح خطأ */
    setCardErr('');
  });
  inp.addEventListener('blur', () => { checkNum(); checkExpiry(); checkCVV(); });
}

/* ─── حقل MM/YY موحّد ────────────────────────────── */
function initExpiry() {
  const inp = document.getElementById('cc-expiry');
  if (!inp) return;

  inp.addEventListener('input', () => {
    /* تنسيق تلقائي: 1206 → 12/06 */
    const raw = inp.value.replace(/\D/g,'').slice(0,4);
    inp.value = fmtExpiry(raw);
    updatePrevExpiry(inp.value);
    setCardErr('');
  });
  inp.addEventListener('blur', checkExpiry);
}

/* ─── حقل CVV ────────────────────────────────────── */
function initCVV() {
  const inp = document.getElementById('cc-cvv');
  if (!inp) return;
  inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g,''); setCardErr(''); });
  inp.addEventListener('blur', checkCVV);
}

/* ─── حقل الاسم ──────────────────────────────────── */
function initName() {
  const inp = document.getElementById('cc-name');
  if (!inp) return;
  inp.addEventListener('input', () => { updatePrevName(inp.value); setNameErr(''); });
  inp.addEventListener('blur', checkName);
}

/* ─── إرسال النموذج ─────────────────────────────── */
function initSubmit() {
  const form = document.getElementById('checkout-form');
  const btn  = document.getElementById('pay-now-btn');
  if (!form||!btn) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateAll()) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons spin-icon">autorenew</span> جاري معالجة الدفع...';

    setTimeout(() => {
      /* شاشة النجاح */
      document.getElementById('checkout-card')?.classList.add('hidden');
      const sc = document.getElementById('success-card');
      if (sc) sc.classList.remove('hidden');
      try {
        const offer = JSON.parse(sessionStorage.getItem('bcare_offer')||'{}');
        const ref   = 'BC-' + Date.now().toString().slice(-8).toUpperCase();
        const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
        set('success-ref-num', ref);
        set('success-company', offer.companyName || '—');
        set('success-amount',  offer.total ? 'ر.س '+parseFloat(offer.total).toFixed(2) : '—');
        offer.refNumber = ref;
        sessionStorage.setItem('bcare_offer', JSON.stringify(offer));
      } catch(err){}
      window.scrollTo({top:0,behavior:'smooth'});
    }, 2000);
  });
}

/* ─── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initCardNum();
  initExpiry();
  initCVV();
  initName();
  initSubmit();
});
