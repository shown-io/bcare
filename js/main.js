/* =====================================================
   بي كير — main.js  (v2)
   دوال مطابقة للكود الأصلي المستخرج من Angular bundle
   بدون backend — تحقق شكلي كامل
===================================================== */
'use strict';

/* ─── Helper ─────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

/* =====================================================
   حالة النموذج
===================================================== */
const formState = {
  insurancetype:   '1',   // '1'=تأمين جديد  '2'=نقل ملكية
  vehicleIdTypeId: '1',   // '1'=استمارة      '2'=بطاقة جمركية
};

/* =====================================================
   1. CAPTCHA — وهمي مرسوم على Canvas
   (مطابق لتوليد الأرقام العشوائية في الأصل — minLength 4)
===================================================== */
const Captcha = (function () {
  const CHARS = '0123456789';
  let code = '';

  function rnd(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function generate(len = 4) {
    return Array.from({ length: len }, () => CHARS[rnd(0, 9)]).join('');
  }

  function draw(canvas, txt) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    /* خلفية فاتحة */
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#f5f0fa';
    ctx.fillRect(0, 0, w, h);

    /* خطوط تشويش */
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(rnd(0, w), rnd(0, h));
      ctx.lineTo(rnd(0, w), rnd(0, h));
      ctx.strokeStyle = `rgba(${rnd(100,180)},${rnd(60,140)},${rnd(160,220)},.35)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    /* نقاط تشويش */
    for (let i = 0; i < 18; i++) {
      ctx.beginPath();
      ctx.arc(rnd(0, w), rnd(0, h), 1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${rnd(80,180)},${rnd(40,120)},${rnd(150,220)},.45)`;
      ctx.fill();
    }

    /* رسم الأرقام بأسلوب مطابق للأصل (مائلة، ملوّنة، متداخلة قليلاً) */
    const colors = ['#5b2d90','#7c3aed','#1d4ed8','#be185d','#0f766e'];
    const charW  = w / (txt.length + 0.5);

    txt.split('').forEach((ch, i) => {
      ctx.save();
      const x = charW * (i + 0.6) + charW * 0.15;
      const y = h / 2 + rnd(-3, 5);
      ctx.translate(x, y);
      ctx.rotate((Math.random() - 0.5) * 0.45);
      ctx.font = `bold ${rnd(20, 26)}px Arial, sans-serif`;
      ctx.fillStyle = colors[i % colors.length];
      /* بعض الأرقام مُسطَّرة (مثل الأصل) */
      if (Math.random() > 0.5) {
        ctx.beginPath();
        ctx.moveTo(-2, 4);
        ctx.lineTo(14, 4);
        ctx.strokeStyle = colors[(i + 2) % colors.length];
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    });

    /* إطار خفيف */
    ctx.strokeStyle = '#d8ccea';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, w, h);
  }

  function refresh() {
    const canvas = $('#captcha-canvas');
    if (!canvas) return;
    code = generate(4);
    draw(canvas, code);
    const inp = $('#captcha-input');
    if (inp) { inp.value = ''; }
    clearFieldError('captcha');
  }

  function validate(userInput) {
    return userInput.trim() === code;
  }

  return { refresh, validate, getCode: () => code };
})();

