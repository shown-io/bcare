/* =====================================================
   بي كير — offers.js
   20 شركة × نوعان (ضد الغير / شامل)
   إضافات تزيد السعر تلقائياً + حفظ في sessionStorage
===================================================== */
'use strict';

/* ─── بيانات 20 شركة ──────────────────────────────── */
const COMPANIES = [
  {
    id:'walaa', name:'ولاء للتأمين', logo:'assets/images/imgi_12_Walaa.svg',
    tpl:{ price:652.17, discount:85.07, vat:97.83,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق',add:50},
        {label:'تغطية الحوادث الشخصية للسائق (+20 ﷼)',add:20},
        {label:'تغطية الحوادث الشخصية للركاب (+30 ﷼)',add:30},
      ]},
    comp:{ price:2400.00, discount:450, vat:360,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'تغطية الحوادث الشخصية للسائق (+50 ﷼)',add:50},
        {label:'تغطية الأخطار الطبيعية (+200 ﷼)',add:200},
        {label:'تغطية كسر الزجاج والحريق والسرقة (+150 ﷼)',add:150},
        {label:'سيارة بديلة (+50 ﷼)',add:50},
        {label:'المساعدة على الطريق (+50 ﷼)',add:50},
      ]},
  },
  {
    id:'rajhi', name:'تكافل الراجحي', logo:'assets/images/imgi_22_AlRajhi.svg',
    tpl:{ price:674.82, discount:52.15, vat:70.4,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'تغطية الحوادث الشخصية للسائق والركاب (+50 ﷼)',add:50},
        {label:'المساعدة على الطريق (+30 ﷼)',add:30},
        {label:'تغطية ضد كسر الزجاج والحريق والسرقة (+150 ﷼)',add:150},
        {label:'تغطية الكوارث الطبيعية (+100 ﷼)',add:100},
      ]},
    comp:{ price:1132.83, discount:210.41, vat:100.54,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'مسؤولية الطرف الثالث',add:0},
        {label:'إضافات النموذج',add:0},
        {label:'تغطية الحوادث الشخصية للسائق (+50 ﷼)',add:50},
        {label:'الاندفاع الطبي (+50 ﷼)',add:50},
        {label:'الكوارث الطبيعية (+100 ﷼)',add:100},
      ]},
  },
  {
    id:'tawuniya', name:'التعاونية', logo:'assets/images/imgi_24_Tawuniya.svg',
    tpl:{ price:934.75, discount:70, vat:108.75,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'تغطية الحوادث الشخصية للسائق فقط (+60 ﷼)',add:60},
        {label:'تغطية الحوادث الشخصية للسائق والركاب (+360 ﷼)',add:360},
        {label:'المساعدة على الطريق + درايف مجاناً (+99 ﷼)',add:99},
      ]},
    comp:{ price:4665.22, discount:790, vat:810,
      coverages:['المسؤولية المدنية للغير (المبلغ الأقصى لمسؤولية الشركة 10,000,000 ﷼)'],
      extras:[
        {label:'تغطية السرعة والزرق (+50 ﷼)',add:50},
        {label:'الاندفاع الطبي',add:0},
        {label:'استبدال الرصيد — مثال: كل 500 ريال (+100 ﷼)',add:100},
      ]},
  },
  {
    id:'salama', name:'سلامة', logo:'assets/images/imgi_13_Salama.svg',
    tpl:{ price:865.25, discount:75.31, vat:130,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+40 ﷼)',add:40},
        {label:'الإيواء والتقطير للمركبة والمسافر (+50 ﷼)',add:50},
        {label:'الكوارث في نطاق دول الخليج العربي (+50 ﷼)',add:50},
      ]},
    comp:{ price:2830.12, discount:140, vat:415.46,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'المساعدة على الطريق (+40 ﷼)',add:40},
        {label:'تغطية الحوادث الشخصية للسائق (+50 ﷼)',add:50},
        {label:'الكوارث (+50 ﷼)',add:50},
      ]},
  },
  {
    id:'medgulf', name:'ميدغلف', logo:'assets/images/imgi_17_MedGulf.svg',
    tpl:{ price:700.32, discount:45, vat:90,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+30 ﷼)',add:30},
        {label:'تغطية الحوادث الشخصية (+20 ﷼)',add:20},
      ]},
    comp:{ price:1950, discount:280, vat:292.5,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'تغطية الأخطار الطبيعية (+100 ﷼)',add:100},
        {label:'الحوادث الشخصية (+50 ﷼)',add:50},
      ]},
  },
  {
    id:'liva', name:'ليفا للتأمين', logo:'assets/images/imgi_23_Allianz.svg',
    tpl:{ price:735.45, discount:60, vat:99,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+50 ﷼)',add:50},
        {label:'تغطية الحوادث الشخصية (+30 ﷼)',add:30},
      ]},
    comp:{ price:2100, discount:300, vat:315,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'سيارة بديلة (+100 ﷼)',add:100},
        {label:'الأخطار الطبيعية (+150 ﷼)',add:150},
      ]},
  },
  {
    id:'aig', name:'الاتحاد للتأمين', logo:'assets/images/imgi_19_ACIG.svg',
    tpl:{ price:820.15, discount:55, vat:110.25,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'تغطية الحوادث الشخصية للسائق (+40 ﷼)',add:40},
        {label:'مساعدة الطريق (+70 ﷼)',add:70},
      ]},
    comp:{ price:2035.34, discount:314, vat:38.31,
      coverages:['المسؤولية المدنية للأضرار الصحية'],
      extras:[
        {label:'الاندفاع الطبي',add:0},
        {label:'المساعدة على الطريق (+40 ﷼)',add:40},
        {label:'الكوارث الطبيعية (+100 ﷼)',add:100},
      ]},
  },
  {
    id:'ittihad-taawun', name:'الاتحاد التعاوني', logo:'assets/images/imgi_21_UCA.svg',
    tpl:{ price:825.81, discount:50, vat:114,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+50 ﷼)',add:50},
        {label:'تغطية الحوادث (+30 ﷼)',add:30},
      ]},
    comp:{ price:1992.42, discount:373.58, vat:317.34,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'تغطية الحوادث الشخصية للسائق (+50 ﷼)',add:50},
        {label:'المساعدة على الطريق (+30 ﷼)',add:30},
        {label:'الموقع والمساعدة الطبية (+50 ﷼)',add:50},
        {label:'إيجار سيارة من طرف آخر (+300 ﷼)',add:300},
        {label:'غطاء مدى حياة الكيان التأميني (+50 ﷼)',add:50},
      ]},
  },
  {
    id:'acig', name:'الاتحاد الخليجي', logo:'assets/images/imgi_14_Aljazira-Takaful.svg',
    tpl:{ price:849.85, discount:43, vat:74,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'تغطية الحوادث الشخصية (+40 ﷼)',add:40},
        {label:'مساعدة الطريق (+30 ﷼)',add:30},
      ]},
    comp:{ price:2524.31, discount:471.31, vat:200,
      coverages:['تغطية الروبوت الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'تغطية الحوادث الشخصية للسائق (+58.52 ﷼)',add:58.52},
        {label:'استبدال سيارة دون 1,000 ريال لكل يوم (+471 ﷼)',add:471},
        {label:'استبدال سيارة 4,000 ريال لكل يوم (+250 ﷼)',add:250},
        {label:'استبدال سيارة دون 1,000 ريال لكل يوم (+200 ﷼)',add:200},
      ]},
  },
  {
    id:'asej', name:'أسيج للتأمين', logo:'assets/images/imgi_10_AICC.svg',
    tpl:{ price:955.61, discount:85, vat:146,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+36 ﷼)',add:36},
        {label:'تغطية الحوادث الشخصية (+30 ﷼)',add:30},
      ]},
    comp:{ price:2600, discount:380, vat:390,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'الأخطار الطبيعية (+100 ﷼)',add:100},
        {label:'الحوادث الشخصية (+50 ﷼)',add:50},
      ]},
  },
  {
    id:'brouj', name:'بروج للتأمين', logo:'assets/images/imgi_15_Amana.svg',
    tpl:{ price:915.93, discount:75, vat:126,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+40 ﷼)',add:40},
        {label:'تغطية الحوادث (+40 ﷼)',add:40},
      ]},
    comp:{ price:2524.31, discount:471.31, vat:200,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'الحوادث الشخصية (+100 ﷼)',add:100},
        {label:'الأخطار الطبيعية (+150 ﷼)',add:150},
      ]},
  },
  {
    id:'wafa', name:'وفا للتأمين', logo:'assets/images/imgi_11_TUIC.svg',
    tpl:{ price:815.20, discount:52.91, vat:50,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+40 ﷼)',add:40},
        {label:'تغطية الحوادث الشخصية (+30 ﷼)',add:30},
      ]},
    comp:{ price:2250, discount:350, vat:337.5,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'سيارة بديلة (+80 ﷼)',add:80},
        {label:'الأخطار الطبيعية (+100 ﷼)',add:100},
      ]},
  },
  {
    id:'gig', name:'جي آي جي', logo:'assets/images/imgi_18_GGI.svg',
    tpl:{ price:1035.15, discount:120, vat:175,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+40 ﷼)',add:40},
        {label:'الحوادث الشخصية (+28 ﷼)',add:28},
      ]},
    comp:{ price:3134.81, discount:587.76, vat:200,
      coverages:['تغطية الخسارة الكلية أو المركبة'],
      extras:[
        {label:'نفقات الإخلاء الطبي',add:0},
        {label:'تغطية خارج المملكة',add:0},
        {label:'الاندفاع الطبي',add:0},
        {label:'تغطية الطبيعة',add:0},
      ]},
  },
  {
    id:'shield', name:'الدرع العربي', logo:'assets/images/imgi_20_ArabianShield.svg',
    tpl:{ price:1310.40, discount:75, vat:50,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'الاندفاع الطبي',add:0},
        {label:'مساعدة الطريق (+40 ﷼)',add:40},
        {label:'تغطية الحوادث الشخصية (+50 ﷼)',add:50},
        {label:'تغطية كسر الزجاج (+40 ﷼)',add:40},
      ]},
    comp:{ price:2588, discount:492.25, vat:412.46,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'الاندفاع الطبي',add:0},
        {label:'نار كامل',add:0},
        {label:'تغطية ضد كسر الزجاج والحريق والسرقة (+40 ﷼)',add:40},
        {label:'تغطية الحوادث الشخصية (+50 ﷼)',add:50},
      ]},
  },
  {
    id:'saqr', name:'الصقر للتأمين', logo:'assets/images/imgi_16_AXA.svg',
    tpl:{ price:1120.61, discount:70, vat:40,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+50 ﷼)',add:50},
        {label:'تغطية الحوادث (+40 ﷼)',add:40},
      ]},
    comp:{ price:3000, discount:450, vat:450,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'الأخطار الطبيعية (+150 ﷼)',add:150},
        {label:'سيارة بديلة (+100 ﷼)',add:100},
      ]},
  },
  {
    id:'gulf', name:'الخليج للتأمين', logo:'assets/images/imgi_14_Aljazira-Takaful.svg',
    tpl:{ price:1455.13, discount:95, vat:170,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'تغطية الحوادث الشخصية (+50 ﷼)',add:50},
        {label:'مساعدة الطريق (+30 ﷼)',add:30},
      ]},
    comp:{ price:2035.34, discount:314, vat:38.31,
      coverages:['المسؤولية المدنية للأضرار الصحية'],
      extras:[
        {label:'الاندفاع الطبي',add:0},
        {label:'الأخطار الطبيعية (+100 ﷼)',add:100},
      ]},
  },
  {
    id:'arabian', name:'العربية للتأمين', logo:'assets/images/imgi_20_ArabianShield.svg',
    tpl:{ price:815.91, discount:21.9, vat:79.1,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'تغطية الحوادث الشخصية (+40 ﷼)',add:40},
        {label:'مساعدة الطريق (+40 ﷼)',add:40},
        {label:'تغطية الحوادث الشخصية (+100 ﷼)',add:100},
        {label:'سيارة بديلة (+100 ﷼)',add:100},
      ]},
    comp:{ price:5102.83, discount:934, vat:874.34,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'الأخطار الطبيعية (+200 ﷼)',add:200},
        {label:'سيارة بديلة (+100 ﷼)',add:100},
        {label:'تغطية كسر الزجاج (+50 ﷼)',add:50},
      ]},
  },
  {
    id:'khaleej', name:'الخليج العربي للتأمين', logo:'assets/images/imgi_21_UCA.svg',
    tpl:{ price:1265.91, discount:80, vat:154,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+40 ﷼)',add:40},
        {label:'تغطية الحوادث (+30 ﷼)',add:30},
      ]},
    comp:{ price:2900, discount:430, vat:435,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'الأخطار الطبيعية (+100 ﷼)',add:100},
        {label:'الحوادث الشخصية (+50 ﷼)',add:50},
      ]},
  },
  {
    id:'watan', name:'الوطنية للتأمين', logo:'assets/images/imgi_24_Tawuniya.svg',
    tpl:{ price:1565.17, discount:110, vat:200,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+50 ﷼)',add:50},
        {label:'تغطية الحوادث (+40 ﷼)',add:40},
      ]},
    comp:{ price:3500, discount:520, vat:525,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'سيارة بديلة (+150 ﷼)',add:150},
        {label:'الأخطار الطبيعية (+100 ﷼)',add:100},
      ]},
  },
  {
    id:'amana', name:'أمانة للتأمين', logo:'assets/images/imgi_15_Amana.svg',
    tpl:{ price:1895.51, discount:180, vat:280,
      coverages:['المسؤولية المدنية تجاه الغير بحد أقصى 10,000,000 ﷼'],
      extras:[
        {label:'المساعدة على الطريق (+50 ﷼)',add:50},
        {label:'الحوادث الشخصية (+40 ﷼)',add:40},
      ]},
    comp:{ price:1992.42, discount:373.58, vat:317.34,
      coverages:['تغطية الخسارة الكلية أو الجزئية للمركبة'],
      extras:[
        {label:'تغطية الحوادث الشخصية للسائق (+50 ﷼)',add:50},
        {label:'تغطية الأخطار الطبيعية (+200 ﷼)',add:200},
        {label:'الموقع والمساعدة الطبية (+50 ﷼)',add:50},
        {label:'كسر الزجاج (+150 ﷼)',add:150},
        {label:'استبدال المركبة (+500 ﷼)',add:500},
      ]},
  },
];

