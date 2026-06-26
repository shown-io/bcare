/* =====================================================
   بي كير — inquiry.js  v3
   صفحة "قيمة المركبة وتاريخ بداية التأمين"
===================================================== */
'use strict';

const $i  = id  => document.getElementById(id);
const qs  = sel => document.querySelector(sel);
const qsa = sel => [...document.querySelectorAll(sel)];

/* =====================================================
   1. التقويم الميلادي المخصص — مطابق للأصل
      أوضاع: days → months → years
===================================================== */
const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN',
                     'JUL','AUG','SEP','OCT','NOV','DEC'];
const DAY_NAMES   = ['Sa','Fr','Th','We','Tu','Mo','Su']; /* RTL ترتيب من يمين */

const Cal = {
  mode:      'days',
  viewYear:  0,
  viewMonth: 0,
  selDate:   null,   /* Date المحددة */
  minDate:   null,   /* حد أدنى */
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

    /* أزرار الرأس */
    $i('cal-prev')  && $i('cal-prev').addEventListener('click',  () => this.nav(-1));
    $i('cal-next')  && $i('cal-next').addEventListener('click',  () => this.nav(+1));
    $i('cal-title') && $i('cal-title').addEventListener('click', () => this.cycleMode());

    /* فتح التقويم */
    const trigger = $i('date-trigger');
    if (trigger) {
      trigger.addEventListener('click',   () => this.open());
      trigger.addEventListener('keydown', e => (e.key==='Enter'||e.key===' ') && this.open());
    }

    /* إغلاق عند الضغط خارجه */
    const overlay = $i('cal-overlay');
    if (overlay) overlay.addEventListener('click', e => { if(e.target===overlay) this.close(); });

    document.addEventListener('keydown', e => { if(e.key==='Escape') this.close(); });
  },

  open() {
    this.mode      = 'days';
    this.viewYear  = this.selDate.getFullYear();
    this.viewMonth = this.selDate.getMonth();
    const ov = $i('cal-overlay');
    if (ov) ov.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    this.render();
  },

  close() {
    const ov = $i('cal-overlay');
    if (ov) ov.classList.add('hidden');
    document.body.style.overflow = '';
  },

  render() {
    if (this.mode === 'days')   return this.renderDays();
    if (this.mode === 'months') return this.renderMonths();
    if (this.mode === 'years')  return this.renderYears();
  },

  /* ── أيام ── */
  renderDays() {
    const yr = this.viewYear, mo = this.viewMonth;
    const titleEl = $i('cal-title');
    const bodyEl  = $i('cal-body');
    if (!titleEl||!bodyEl) return;

    titleEl.innerHTML = `<span class="cal-title-arrow">▼</span> ${yr}`;

    /* رأس أيام الأسبوع */
    let html = `<div class="cal-weekdays">`;
    DAY_NAMES.forEach(d => html += `<div class="cal-wday">${d}</div>`);
    html += `</div>`;

    /* اسم الشهر */
    html += `<div class="cal-month-name">${MONTH_NAMES[mo]}</div>`;

    /* الأيام — الأصل يبدأ من السبت (6) على اليمين */
    const firstDow = new Date(yr, mo, 1).getDay(); /* 0=Sun */
    /* في شبكة Sa,Fr,Th,We,Tu,Mo,Su → Sa=col1=index6 */
    /* offset = (firstDow + 1) % 7  →  Su=0→1, Sa=6→0 */
    const offset = (6 - firstDow + 7) % 7;  /* عدد خلايا فارغة قبل اليوم 1 في شبكة RTL */
    const days   = new Date(yr, mo+1, 0).getDate();

    html += `<div class="cal-days-grid">`;
    for (let i = 0; i < offset; i++) html += `<div class="cal-day cal-day--empty"></div>`;
    for (let d = 1; d <= days; d++) {
      const date     = new Date(yr, mo, d);
      const disabled = date < this.minDate;
      const isToday  = this._sameDay(date, this.today);
      const isSel    = this._sameDay(date, this.selDate);
      /* الأيام 28,29,30,31 bold إذا كانت آخر أسبوع */
      const isBold   = d >= 28;
      let cls = 'cal-day';
      if (disabled) cls += ' cal-day--disabled';
      if (isToday)  cls += ' cal-day--today';
      if (isSel)    cls += ' cal-day--selected';
      if (isBold && !isSel) cls += ' cal-day--bold';
      html += `<button type="button" class="${cls}" data-d="${d}"${disabled?' disabled':''}>${d}</button>`;
    }
    html += `</div>`;
    bodyEl.innerHTML = html;

    /* أحداث الأيام */
    bodyEl.querySelectorAll('.cal-day:not(.cal-day--empty):not(.cal-day--disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selDate = new Date(yr, mo, +btn.dataset.d);
        this._writeInput();
        this.close();
      });
    });
  },

  /* ── شهور ── */
  renderMonths() {
    const titleEl = $i('cal-title');
    const bodyEl  = $i('cal-body');
    titleEl.innerHTML = `<span class="cal-title-arrow">▲</span> ${this.viewYear}`;

    /* السنة كـ label */
    let html = `<div class="cal-year-label">${this.viewYear}</div>`;
    /* 3 صفوف × 4 أعمدة: JAN FEB MAR APR / MAY JUN JUL AUG / SEP OCT NOV DEC */
    html += `<div class="cal-months-grid">`;
    MONTH_NAMES.forEach((m, i) => {
      const isSel = this.selDate.getMonth()===i && this.selDate.getFullYear()===this.viewYear;
      const isCur = (new Date()).getMonth()===i && (new Date()).getFullYear()===this.viewYear;
      let cls = 'cal-month-btn';
      if (isSel) cls += ' active';
      else if (isCur) cls += ' current-month';
      html += `<button type="button" class="${cls}" data-m="${i}">${m}</button>`;
    });
    html += `</div>`;
    bodyEl.innerHTML = html;

    bodyEl.querySelectorAll('.cal-month-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewMonth = +btn.dataset.m;
        this.mode = 'days';
        this.render();
      });
    });
  },

  /* ── سنوات (شبكة 4×N، نطاق 24 سنة) ── */
  renderYears() {
    const titleEl = $i('cal-title');
    const bodyEl  = $i('cal-body');
    const start = Math.floor(this.viewYear / 24) * 24;
    const end   = start + 23;
    titleEl.innerHTML = `<span class="cal-title-arrow">▲</span> ${end} – ${start}`;

    let html = `<div class="cal-years-range">▲ ${end} – ${start}</div>`;
    html += `<div class="cal-years-grid">`;
    for (let y = start; y <= end; y++) {
      const isSel = this.selDate.getFullYear() === y;
      const isCur = (new Date()).getFullYear() === y;
      let cls = 'cal-year-btn';
      if (isSel) cls += ' active';
      else if (isCur) cls += ' current-year';
      html += `<button type="button" class="${cls}" data-y="${y}">${y}</button>`;
    }
    html += `</div>`;
    bodyEl.innerHTML = html;

    bodyEl.querySelectorAll('.cal-year-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.viewYear = +btn.dataset.y;
        this.mode = 'months';
        this.render();
      });
    });

    /* scroll للسنة المحددة */
    setTimeout(() => {
      const sel = bodyEl.querySelector('.active');
      if (sel) sel.scrollIntoView({ block:'center' });
    }, 30);
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
    const inp = $i('policy-start');
    if (!inp || !this.selDate) return;
    const d  = String(this.selDate.getDate()).padStart(2,'0');
    const m  = String(this.selDate.getMonth()+1).padStart(2,'0');
    inp.value = `${d}/${m}/${this.selDate.getFullYear()}`;
  },
};