/* =====================================================
   2. Custom Dropdown — سنة صنع المركبة (بطاقة جمركية)
   نطاق: 1922 → 2027، قائمة صغيرة متجاوبة مع الجوال
===================================================== */
const MfgDD = {
  allYears: [],
  selected: null,
  isOpen: false,
  _initialized: false,

  init() {
    if (this._initialized) return;
    this._initialized = true;
    const min = 1922, max = 2027;
    for (let y = max; y >= min; y--) this.allYears.push(y);
    this.render();
    this.bindEvents();
  },

  render() {
    const list = $('#mfg-list');
    if (!list) return;
    list.innerHTML = this.allYears.map(y =>
      `<li class="mfg-dd__item${this.selected===y?' selected':''}" data-year="${y}">${y}</li>`
    ).join('');
    list.querySelectorAll('.mfg-dd__item').forEach(li => {
      li.addEventListener('click', () => this.select(Number(li.dataset.year)));
    });
  },

  select(year) {
    this.selected = year;
    const display = $('#mfg-display');
    const trigger = $('#mfg-year');
    const hidden  = $('#mfg-year-val');
    if (display) display.textContent = String(year);
    if (trigger) { trigger.classList.add('has-value'); trigger.classList.remove('input-error'); }
    if (hidden)  hidden.value = String(year);
    clearFieldError('mfg-year');
    this.close();
  },

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    const panel   = $('#mfg-panel');
    const trigger = $('#mfg-year');
    if (panel)   panel.classList.remove('hidden');
    if (trigger) { trigger.classList.add('open'); trigger.setAttribute('aria-expanded','true'); }
    /* إزالة overflow المخفي عشان القائمة تظهر برا الحاوية */
    const row = $('#field-customs-row');
    if (row) row.style.overflow = 'visible';
    this.render();
    if (this.selected) {
      const sel = $('#mfg-list')?.querySelector('.selected');
      if (sel) setTimeout(() => sel.scrollIntoView({ block:'nearest' }), 50);
    }
  },

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const panel   = $('#mfg-panel');
    const trigger = $('#mfg-year');
    if (panel)   panel.classList.add('hidden');
    if (trigger) { trigger.classList.remove('open'); trigger.setAttribute('aria-expanded','false'); }
    /* إعادة overflow المخفي */
    const row = $('#field-customs-row');
    if (row) row.style.overflow = '';
  },

  bindEvents() {
    const trigger = $('#mfg-year');
    if (trigger) {
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        this.isOpen ? this.close() : this.open();
      });
    }
    document.addEventListener('click', e => {
      const dd = $('#mfg-dd');
      if (dd && !dd.contains(e.target)) this.close();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  },
};

/* =====================================================
   3. التحقق من رقم الهوية السعودي
   مطابق تماماً للكودين: Vn (first-digit) + O1 (Luhn)
   من Angular bundle الأصلي
===================================================== */

/* Vn(true): الرقم الأول يجب أن يكون 1 أو 2 أو 7 */
function validateFirstDigit(id) {
  const first = String(id)[0];
  return first === '1' || first === '2' || first === '7';
}

/* O1: خوارزمية Luhn السعودية (بالضبط من الكود الأصلي) */
function validateSaudiIdChecksum(id) {
  if (String(id).length !== 10) return false;
  let total = 0;
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      /* المواضع الزوجية: ضاعف الرقم ثم اجمع خانتيه */
      const doubled = String(2 * Number(String(id).substr(i, 1))).padStart(2, '0');
      total += Number(doubled[0]) + Number(doubled[1]);
    } else {
      /* المواضع الفردية: أضف الرقم مباشرة */
      total += Number(String(id).substr(i, 1));
    }
  }
  return total % 10 === 0;
}

/* دالة التحقق الكاملة من الهوية */
function validateNationalId(value) {
  const v = String(value).trim();
  if (!v)              return { valid: false, error: 'رقم الهوية / الإقامة مطلوب' };
  if (v.length !== 10) return { valid: false, error: 'رقم الهوية / الإقامة غير صحيحة' };
  if (!/^\d{10}$/.test(v)) return { valid: false, error: 'رقم الهوية / الإقامة غير صحيحة' };
  if (!validateFirstDigit(v)) return { valid: false, error: 'رقم الهوية / الإقامة غير صحيحة' };
  if (!validateSaudiIdChecksum(v)) return { valid: false, error: 'رقم الهوية / الإقامة غير صحيحة' };
  return { valid: true, error: '' };
}

/* =====================================================
   4. عرض / إخفاء رسائل الخطأ
===================================================== */
function showFieldError(fieldKey, msg) {
  const errEl  = $(`#${fieldKey}-error`);
  const inpEl  = getFieldInput(fieldKey);
  if (errEl) errEl.textContent = msg;
  if (inpEl) inpEl.classList.add('input-error');
  /* Captcha row */
  if (fieldKey === 'captcha') {
    const row = $('.captcha-row');
    if (row) row.classList.add('input-error');
  }
}

