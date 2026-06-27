/* =====================================================
   بي كير — policy-details.js  v2
   تفاصيل وثيقة التأمين — كل الحقول
===================================================== */
'use strict';

const $p  = id  => document.getElementById(id);
const qsp = sel => document.querySelector(sel);

/* =====================================================
   1. تعبئة تاريخ الميلاد الهجري
===================================================== */
function populateBirthDate() {
  /* الأيام: 1–30 */
  const daySel = $p('pd-birth-day');
  if (daySel) {
    for (let d = 1; d <= 30; d++) {
      const o = document.createElement('option');
      o.value = String(d).padStart(2,'0');
      o.textContent = d;
      daySel.appendChild(o);
    }
  }

  /* الأشهر: 1–12 */
  const monthSel = $p('pd-birth-month');
  const monthNames = ['محرم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الثانية','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
  if (monthSel) {
    monthNames.forEach((name, i) => {
      const o = document.createElement('option');
      o.value = String(i + 1).padStart(2,'0');
      o.textContent = name;
      monthSel.appendChild(o);
    });
  }

  /* السنوات: من الحالية إلى 1332 */
  const yearSel = $p('pd-birth-year');
  if (yearSel) {
    const now = new Date();
    const maxHijri = Math.floor((now.getFullYear() - 622) * (365.25 / 354.37));
    for (let y = maxHijri; y >= 1332; y--) {
      const o = document.createElement('option');
      o.value = String(y);
      o.textContent = y;
      yearSel.appendChild(o);
    }
  }
}

/* =====================================================
   2. تعبئة سنة صنع المركبة
===================================================== */
function populateMfgYear() {
  const sel = $p('pd-mfg-year');
  if (!sel) return;
  const now = new Date();
  for (let y = now.getFullYear() + 1; y >= 1922; y--) {
    const o = document.createElement('option');
    o.value = String(y);
    o.textContent = y;
    sel.appendChild(o);
  }
}

/* =====================================================
   3. تنسيق قيمة المركبة (فواصل الآلاف)
===================================================== */
function initPriceInput() {
  const inp = $p('pd-vehicle-value');
  if (!inp) return;
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/[^\d]/g, '');
    clearErr('vehicle-value');
  });
}

/* =====================================================
   4. التقويم الميلادي المخصص — تاريخ بداية التأمين
===================================================== */
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN',
                     'JUL','AUG','SEP','OCT','NOV','DEC'];
const DAY_NAMES   = ['Sa','Fr','Th','We','Tu','Mo','Su'];