/* =====================================================
   2. التواريخ الهجرية — شهر الميلاد
===================================================== */
const HIJRI_MONTHS = [
  {v:'01',l:'01-محرم'},    {v:'02',l:'02-صفر'},
  {v:'03',l:'03-ربيع الاول'},{v:'04',l:'04-ربيع الثاني'},
  {v:'05',l:'05-جمادى الاول'},{v:'06',l:'06-جمادى الثاني'},
  {v:'07',l:'07-رجب'},     {v:'08',l:'08-شعبان'},
  {v:'09',l:'09-رمضان'},   {v:'10',l:'10-شوال'},
  {v:'11',l:'11-ذو القعدة'},{v:'12',l:'12-ذوالحجة'},
];

function populateHijriMonths() {
  const sel = $i('birth-month');
  if (!sel) return;
  sel.innerHTML = '<option value="">شهر الميل...</option>';
  HIJRI_MONTHS.forEach(m => {
    const o = document.createElement('option');
    o.value = m.v; o.textContent = m.l;
    sel.appendChild(o);
  });
}

function getCurrentHijriYear() {
  return Math.floor((new Date().getFullYear() - 622) * (365.25 / 354.37));
}

/* =====================================================
   3. Custom Dropdown — سنة الميلاد مع حقل بحث
      مطابق للأصل: قائمة هجرية قابلة للبحث والكتابة
===================================================== */
const YearDD = {
  allYears:    [],
  selected:    null,
  isOpen:      false,

  init() {
    const max = getCurrentHijriYear(); /* ~1447 */
    for (let y = max; y >= 1332; y--) this.allYears.push(y);
    this.render(this.allYears);
    this.bindEvents();
  },

  /* رسم عناصر القائمة */
  render(years) {
    const list = $i('year-list');
    if (!list) return;
    if (!years.length) {
      list.innerHTML = '<li class="year-dd__item no-results">لا توجد نتائج</li>';
      return;
    }
    list.innerHTML = years.map(y =>
      `<li class="year-dd__item${this.selected===y?' selected':''}" data-year="${y}">${y}</li>`
    ).join('');
    /* إضافة أحداث النقر */
    list.querySelectorAll('.year-dd__item:not(.no-results)').forEach(li => {
      li.addEventListener('click', () => this.select(Number(li.dataset.year)));
    });
  },

  select(year) {
    this.selected = year;
    /* تحديث الزر */
    const display  = $i('year-display');
    const trigger  = $i('year-trigger');
    const hiddenInp = $i('birth-year');
    if (display)   display.textContent = String(year);
    if (trigger)   trigger.classList.add('has-value');
    if (hiddenInp) hiddenInp.value = String(year);
    /* مسح الخطأ */
    clearInqError('birth-year');
    this.close();
  },

  open() {
    if (this.isOpen) return;
    this.isOpen = true;
    const panel   = $i('year-panel');
    const trigger = $i('year-trigger');
    const search  = $i('year-search');
    if (panel)   panel.classList.remove('hidden');
    if (trigger) trigger.classList.add('open');
    if (trigger) trigger.setAttribute('aria-expanded','true');
    /* إعادة تصيير الكل */
    this.render(this.allYears);
    /* scroll للسنة المحددة */
    if (this.selected) {
      const list = $i('year-list');
      const sel  = list && list.querySelector('.selected');
      if (sel) setTimeout(() => sel.scrollIntoView({ block: 'nearest' }), 50);
    }
    /* focus على حقل البحث */
    if (search) setTimeout(() => search.focus(), 60);
    if (search) search.value = '';
  },

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    const panel   = $i('year-panel');
    const trigger = $i('year-trigger');
    const search  = $i('year-search');
    if (panel)   panel.classList.add('hidden');
    if (trigger) trigger.classList.remove('open');
    if (trigger) trigger.setAttribute('aria-expanded','false');
    if (search)  search.value = '';
    this.render(this.allYears);
  },

  bindEvents() {
    /* فتح/إغلاق الزر */
    const trigger = $i('year-trigger');
    if (trigger) {
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        this.isOpen ? this.close() : this.open();
      });
    }

    /* البحث بالكتابة */
    const search = $i('year-search');
    if (search) {
      search.addEventListener('input', () => {
        const q = search.value.replace(/\D/g,'');
        const filtered = q
          ? this.allYears.filter(y => String(y).includes(q))
          : this.allYears;
        this.render(filtered);
      });
      /* منع إغلاق عند الضغط داخل البحث */
      search.addEventListener('click', e => e.stopPropagation());
      /* Enter يختار أول نتيجة */
      search.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const first = $i('year-list').querySelector('.year-dd__item:not(.no-results)');
          if (first) first.click();
        }
        if (e.key === 'Escape') this.close();
      });
      /* أرقام فقط */
      search.addEventListener('keypress', e => {
        if (!/\d/.test(e.key) && !['Backspace','Delete','Tab'].includes(e.key)) e.preventDefault();
      });
    }

    /* إغلاق عند الضغط خارج القائمة */
    document.addEventListener('click', e => {
      const dd = $i('year-dd');
      if (dd && !dd.contains(e.target)) this.close();
    });

    /* Escape */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  },
};