function clearFieldError(fieldKey) {
  const errEl = $(`#${fieldKey}-error`);
  const inpEl = getFieldInput(fieldKey);
  if (errEl) errEl.textContent = '';
  if (inpEl) inpEl.classList.remove('input-error');
  if (fieldKey === 'captcha') {
    const row = $('.captcha-row');
    if (row) row.classList.remove('input-error');
  }
}

function clearAllErrors() {
  ['national-id','seller-id','seq-number','customs-number','mfg-year','captcha'].forEach(clearFieldError);
  const res = $('#form-result');
  if (res) { res.textContent = ''; res.className = 'form-result hidden'; }
}

function getFieldInput(key) {
  const map = {
    'national-id':    '#national-id',
    'seller-id':      '#seller-id',
    'seq-number':     '#seq-number',
    'customs-number': '#customs-number',
    'mfg-year':       '#mfg-year',
    'captcha':        '#captcha-input',
  };
  return map[key] ? $(map[key]) : null;
}

/* =====================================================
   5. changeInsurancetype — مطابق للأصل
   '1' = تأمين جديد  |  '2' = نقل ملكية
===================================================== */
function changeInsurancetype(type) {
  formState.insurancetype = type;

  const fieldSeller = $('#field-seller');
  const labelNatId  = $('#national-id-label');
  const inpNatId    = $('#national-id');

  if (type === '2') {
    /* نقل ملكية — دائماً استمارة (بطاقة جمركية غير متاحة) */
    if (fieldSeller) fieldSeller.dataset.hidden = 'false';
    if (labelNatId)  labelNatId.textContent = 'رقم هوية المشتري';
    if (inpNatId)    inpNatId.placeholder   = 'رقم هوية المشتري';
    const radioSerial = $('#radio-serial');
    if (radioSerial) radioSerial.checked = true;
    changeRegisterType('1');
  } else {
    /* تأمين جديد */
    if (fieldSeller) fieldSeller.dataset.hidden = 'true';
    if (labelNatId)  labelNatId.textContent = 'رقم الهوية / الإقامة';
    if (inpNatId)    inpNatId.placeholder   = 'رقم الهوية / الإقامة';
  }

  const sellerInp = $('#seller-id');
  if (sellerInp) sellerInp.value = '';
  if (inpNatId)  inpNatId.value  = '';
  clearAllErrors();
}

/* =====================================================
   6. changeRegisterType — مطابق للأصل
   '1' = استمارة (تسلسلي)  |  '2' = بطاقة جمركية
===================================================== */
function changeRegisterType(type) {
  formState.vehicleIdTypeId = type;

  /* إذا كان نقل ملكية واختار بطاقة جمركية → يرجع تلقائياً لتأمين جديد */
  if (type === '2' && formState.insurancetype === '2') {
    changeInsurancetype('1');
    /* تحديث واجهة التبويبات */
    const tabs = $$('.purpose-tab');
    tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
    const newTab = $('#ptab-new');
    if (newTab) { newTab.classList.add('active'); newTab.setAttribute('aria-selected','true'); }
    return; /* changeInsurancetype يعيد تعيين كل شيء */
  }

  const fieldSerial     = $('#field-serial');
  const fieldCustomsRow = $('#field-customs-row');
  const seqInput        = $('#seq-number');

  if (type === '1') {
    /* استمارة */
    if (fieldSerial)     fieldSerial.style.display     = '';
    if (fieldCustomsRow) fieldCustomsRow.dataset.hidden = 'true';
    if (seqInput) { seqInput.placeholder = 'الرقم التسلسلي'; seqInput.value = ''; }
    clearFieldError('customs-number');
    clearFieldError('mfg-year');
  } else {
    /* بطاقة جمركية */
    if (fieldSerial)     fieldSerial.style.display      = 'none';
    if (fieldCustomsRow) fieldCustomsRow.dataset.hidden  = 'false';
    if (seqInput) { seqInput.value = ''; }
    clearFieldError('seq-number');
  }
}