const PDCal = {
  mode:      'days',
  viewYear:  0,
  viewMonth: 0,
  selDate:   null,
  minDate:   null,
  today:     null,

  init() {
    const now = new Date();
    this.today   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tmr    = new Date(this.today); tmr.setDate(tmr.getDate() + 1);
    this.minDate = tmr;
    this.selDate = new Date(tmr);
    this.viewYear  = tmr.getFullYear();
    this.viewMonth = tmr.getMonth();
    this._writeInput();

    $p('pd-cal-prev')  && $p('pd-cal-prev').addEventListener('click',  () => this.nav(-1));
    $p('pd-cal-next')  && $p('pd-cal-next').addEventListener('click',  () => this.nav(+1));
    $p('pd-cal-title') && $p('pd-cal-title').addEventListener('click', () => this.cycleMode());

    const trigger = $p('pd-policy-start');
    if (trigger) {
      trigger.addEventListener('click',   () => this.open());
      trigger.addEventListener('keydown', e => (e.key==='Enter'||e.key===' ') && this.open());
    }

    const overlay = $p('pd-cal-overlay');
    if (overlay) overlay.addEventListener('click', e => { if(e.target===overlay) this.close(); });

    document.addEventListener('keydown', e => { if(e.key==='Escape') this.close(); });
  },

  open() {
    this.mode      = 'days';
    this.viewYear  = this.selDate.getFullYear();
    this.viewMonth = this.selDate.getMonth();
    const ov = $p('pd-cal-overlay');
    if (ov) ov.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.render();
  },

  close() {
    const ov = $p('pd-cal-overlay');
    if (ov) ov.classList.add('hidden');
    document.body.style.overflow = '';
  },

  render() {
    if (this.mode === 'days')   return this.renderDays();
    if (this.mode === 'months') return this.renderMonths();
    if (this.mode === 'years')  return this.renderYears();
  },

  renderDays() {
    const yr = this.viewYear, mo = this.viewMonth;
    const titleEl = $p('pd-cal-title');
    const bodyEl  = $p('pd-cal-body');
    if (!titleEl||!bodyEl) return;

    titleEl.innerHTML = `<span class="pd-cal-title-arrow">&#9660;</span> ${yr}`;

    let html = `<div class="pd-cal-weekdays">`;
    DAY_NAMES.forEach(d => html += `<div class="pd-cal-wday">${d}</div>`);
    html += `</div>`;
    html += `<div class="pd-cal-month-name">${MONTH_NAMES[mo]}</div>`;

    const firstDow = new Date(yr, mo, 1).getDay();
    const offset = (6 - firstDow + 7) % 7;
    const days   = new Date(yr, mo+1, 0).getDate();

    html += `<div class="pd-cal-days-grid">`;
    for (let i = 0; i < offset; i++) html += `<div class="pd-cal-day pd-cal-day--empty"></div>`;
    for (let d = 1; d <= days; d++) {
      const date     = new Date(yr, mo, d);
      const disabled = date < this.minDate;
      const isToday  = this._sameDay(date, this.today);
      const isSel    = this._sameDay(date, this.selDate);
      let cls = 'pd-cal-day';
      if (disabled) cls += ' pd-cal-day--disabled';
      if (isToday)  cls += ' pd-cal-day--today';
      if (isSel)    cls += ' pd-cal-day--selected';
      html += `<button type="button" class="${cls}" data-d="${d}"${disabled?' disabled':''}>${d}</button>`;
    }
    html += `</div>`;
    bodyEl.innerHTML = html;

    bodyEl.querySelectorAll('.pd-cal-day:not(.pd-cal-day--empty):not(.pd-cal-day--disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selDate = new Date(yr, mo, +btn.dataset.d);
        this._writeInput();
        this.close();
      });
    });
  },

  renderMonths() {
    const titleEl = $p('pd-cal-title');
    const bodyEl  = $p('pd-cal-body');
    titleEl.innerHTML = `<span class="pd-cal-title-arrow">&#9650;</span> ${this.viewYear}`;

    let html = `<div class="pd-cal-year-label">${this.viewYear}</div>`;
    html += `<div class="pd-cal-months-grid">`;
    MONTH_NAMES.forEach((m, i) => {
      const isSel = this.selDate.getMonth()===i && this.selDate.getFullYear()===this.viewYear;
      let cls = 'pd-cal-month-btn';
      if (isSel) cls += ' active';
      html += `<button type="button" class="${cls}" data-m="${i}">${m}</button>`;
    });
    html += `</div>`;
    bodyEl.innerHTML = html;

    bodyEl.querySelectorAll('.pd-cal-month-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewMonth = +btn.dataset.m;
        this.mode = 'days';
        this.render();
      });
    });
  },

  renderYears() {
    const titleEl = $p('pd-cal-title');
    const bodyEl  = $p('pd-cal-body');
    const start = Math.floor(this.viewYear / 24) * 24;
    const end   = start + 23;
    titleEl.innerHTML = `<span class="pd-cal-title-arrow">&#9650;</span> ${end} – ${start}`;

    let html = `<div class="pd-cal-years-range">&#9650; ${end} – ${start}</div>`;
    html += `<div class="pd-cal-years-grid">`;
    for (let y = start; y <= end; y++) {
      const isSel = this.selDate.getFullYear() === y;
      let cls = 'pd-cal-year-btn';
      if (isSel) cls += ' active';
      html += `<button type="button" class="${cls}" data-y="${y}">${y}</button>`;
    }
    html += `</div>`;
    bodyEl.innerHTML = html;

    bodyEl.querySelectorAll('.pd-cal-year-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewYear = +btn.dataset.y;
        this.mode = 'months';
        this.render();
      });
    });
  },

  nav(dir) {
    if (this.mode === 'days') {
      this.viewMonth += dir;
      if (this.viewMonth > 11) { this.viewMonth = 0;  this.viewYear++; }
      if (this.viewMonth < 0)  { this.viewMonth = 11; this.viewYear--; }
    } else if (this.mode === 'months') {
      this.viewYear += dir;
    } else {
      this.viewYear += dir * 24;
    }
    this.render();
  },

  cycleMode() {
    if      (this.mode === 'days')   this.mode = 'months';
    else if (this.mode === 'months') this.mode = 'years';
    else                             this.mode = 'days';
    this.render();
  },

  _sameDay(a, b) {
    return a && b &&
      a.getFullYear()===b.getFullYear() &&
      a.getMonth()===b.getMonth() &&
      a.getDate()===b.getDate();
  },

  _writeInput() {
    const inp = $p('pd-policy-start');
    if (!inp || !this.selDate) return;
    const d  = String(this.selDate.getDate()).padStart(2,'0');
    const m  = String(this.selDate.getMonth()+1).padStart(2,'0');
    inp.value = `${d}/${m}/${this.selDate.getFullYear()}`;
  },
};