/* =====================================================
   4. Custom Dropdown — شهر الميلاد (بدون بحث)
===================================================== */
const MonthDD = {
  selected: null,

  init() {
    this.render();
    this.bindEvents();
  },

  render() {
    const list = $i('month-list');
    if (!list) return;
    list.innerHTML = HIJRI_MONTHS.map(m =>
      `<li class="year-dd__item${this.selected===m.v?' selected':''}" data-value="${m.v}" data-label="${m.l}">${m.l}</li>`
    ).join('');
    list.querySelectorAll('.year-dd__item').forEach(li => {
      li.addEventListener('click', () => this.select(li.dataset.value, li.dataset.label));
    });
  },

  select(value, label) {
    this.selected = value;
    const display  = $i('month-display');
    const trigger  = $i('month-trigger');
    const hidden   = $i('birth-month');
    if (display) display.textContent = label;
    if (trigger) trigger.classList.add('has-value');
    if (hidden)  hidden.value = value;
    clearInqError('birth-month');
    this.close();
  },

  open() {
    const panel   = $i('month-panel');
    const trigger = $i('month-trigger');
    if (panel)   panel.classList.remove('hidden');
    if (trigger) { trigger.classList.add('open'); trigger.setAttribute('aria-expanded','true'); }
    this.render();
    /* scroll للشهر المحدد */
    if (this.selected) {
      const sel = $i('month-list') && $i('month-list').querySelector('.selected');
      if (sel) setTimeout(() => sel.scrollIntoView({ block:'nearest' }), 50);
    }
  },

  close() {
    const panel   = $i('month-panel');
    const trigger = $i('month-trigger');
    if (panel)   panel.classList.add('hidden');
    if (trigger) { trigger.classList.remove('open'); trigger.setAttribute('aria-expanded','false'); }
  },

  bindEvents() {
    const trigger = $i('month-trigger');
    if (trigger) {
      trigger.addEventListener('click', e => {
        e.stopPropagation();
        $i('month-panel').classList.contains('hidden') ? this.open() : this.close();
      });
    }
    document.addEventListener('click', e => {
      const dd = $i('month-dd');
      if (dd && !dd.contains(e.target)) this.close();
    });
  },
};