let currentTab = 'tpl'; /* 'tpl' | 'comp' */

/* ─── قراءة sessionStorage ────────────────────────── */
function loadSummary() {
  try {
    const inquiry = JSON.parse(sessionStorage.getItem('bcare_inquiry') || '{}');
    const policy  = JSON.parse(sessionStorage.getItem('bcare_policy')  || '{}');

    const purposeMap = { personal:'شخصي', 'private-transport':'نقل خاص', rental:'تأجير', other:'أخرى' };
    const repairMap  = { agency:'الوكالة', workshop:'الورشة' };

    const brand   = document.getElementById('vs-brand');
    const mfgYear = document.getElementById('vs-mfgyear');
    const value   = document.getElementById('vs-value');
    const purpose = document.getElementById('vs-purpose');
    const repair  = document.getElementById('vs-repair');

    if (brand)   brand.textContent   = policy.carBrand      || '—';
    if (mfgYear) mfgYear.textContent = inquiry.manufacturingYear || '—';
    if (value)   value.textContent   = inquiry.vehicleValue  ? Number(inquiry.vehicleValue).toLocaleString('en') + ' ريال' : '—';
    if (purpose) purpose.textContent = purposeMap[policy.vehiclePurpose] || policy.vehiclePurpose || '—';
    if (repair)  repair.textContent  = repairMap[policy.repairPlace]    || '—';
  } catch(e) { /* ignore */ }
}