/* =====================================================
   7. تبويبات الغرض (تأمين جديد / نقل ملكية)
===================================================== */
function initPurposeTabs() {
  const tabs = $$('.purpose-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected','false'); });
      tab.classList.add('active');
      tab.setAttribute('aria-selected','true');
      changeInsurancetype(tab.dataset.purpose);
    });
  });
}

/* =====================================================
   8. أزرار الراديو — نوع التسجيل
===================================================== */
function initRegistrationRadio() {
  const radios = $$('input[name="vehicleIdType"]');
  radios.forEach(radio => {
    radio.addEventListener('change', () => {
      if (radio.checked) changeRegisterType(radio.value);
    });
  });
}

/* =====================================================
   9. إدخال أرقام فقط في الحقول العددية
===================================================== */
function initNumericInputs() {
  const numericIds = ['national-id','seller-id','seq-number','customs-number'];
  numericIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
      el.value = el.value.replace(/\D/g, '');
    });
    el.addEventListener('keypress', e => {
      if (!/\d/.test(e.key) && !['Backspace','Delete','Tab','Enter','ArrowLeft','ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    });
  });
}

/* =====================================================
   10. التحقق الفوري (real-time) — مطابق للموقع الأصلي
   - عند الكتابة (input): يمسح الخطأ مؤقتاً
   - عند مغادرة الحقل (blur): يتحقق ويُظهر الإشعار فوراً
===================================================== */
function initLiveValidation() {
  /* ربط: id الحقل → دالة التحقق + مفتاح الخطأ */
  const bindings = [
    { id: 'seller-id',      err: 'seller-id',      check: () => checkSellerId() },
    { id: 'national-id',    err: 'national-id',    check: () => checkNationalId() },
    { id: 'seq-number',     err: 'seq-number',     check: () => checkSeqNumber() },
    { id: 'customs-number', err: 'customs-number', check: () => checkCustomsNumber() },
    { id: 'mfg-year',       err: 'mfg-year',       check: () => checkMfgYear() },
    { id: 'captcha-input',  err: 'captcha',        check: () => checkCaptcha(false) },
  ];

  bindings.forEach(({ id, err, check }) => {
    const el = document.getElementById(id);
    if (!el) return;

    /* أثناء الكتابة: امسح الخطأ (تجربة سلسة) */
    el.addEventListener('input', () => clearFieldError(err));

    /* عند مغادرة الحقل: تحقّق وأظهر الإشعار إن لزم */
    el.addEventListener('blur', () => {
      const val = (el.value || '').trim();
      /* لا نُظهر "مطلوب" لحقل لم يُلمس ويبقى فارغاً عند أول تحميل،
         لكن بمجرد مغادرته (blur) نتحقق فعلياً مثل الأصل */
      check();
    });

    /* للقوائم المنسدلة: تحقّق فور التغيير */
    if (el.tagName === 'SELECT') {
      el.addEventListener('change', () => check());
    }
  });

  /* خاص بالهوية في نقل الملكية: عند تغيير البائع، أعد فحص تكرار المشتري */
  const seller = $('#seller-id');
  if (seller) {
    seller.addEventListener('blur', () => {
      if (formState.insurancetype === '2') checkNationalId();
    });
  }
}

/* =====================================================
   11. دوال التحقق لكل حقل (تُستخدم في blur والإرسال)
   رسائل مطابقة لـ ar.json الأصلي
===================================================== */

/* رقم هوية البائع (نقل ملكية فقط) */
function checkSellerId(showCaptchaRefresh) {
  if (formState.insurancetype !== '2') return true;
  const val = ($('#seller-id') || {}).value || '';
  const res = validateNationalId(val);
  if (!res.valid) {
    showFieldError('seller-id', res.error.replace('رقم الهوية / الإقامة', 'رقم هوية البائع'));
    return false;
  }
  clearFieldError('seller-id');
  return true;
}

/* رقم الهوية / الإقامة (أو المشتري) — مع فحص التكرار */
function checkNationalId() {
  const val   = ($('#national-id') || {}).value || '';
  const label = formState.insurancetype === '2' ? 'رقم هوية المشتري' : 'رقم الهوية / الإقامة';
  const res   = validateNationalId(val);
  if (!res.valid) {
    showFieldError('national-id', res.error.replace('رقم الهوية / الإقامة', label));
    return false;
  }
  /* فحص التكرار في نقل الملكية: البائع == المشتري → "رقم هوية مكرر" */
  if (formState.insurancetype === '2') {
    const sellerVal = ($('#seller-id') || {}).value || '';
    if (sellerVal && val && sellerVal === val) {
      showFieldError('national-id', 'رقم هوية مكرر');
      return false;
    }
  }
  clearFieldError('national-id');
  return true;
}

/* الرقم التسلسلي (استمارة) */
function checkSeqNumber() {
  if (formState.vehicleIdTypeId !== '1') return true;
  const val = ($('#seq-number') || {}).value || '';
  if (!val.trim()) {
    showFieldError('seq-number', 'الرقم التسلسلي مطلوب');
    return false;
  }
  if (val.length > 10) {
    showFieldError('seq-number', 'الرقم التسلسلي خطأ');
    return false;
  }
  clearFieldError('seq-number');
  return true;
}

/* الرقم الجمركي (بطاقة جمركية) */
function checkCustomsNumber() {
  if (formState.vehicleIdTypeId !== '2') return true;
  const val = ($('#customs-number') || {}).value || '';
  if (!val.trim()) {
    showFieldError('customs-number', 'الرقم الجمركي مطلوب');
    return false;
  }
  if (val.length < 8 || val.length > 10) {
    showFieldError('customs-number', 'الرقم الجمركي غير صحيح — يجب أن يكون 8 إلى 10 أرقام');
    return false;
  }
  clearFieldError('customs-number');
  return true;
}

/* سنة صنع المركبة (بطاقة جمركية) */
function checkMfgYear() {
  if (formState.vehicleIdTypeId !== '2') return true;
  const val = ($('#mfg-year-val') || {}).value || '';
  if (!val) {
    showFieldError('mfg-year', 'سنة صنع المركبة مطلوبة');
    return false;
  }
  clearFieldError('mfg-year');
  return true;
}

/* رمز التحقق (minLength 4) */
function checkCaptcha(refreshOnFail) {
  const val = ($('#captcha-input') || {}).value || '';
  if (!val.trim() || val.trim().length < 4) {
    showFieldError('captcha', 'رمز التحقق مطلوب');
    return false;
  }
  if (!Captcha.validate(val)) {
    showFieldError('captcha', 'رمز التحقق غير صحيح');
    if (refreshOnFail) Captcha.refresh();
    return false;
  }
  clearFieldError('captcha');
  return true;
}

/* =====================================================
   التحقق الكامل عند الإرسال
===================================================== */
function validateForm() {
  /* نُجري كل الفحوصات (لا نوقف عند أول خطأ — لإظهار كل الأخطاء معاً مثل الأصل) */
  const results = [
    checkSellerId(),
    checkNationalId(),
    checkSeqNumber(),
    checkCustomsNumber(),
    checkMfgYear(),
    checkCaptcha(true),
  ];
  let valid = results.every(Boolean);

  /* الموافقة (acceptTerms) — الزر يبقى معطّلاً حتى التعليم */
  const terms = $('#accept-terms');
  if (!terms || !terms.checked) valid = false;

  return valid;
}

/* =====================================================
   12. إرسال النموذج (شكلي — بدون backend)
===================================================== */
function initFormSubmit() {
  const form      = $('#quote-form');
  const submitBtn = $('#submit-btn');
  const resultBox = $('#form-result');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateForm()) return;

    /* تخزين بيانات النموذج في sessionStorage للصفحة التالية */
    sessionStorage.setItem('bcare_form', JSON.stringify({
      insurancetype:   formState.insurancetype,
      vehicleIdTypeId: formState.vehicleIdTypeId,
      nationalId:      ($('#national-id')     || {}).value || '',
      sellerId:        ($('#seller-id')        || {}).value || '',
      seqNumber:       ($('#seq-number')       || {}).value || '',
      customsNumber:   ($('#customs-number')   || {}).value || '',
      mfgYear:         ($('#mfg-year-val')      || {}).value || '',
    }));

    /* انتقال مباشر بدون إشعار — الإشعار يظهر في الصفحة التالية */
    window.location.href = 'submit-inquiry.html';
  });
}