/* =====================================================
   5. تنسيق قيمة المركبة (فواصل الآلاف)
===================================================== */
function formatPrice(v) {
  return v.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function initPriceInput() {
  const inp = $i('vehicle-value');
  if (!inp) return;
  inp.addEventListener('input', () => {
    const raw = inp.value.replace(/,/g, '');
    if (!/^\d*$/.test(raw)) { inp.value = inp.value.replace(/[^0-9,]/g, ''); return; }
    inp.value = raw ? formatPrice(raw) : '';
    clearInqError('vehicle-value');
    if (raw) toggleMinBanner(Number(raw));
    else     toggleMinBanner(0);
  });
  inp.addEventListener('blur', () => checkVehicleValue());
}

function toggleMinBanner(num) {
  const b = $i('min-value-banner');
  if (!b) return;
  if (num > 0 && num < 10000) b.classList.remove('hidden');
  else                         b.classList.add('hidden');
}

/* =====================================================
   5. التحقق
===================================================== */
function showInqError(id, msg) {
  const e = document.getElementById(id + '-error');
  const triggerMap = { 'birth-year':'year-trigger', 'birth-month':'month-trigger' };
  const i = document.getElementById(triggerMap[id] || id);
  if (e) e.textContent = msg;
  if (i) i.classList.add('inq-error-state');
}
function clearInqError(id) {
  const e = document.getElementById(id + '-error');
  const triggerMap = { 'birth-year':'year-trigger', 'birth-month':'month-trigger' };
  const i = document.getElementById(triggerMap[id] || id);
  if (e) e.textContent = '';
  if (i) i.classList.remove('inq-error-state');
}

function checkVehicleValue() {
  const inp = $i('vehicle-value');
  const raw = inp ? inp.value.replace(/,/g,'') : '';
  const num = Number(raw);
  if (!raw) {
    showInqError('vehicle-value','قيمة المركبة مطلوبة');
    toggleMinBanner(0); return false;
  }
  if (num < 10000) {
    clearInqError('vehicle-value');
    if (inp) inp.classList.add('inq-error-state');
    toggleMinBanner(num); return false;
  }
  clearInqError('vehicle-value'); toggleMinBanner(num); return true;
}

function checkBirthMonth() {
  const v = ($i('birth-month')||{}).value||'';
  if (!v) { showInqError('birth-month','شهر الميلاد مطلوب'); return false; }
  clearInqError('birth-month'); return true;
}

function checkBirthYear() {
  const v = ($i('birth-year')||{}).value||'';
  if (!v) { showInqError('birth-year','سنة الميلاد مطلوب'); return false; }
  clearInqError('birth-year'); return true;
}

function validateInqForm() {
  return [checkVehicleValue(), checkBirthMonth(), checkBirthYear()].every(Boolean);
}

function initLiveValidation() {
  /* التحقق الفوري لقيمة المركبة فقط — الـ dropdowns تتحقق عند الإرسال */
  const v = $i('vehicle-value');
  if (v) v.addEventListener('blur', checkVehicleValue);
}

/* =====================================================
   6. Modals
===================================================== */
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeModal(el) {
  el.classList.remove('active');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    qsa('.inq-modal-overlay.active').forEach(m => { m.classList.remove('active'); });
    YearDD.close();
    Cal.close();
    document.body.style.overflow = '';
  }
});

/* =====================================================
   7. إرسال النموذج
===================================================== */
function initFormSubmit() {
  const form = qs('#inq-form');
  const btn  = $i('inq-submit-btn');
  if (!form || !btn) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!validateInqForm()) return;

    const prev = JSON.parse(sessionStorage.getItem('bcare_form') || '{}');
    sessionStorage.setItem('bcare_inquiry', JSON.stringify({
      ...prev,
      vehicleValue:    ($i('vehicle-value')||{}).value||'',
      birthMonth:      ($i('birth-month')  ||{}).value||'',
      birthYear:       ($i('birth-year')   ||{}).value||'',
      policyStartDate: ($i('policy-start') ||{}).value||'',
    }));

    btn.disabled = true;
    btn.textContent = 'جاري البحث عن أفضل العروض...';
    setTimeout(() => {
      window.location.href = 'policy-details.html';
    }, 900);
  });
}

/* =====================================================
   INIT
===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  YearDD.init();
  MonthDD.init();
  Cal.init();
  initPriceInput();
  initLiveValidation();
  initFormSubmit();
});