/* ─── بناء بطاقة عرض ─────────────────────────────── */
function buildOfferCard(co, tabKey) {
  const data       = co[tabKey]; /* bيانات الـ tpl أو comp */
  const typeName   = tabKey === 'tpl' ? 'التأمين ضد الغير' : 'التأمين شامل';
  const priceId    = `price-${co.id}-${tabKey}`;
  const cardId     = `card-${co.id}-${tabKey}`;

  /* بناء checkboxes التغطيات */
  let coveragesHTML = '';
  /* تغطية أساسية مفعّلة دائماً */
  data.coverages.forEach(c => {
    coveragesHTML += `
      <label class="offer-coverage-item basic-coverage">
        <input type="checkbox" checked disabled/> ${c}
      </label>`;
  });
  /* إضافات اختيارية */
  data.extras.forEach((ex, idx) => {
    if (ex.add === 0) {
      coveragesHTML += `
        <label class="offer-coverage-item">
          <input type="checkbox" disabled/> ${ex.label}
        </label>`;
    } else {
      coveragesHTML += `
        <label class="offer-coverage-item">
          <input type="checkbox"
            data-add="${ex.add}"
            data-card="${cardId}"
            data-price-id="${priceId}"
            onchange="handleExtraChange(this)"
          />
          ${ex.label}
          <span class="coverage-extra">+${ex.add.toFixed(0)} ﷼</span>
        </label>`;
    }
  });

  const vat       = (data.price * 0.15).toFixed(2);
  const discountVal = data.discount ? data.discount.toFixed(2) : '—';

  return `
<div class="offer-card" id="${cardId}" data-base="${data.price}" data-company="${co.name}" data-type="${typeName}" data-vat-rate="0.15" data-discount="${data.discount||0}">
  <div class="offer-card-top">
    <div class="offer-company">
      <img src="${co.logo}" alt="${co.name}" class="offer-logo" onerror="this.style.display='none'"/>
      <div class="offer-company-info">
        <span class="offer-company-name">${co.name}</span>
        <span class="offer-type-badge">${typeName}</span>
      </div>
    </div>
    <div class="offer-price-wrap">
      <div>
        <span class="offer-price" id="${priceId}">${data.price.toFixed(2)}</span>
        <span class="offer-price-currency"> ﷼</span>
      </div>
      <div class="offer-price-period">﷼ / سنة</div>
    </div>
  </div>

  <div class="offer-coverages">${coveragesHTML}</div>

  <div class="offer-fees">
    <div class="offer-fees-title">رسوم إضافية:</div>
    <div class="offer-fee-row">
      <span>خصم عدم وجود مطالبات</span>
      <span class="offer-fee-val">﷼ ${discountVal}</span>
    </div>
    <div class="offer-fee-row">
      <span>ضريبة القيمة المضافة</span>
      <span class="offer-fee-val" id="vat-${co.id}-${tabKey}">﷼ ${vat}</span>
    </div>
  </div>

  <button type="button" class="off-btn-blue" onclick="selectOffer('${co.id}','${tabKey}')">
    اختر هذا العرض
  </button>
</div>`;
}