/* =====================================================
   13. تفعيل / تعطيل زر الإرسال
   مطابق للأصل: form.valid && acceptTerms === true
===================================================== */
function initSubmitState() {
  const terms     = $('#accept-terms');
  const submitBtn = $('#submit-btn');
  if (!terms || !submitBtn) return;

  function update() {
    submitBtn.disabled = !terms.checked;
  }
  terms.addEventListener('change', update);
  update();
}

/* =====================================================
   14. تبويبات الخدمات (مركبات، طبي، سفر...)
===================================================== */
function initServiceTabs() {
  const tabs = $$('.service-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', e => {
      if (tab.dataset.service === 'vehicles') {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      }
    });
  });
}

/* =====================================================
   15. هامبرغر — مُدار من layout.js
===================================================== */

/* =====================================================
   16. أقسام الفوتر القابلة للطي (جوال)
===================================================== */
function initFooterAccordion() {
  const toggles = $$('.footer-col-toggle');
  toggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      if (window.innerWidth >= 640) return;
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggles.forEach(t => {
        t.setAttribute('aria-expanded','false');
        const ul = t.nextElementSibling;
        if (ul) ul.classList.remove('open');
      });
      if (!expanded) {
        toggle.setAttribute('aria-expanded','true');
        const ul = toggle.nextElementSibling;
        if (ul) ul.classList.add('open');
      }
    });
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 640) {
      toggles.forEach(t => t.setAttribute('aria-expanded','false'));
      $$('.footer-links').forEach(ul => ul.classList.remove('open'));
    }
  });
}

