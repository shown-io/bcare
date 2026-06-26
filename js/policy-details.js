/* =====================================================
   بي كير — policy-details.js
   تفاصيل وثيقة التأمين — نظام تحقق كامل
===================================================== */
'use strict';

const $p  = id  => document.getElementById(id);
const qsp = sel => document.querySelector(sel);

/* ─── التقويم الهجري ──────────────────────────────── */
const HIJRI_MONTHS_PD = [
  {v:'01',l:'01-محرم'},   {v:'02',l:'02-صفر'},
  {v:'03',l:'03-ربيع الاول'}, {v:'04',l:'04-ربيع الثاني'},
  {v:'05',l:'05-جمادى الاول'},{v:'06',l:'06-جمادى الثاني'},
  {v:'07',l:'07-رجب'},    {v:'08',l:'08-شعبان'},
  {v:'09',l:'09-رمضان'},  {v:'10',l:'10-شوال'},
  {v:'11',l:'11-ذو القعدة'},{v:'12',l:'12-ذوالحجة'},
];

function populateBirthDate() {
  /* الأيام 1-30 */
  const dayEl = $p('pd-birth-day');
  if (dayEl) {
    for (let d = 1; d <= 30; d++) {
      const o = document.createElement('option');
      o.value = String(d).padStart(2,'0');
      o.textContent = String(d).padStart(2,'0');
      dayEl.appendChild(o);
    }
  }
  /* الشهور الهجرية */
  const moEl = $p('pd-birth-month');
  if (moEl) {
    HIJRI_MONTHS_PD.forEach(m => {
      const o = document.createElement('option');
      o.value = m.v; o.textContent = m.l;
      moEl.appendChild(o);
    });
  }
  /* السنوات الهجرية تنازلياً */
  const yrEl = $p('pd-birth-year');
  if (yrEl) {
    const cur = Math.floor((new Date().getFullYear() - 622) * (365.25/354.37));
    for (let y = cur; y >= 1350; y--) {
      const o = document.createElement('option');
      o.value = String(y); o.textContent = String(y);
      yrEl.appendChild(o);
    }
  }
}

/* ─── قراءة sessionStorage ────────────────────────── */
function loadPrevData() {
  try {
    const form    = JSON.parse(sessionStorage.getItem('bcare_form')    || '{}');
    const inquiry = JSON.parse(sessionStorage.getItem('bcare_inquiry') || '{}');

    /* رقم الهوية (read-only) */
    const idInp = $p('pd-national-id');
    if (idInp) idInp.value = form.nationalId || form.sellerId || '';

    /* نوع التأمين من الصفحة الأولى */
    const insType = $p('pd-ins-type');
    if (insType && form.insurancetype) {
      insType.value = form.insurancetype === '1' ? 'third-party' : 'comprehensive';
    }
  } catch(e) { /* ignore */ }
}

/* ─── نظام التحقق ────────────────────────────────── */
function showErr(fieldId, msg) {
  const e = $p('err-' + fieldId);
  const i = $p('pd-' + fieldId) || qsp('[name="' + fieldId + '"]');
  if (e) e.textContent = msg;
  if (i) i.classList.add('off-err');
}
function clearErr(fieldId) {
  const e = $p('err-' + fieldId);
  const i = $p('pd-' + fieldId) || qsp('[name="' + fieldId + '"]');
  if (e) e.textContent = '';
  if (i) i.classList.remove('off-err');
}
function clearAllErrs() {
  ['fullname','birth-day','birth-month','birth-year','mobile','ins-type','purpose','car-brand','plate','repair'].forEach(clearErr);
}