/* ─── تحديث السعر عند تحديد إضافة ───────────────── */
function handleExtraChange(checkbox) {
  const priceId = checkbox.dataset.priceId;
  const cardId  = checkbox.dataset.card;
  const card    = document.getElementById(cardId);
  if (!card) return;

  const basePrice = parseFloat(card.dataset.base);
  let extra = 0;
  card.querySelectorAll('input[type="checkbox"][data-add]').forEach(cb => {
    if (cb.checked) extra += parseFloat(cb.dataset.add || 0);
  });

  const newPrice = basePrice + extra;
  const priceEl  = document.getElementById(priceId);
  if (priceEl) priceEl.textContent = newPrice.toFixed(2);

  /* تحديث الضريبة */
  const vatRate  = parseFloat(card.dataset.vatRate || 0.15);
  const parts    = priceId.split('-'); /* price-ID-tab */
  const vatId    = 'vat-' + parts[1] + '-' + parts[2];
  const vatEl    = document.getElementById(vatId);
  if (vatEl) vatEl.textContent = '﷼ ' + (newPrice * vatRate).toFixed(2);
}

/* ─── اختيار عرض → حفظ في sessionStorage → payment ── */
function selectOffer(companyId, tabKey) {
  const card = document.getElementById(`card-${companyId}-${tabKey}`);
  if (!card) return;

  const co       = COMPANIES.find(c => c.id === companyId);
  const priceEl  = document.getElementById(`price-${companyId}-${tabKey}`);
  const price    = parseFloat(priceEl?.textContent || 0);
  const vat      = price * 0.15;
  const total    = price + vat;
  const typeName = tabKey === 'tpl' ? 'التأمين ضد الغير' : 'التأمين شامل';

  /* جمع الإضافات المختارة */
  const selectedExtras = [];
  card.querySelectorAll('input[type="checkbox"][data-add]:checked').forEach(cb => {
    selectedExtras.push({ label: cb.parentElement.textContent.trim(), add: parseFloat(cb.dataset.add) });
  });

  sessionStorage.setItem('bcare_offer', JSON.stringify({
    companyId,
    companyName: co.name,
    companyLogo: co.logo,
    insuranceType: typeName,
    basePrice: parseFloat(card.dataset.base),
    extrasCost: price - parseFloat(card.dataset.base),
    selectedExtras,
    price: parseFloat(price.toFixed(2)),
    vat:   parseFloat(vat.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
    discount: parseFloat(card.dataset.discount || 0),
  }));

  window.location.href = 'secure-checkout.html';
}

/* ─── رسم البطاقات ────────────────────────────────── */
function renderOffers(tabKey) {
  const list = document.getElementById('offers-list');
  if (!list) return;
  list.innerHTML = COMPANIES.map(co => buildOfferCard(co, tabKey)).join('');
}

/* ─── تبويبات ─────────────────────────────────────── */
function initTabs() {
  const tabTpl  = document.getElementById('tab-tpl');
  const tabComp = document.getElementById('tab-comp');
  if (!tabTpl || !tabComp) return;

  tabTpl.addEventListener('click', () => {
    currentTab = 'tpl';
    tabTpl.classList.add('active');
    tabComp.classList.remove('active');
    renderOffers('tpl');
  });
  tabComp.addEventListener('click', () => {
    currentTab = 'comp';
    tabComp.classList.add('active');
    tabTpl.classList.remove('active');
    renderOffers('comp');
  });
}

/* ─── تحديد النوع من policy-details ──────────────── */
function applyInsuranceTypeFromSession() {
  try {
    const pol = JSON.parse(sessionStorage.getItem('bcare_policy') || '{}');
    if (pol.insuranceType === 'comprehensive') {
      const tabComp = document.getElementById('tab-comp');
      const tabTpl  = document.getElementById('tab-tpl');
      if (tabComp && tabTpl) {
        tabComp.classList.add('active');
        tabTpl.classList.remove('active');
        currentTab = 'comp';
        renderOffers('comp');
        return;
      }
    }
  } catch(e) { /* ignore */ }
  renderOffers('tpl');
}

/* ─── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadSummary();
  initTabs();
  applyInsuranceTypeFromSession();
});