/* =====================================================
   17. Intersection Observer — ظهور البطاقات
===================================================== */
function initRevealCards() {
  const cards = $$('.feature-card, .discount-card, .why-card');
  if (!('IntersectionObserver' in window)) {
    cards.forEach(c => c.classList.add('visible'));
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -24px 0px' });
  cards.forEach(c => obs.observe(c));
}

/* =====================================================
   18. Shadow هيدر عند التمرير
===================================================== */
function initHeaderShadow() {
  const header = $('#header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.style.boxShadow = window.scrollY > 8
      ? '0 4px 18px rgba(20,99,148,.16)'
      : '0 1px 4px rgba(20,99,148,.10)';
  }, { passive: true });
}

/* =====================================================
   19. تمرير سلس للروابط الداخلية
===================================================== */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - (($('#header') || {}).offsetHeight || 66) - 10;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
}

/* =====================================================
   20. زر "عرض المزيد من الخصومات"
===================================================== */
function initMoreDiscounts() {
  const btn = $('#btn-more-discounts');
  if (!btn) return;
  btn.addEventListener('click', () => {
    btn.textContent = 'لا توجد خصومات إضافية حالياً';
    btn.disabled = true;
    btn.style.cssText += ';opacity:.55;cursor:not-allowed';
  });
}

/* =====================================================
   21. دوران أيقونة Captcha عند التحديث
===================================================== */
function initCaptchaRefresh() {
  const btn = $('#captcha-refresh');
  if (!btn) return;
  btn.addEventListener('click', () => {
    Captcha.refresh();
    btn.classList.add('spinning');
    setTimeout(() => btn.classList.remove('spinning'), 500);
  });
}

/* =====================================================
   INIT — تهيئة كل شيء عند تحميل الصفحة
   ملاحظة: الهيدر/الفوتر/back-to-top/smooth-scroll
   تُدار من layout.js الذي يُحمَّل قبل main.js
===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  /* نموذج */
  MfgDD.init();
  Captcha.refresh();
  initPurposeTabs();
  initRegistrationRadio();
  initNumericInputs();
  initLiveValidation();
  initSubmitState();
  initFormSubmit();

  /* واجهة */
  initServiceTabs();
  initRevealCards();
  initMoreDiscounts();
  initCaptchaRefresh();

  /* تهيئة حالة أولية صحيحة */
  changeInsurancetype('1');
  changeRegisterType('1');
});