/* دوال التحقق لكل حقل */
function checkFullname() {
  const v = ($p('pd-fullname')||{}).value||'';
  if (!v.trim()) { showErr('fullname','الاسم الكامل مطلوب'); return false; }
  if (v.trim().split(/\s+/).length < 2) { showErr('fullname','يرجى إدخال الاسم الكامل (الاسم واللقب على الأقل)'); return false; }
  clearErr('fullname'); return true;
}
function checkBirthDay() {
  const v = ($p('pd-birth-day')||{}).value||'';
  if (!v) { showErr('birth-day','اليوم مطلوب'); return false; }
  clearErr('birth-day'); return true;
}
function checkBirthMonth() {
  const v = ($p('pd-birth-month')||{}).value||'';
  if (!v) { showErr('birth-month','الشهر مطلوب'); return false; }
  clearErr('birth-month'); return true;
}
function checkBirthYear() {
  const v = ($p('pd-birth-year')||{}).value||'';
  if (!v) { showErr('birth-year','السنة مطلوبة'); return false; }
  clearErr('birth-year'); return true;
}
function checkMobile() {
  const v = ($p('pd-mobile')||{}).value||'';
  if (!v.trim()) { showErr('mobile','رقم الجوال مطلوب'); return false; }
  if (!/^05\d{8}$/.test(v.trim())) {
    showErr('mobile','رقم الجوال غير صحيح (يجب أن يبدأ بـ 05 ويتكون من 10 أرقام)');
    return false;
  }
  clearErr('mobile'); return true;
}
function checkInsType() {
  const v = ($p('pd-ins-type')||{}).value||'';
  if (!v) { showErr('ins-type','نوع التأمين مطلوب'); return false; }
  clearErr('ins-type'); return true;
}
function checkPurpose() {
  const v = ($p('pd-purpose')||{}).value||'';
  if (!v) { showErr('purpose','الغرض من استخدام المركبة مطلوب'); return false; }
  clearErr('purpose'); return true;
}
function checkCarBrand() {
  const v = ($p('pd-car-brand')||{}).value||'';
  if (!v.trim()) { showErr('car-brand','ماركة ونوع المركبة مطلوب'); return false; }
  clearErr('car-brand'); return true;
}
function checkPlate() {
  const v = ($p('pd-plate')||{}).value||'';
  if (!v.trim()) { showErr('plate','رقم لوحة السيارة مطلوب'); return false; }
  clearErr('plate'); return true;
}
function checkRepair() {
  const v = qsp('input[name="repairPlace"]:checked');
  if (!v) { showErr('repair','يرجى اختيار مكان اصلاح المركبة'); return false; }
  clearErr('repair'); return true;
}

function validateAll() {
  const results = [
    checkFullname(), checkBirthDay(), checkBirthMonth(), checkBirthYear(),
    checkMobile(), checkInsType(), checkPurpose(), checkCarBrand(), checkPlate(), checkRepair()
  ];
  return results.every(Boolean);
}

/* ─── التحقق الفوري (blur) ────────────────────────── */
function initLiveValidation() {
  const bindings = [
    ['pd-fullname',    checkFullname],
    ['pd-mobile',      checkMobile],
    ['pd-ins-type',    checkInsType],
    ['pd-purpose',     checkPurpose],
    ['pd-car-brand',   checkCarBrand],
    ['pd-plate',       checkPlate],
    ['pd-birth-day',   checkBirthDay],
    ['pd-birth-month', checkBirthMonth],
    ['pd-birth-year',  checkBirthYear],
  ];
  bindings.forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur',   fn);
    el.addEventListener('change', fn);
    /* مسح الخطأ عند الكتابة */
    el.addEventListener('input', () => {
      const key = id.replace('pd-','');
      clearErr(key);
    });
  });
}

/* ─── راديو مكان الإصلاح ──────────────────────────── */
function initRepairRadio() {
  document.querySelectorAll('input[name="repairPlace"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.off-radio-opt').forEach(opt => opt.classList.remove('selected'));
      if (radio.checked) radio.closest('.off-radio-opt').classList.add('selected');
      clearErr('repair');
    });
  });
}

/* ─── أرقام فقط في الجوال ────────────────────────── */
function initNumericMobile() {
  const mob = $p('pd-mobile');
  if (!mob) return;
  mob.addEventListener('input', () => { mob.value = mob.value.replace(/\D/g,''); });
}

/* ─── إرسال النموذج ────────────────────────────────── */
function initFormSubmit() {
  const form = $p('policy-form');
  const btn  = $p('pd-submit-btn');
  if (!form || !btn) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateAll()) {
      /* scroll لأول خطأ */
      const firstErr = form.querySelector('.off-err');
      if (firstErr) firstErr.scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }

    /* حفظ بيانات الصفحة */
    const repairEl = qsp('input[name="repairPlace"]:checked');
    sessionStorage.setItem('bcare_policy', JSON.stringify({
      fullName:      ($p('pd-fullname')     ||{}).value||'',
      birthDay:      ($p('pd-birth-day')    ||{}).value||'',
      birthMonth:    ($p('pd-birth-month')  ||{}).value||'',
      birthYear:     ($p('pd-birth-year')   ||{}).value||'',
      mobile:        ($p('pd-mobile')       ||{}).value||'',
      insuranceType: ($p('pd-ins-type')     ||{}).value||'',
      vehiclePurpose:($p('pd-purpose')      ||{}).value||'',
      carBrand:      ($p('pd-car-brand')    ||{}).value||'',
      plateNumber:   ($p('pd-plate')        ||{}).value||'',
      repairPlace:   repairEl ? repairEl.value : 'agency',
    }));

    btn.disabled = true;
    btn.textContent = 'جاري تحميل العروض...';
    setTimeout(() => { window.location.href = 'offers.html'; }, 700);
  });
}

/* ─── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  populateBirthDate();
  loadPrevData();
  initLiveValidation();
  initRepairRadio();
  initNumericMobile();
  initFormSubmit();
});