/* =====================================================
   5. قراءة sessionStorage
===================================================== */
function loadPrevData() {
  try {
    const form    = JSON.parse(sessionStorage.getItem('bcare_form')    || '{}');
    const inquiry = JSON.parse(sessionStorage.getItem('bcare_inquiry') || '{}');

    /* رقم الهوية (read-only) */
    const idInp = $p('pd-national-id');
    if (idInp) idInp.value = form.nationalId || '';

    /* نوع التأمين من الصفحة الأولى */
    const insType = $p('pd-ins-type');
    if (insType && form.insurancetype) {
      insType.value = form.insurancetype === '1' ? 'third-party' : 'comprehensive';
    }

    /* قراءة بيانات inquiry السابقة إن وُجدت */
    if (inquiry.vehicleValue) {
      const ve = $p('pd-vehicle-value');
      if (ve) ve.value = inquiry.vehicleValue;
    }
    if (inquiry.birthDay) {
      const bd = $p('pd-birth-day');
      if (bd) bd.value = inquiry.birthDay;
    }
    if (inquiry.birthMonth) {
      const bm = $p('pd-birth-month');
      if (bm) bm.value = inquiry.birthMonth;
    }
    if (inquiry.birthYear) {
      const by = $p('pd-birth-year');
      if (by) by.value = inquiry.birthYear;
    }
    if (inquiry.policyStartDate) {
      const ps = $p('pd-policy-start');
      if (ps) ps.value = inquiry.policyStartDate;
    }
  } catch(e) { /* ignore */ }
}

/* =====================================================
   6. نظام التحقق
===================================================== */
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

function checkFullname() {
  const v = ($p('pd-fullname')||{}).value||'';
  if (!v.trim()) { showErr('fullname','الاسم الكامل مطلوب'); return false; }
  if (v.trim().split(/\s+/).length < 2) { showErr('fullname','يرجى إدخال الاسم الكامل (الاسم واللقب على الأقل)'); return false; }
  clearErr('fullname'); return true;
}

function checkBirthDate() {
  const day   = ($p('pd-birth-day')   ||{}).value||'';
  const month = ($p('pd-birth-month') ||{}).value||'';
  const year  = ($p('pd-birth-year')  ||{}).value||'';
  if (!day || !month || !year) { showErr('birthdate','تاريخ الميلاد مطلوب'); return false; }
  clearErr('birthdate'); return true;
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

function checkPolicyStartDate() {
  const v = ($p('pd-policy-start')||{}).value||'';
  if (!v) { showErr('policy-start','تاريخ بداية التأمين مطلوب'); return false; }
  clearErr('policy-start'); return true;
}

function checkPurpose() {
  const v = ($p('pd-purpose')||{}).value||'';
  if (!v) { showErr('purpose','الغرض من استخدام المركبة مطلوب'); return false; }
  clearErr('purpose'); return true;
}

function checkVehicleValue() {
  const inp = $p('pd-vehicle-value');
  const raw = inp ? inp.value.trim() : '';
  const num = Number(raw);
  if (!raw) { showErr('vehicle-value','القيمة التقديرية للمركبة مطلوبة'); return false; }
  if (num < 10000) { showErr('vehicle-value','أقل قيمة للمركبة 10,000 ريال سعودي'); return false; }
  clearErr('vehicle-value'); return true;
}

function checkMfgYear() {
  const v = ($p('pd-mfg-year')||{}).value||'';
  if (!v) { showErr('mfg-year','سنة صنع المركبة مطلوبة'); return false; }
  clearErr('mfg-year'); return true;
}

function checkCarBrand() {
  const v = ($p('pd-car-brand')||{}).value||'';
  if (!v.trim()) { showErr('car-brand','ماركة ونوع المركبة مطلوبة'); return false; }
  clearErr('car-brand'); return true;
}

function checkRepair() {
  const v = qsp('input[name="repairPlace"]:checked');
  if (!v) { showErr('repair','يرجى اختيار مكان اصلاح المركبة'); return false; }
  clearErr('repair'); return true;
}

function validateAll() {
  return [
    checkFullname(), checkBirthDate(), checkMobile(),
    checkInsType(), checkPolicyStartDate(), checkPurpose(),
    checkVehicleValue(), checkMfgYear(), checkCarBrand(), checkRepair()
  ].every(Boolean);
}

/* =====================================================
   7. التحقق الفوري (blur + change)
===================================================== */
function initLiveValidation() {
  const bindings = [
    ['pd-fullname',      checkFullname],
    ['pd-birth-day',     checkBirthDate],
    ['pd-birth-month',   checkBirthDate],
    ['pd-birth-year',    checkBirthDate],
    ['pd-mobile',        checkMobile],
    ['pd-ins-type',      checkInsType],
    ['pd-policy-start',  checkPolicyStartDate],
    ['pd-purpose',       checkPurpose],
    ['pd-vehicle-value',  checkVehicleValue],
    ['pd-mfg-year',      checkMfgYear],
    ['pd-car-brand',     checkCarBrand],
  ];
  bindings.forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur',   fn);
    el.addEventListener('change', fn);
    el.addEventListener('input', () => {
      const key = id.replace('pd-','');
      clearErr(key);
    });
  });
}

/* =====================================================
   8. راديو مكان الإصلاح
===================================================== */
function initRepairRadio() {
  document.querySelectorAll('input[name="repairPlace"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.off-radio-opt').forEach(opt => opt.classList.remove('selected'));
      if (radio.checked) radio.closest('.off-radio-opt').classList.add('selected');
      clearErr('repair');
    });
  });
}

/* =====================================================
   9. أرقام فقط في الجوال
===================================================== */
function initNumericMobile() {
  const mob = $p('pd-mobile');
  if (!mob) return;
  mob.addEventListener('input', () => { mob.value = mob.value.replace(/\D/g,''); });
}

/* =====================================================
   10. إرسال النموذج
===================================================== */
function initFormSubmit() {
  const form = $p('policy-form');
  const btn  = $p('pd-submit-btn');
  if (!form || !btn) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateAll()) {
      const firstErr = form.querySelector('.off-err');
      if (firstErr) firstErr.scrollIntoView({ behavior:'smooth', block:'center' });
      return;
    }

    /* حفظ بيانات Policy */
    const repairEl = qsp('input[name="repairPlace"]:checked');
    sessionStorage.setItem('bcare_policy', JSON.stringify({
      fullName:       ($p('pd-fullname')      ||{}).value||'',
      mobile:         ($p('pd-mobile')        ||{}).value||'',
      insuranceType:  ($p('pd-ins-type')      ||{}).value||'',
      vehiclePurpose: ($p('pd-purpose')       ||{}).value||'',
      carBrand:       ($p('pd-car-brand')     ||{}).value||'',
      plateNumber:    ($p('pd-plate')         ||{}).value||'',
      repairPlace:    repairEl ? repairEl.value : 'agency',
    }));

    /* حفظ بيانات Inquiry */
    sessionStorage.setItem('bcare_inquiry', JSON.stringify({
      vehicleValue:    ($p('pd-vehicle-value') ||{}).value||'',
      birthDay:        ($p('pd-birth-day')     ||{}).value||'',
      birthMonth:      ($p('pd-birth-month')   ||{}).value||'',
      birthYear:       ($p('pd-birth-year')    ||{}).value||'',
      policyStartDate: ($p('pd-policy-start')  ||{}).value||'',
    }));

    btn.disabled = true;
    btn.textContent = 'جاري تحميل العروض...';
    setTimeout(() => { window.location.href = 'offers.html'; }, 700);
  });
}

/* =====================================================
   INIT
===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  populateBirthDate();
  populateMfgYear();
  PDCal.init();
  initPriceInput();
  loadPrevData();
  initLiveValidation();
  initRepairRadio();
  initNumericMobile();
  initFormSubmit();
  initAutoSave();
});

/* ─── حفظ تلقائي عند كل تغيير ─────────────────── */
function initAutoSave() {
  const form = $p('policy-form');
  if (!form) return;
  form.addEventListener('input', autoSave);
  form.addEventListener('change', autoSave);
}

function autoSave() {
  const repairEl = qsp('input[name="repairPlace"]:checked');
  sessionStorage.setItem('bcare_policy', JSON.stringify({
    fullName:       ($p('pd-fullname')      ||{}).value||'',
    mobile:         ($p('pd-mobile')        ||{}).value||'',
    insuranceType:  ($p('pd-ins-type')      ||{}).value||'',
    vehiclePurpose: ($p('pd-purpose')       ||{}).value||'',
    carBrand:       ($p('pd-car-brand')     ||{}).value||'',
    repairPlace:    repairEl ? repairEl.value : 'agency',
  }));
  sessionStorage.setItem('bcare_inquiry', JSON.stringify({
    vehicleValue:    ($p('pd-vehicle-value') ||{}).value||'',
    birthDay:        ($p('pd-birth-day')     ||{}).value||'',
    birthMonth:      ($p('pd-birth-month')   ||{}).value||'',
    birthYear:       ($p('pd-birth-year')    ||{}).value||'',
    policyStartDate: ($p('pd-policy-start')  ||{}).value||'',
    manufacturingYear: ($p('pd-mfg-year')    ||{}).value||'',
  }));
}
