/* =====================================================
   بي كير — layout.js
   الهيدر والفوتر المشتركان بين كل الصفحات
   variant: 'home' | 'inquiry'
===================================================== */
'use strict';

/* ─── HTML الهيدر — النسختان ─────────────────────── */
function getHeaderHTML(variant) {
  if (variant === 'inquiry') {
    /* هيدر صفحة العروض: مستخدم (يمين) | شعار (وسط) | EN (يسار) */
    return `
<header class="header header--inquiry" id="header">
  <div class="header-inner container">
    <a href="#" class="btn-lang">
      <span class="lang-dot-circle"></span>
      <span>EN</span>
    </a>
    <a href="index.html" class="header-logo header-logo--center">
      <img src="assets/images/imgi_1_Bcare-logo.svg" alt="بي كير" />
    </a>
    <a href="#" class="btn-user" aria-label="دخول / تسجيل">
      <span class="material-icons">person</span>
    </a>
  </div>
</header>`;
  }

  /* هيدر الصفحة الرئيسية: شعار (يمين) | مستخدم+هامبرغر (وسط) | EN (يسار) */
  return `
<header class="header" id="header">
  <div class="header-inner container">
    <a href="#" class="btn-lang">
      <span class="lang-dot-circle"></span>
      <span>EN</span>
    </a>
    <div class="header-center">
      <a href="#" class="btn-user" aria-label="دخول / تسجيل">
        <span class="material-icons">person</span>
      </a>
      <button class="hamburger" id="hamburger" aria-label="القائمة" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    </div>
    <a href="index.html" class="header-logo">
      <img src="assets/images/imgi_1_Bcare-logo.svg" alt="بي كير" />
    </a>
  </div>
  <nav class="mobile-nav" id="mobile-nav">
    <a href="#form-section">احصل على عرض</a>
    <a href="#features-section">مميزاتنا</a>
    <a href="#discounts-section">الخصومات</a>
    <a href="#why-section">لماذا بي كير</a>
  </nav>
</header>`;
}

/* ─── HTML الفوتر — موحّد ──────────────────────────── */
function getFooterHTML() {
  return `
<footer class="footer">
  <div class="footer-inner container">

    <div class="footer-brand">
      <img src="assets/images/imgi_47_logo-bacre-white.svg" alt="بي كير" class="footer-logo" />
      <p class="footer-desc">المنصة الأذكى لمقارنة عروض تأمين السيارات في المملكة العربية السعودية</p>
      <div class="social-links">
        <a href="https://facebook.com/Bcareksa-115093535762889" target="_blank" aria-label="فيسبوك" class="social-link">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </a>
        <a href="http://instagram.com/bcareksa" target="_blank" aria-label="انستغرام" class="social-link">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        </a>
        <a href="https://www.linkedin.com/company/bcareksa" target="_blank" aria-label="لينكدإن" class="social-link">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        </a>
        <a href="https://twitter.com/bcareksa" target="_blank" aria-label="تويتر X" class="social-link">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <a href="https://api.whatsapp.com/send?phone=966920010050" target="_blank" aria-label="واتساب" class="social-link social-link--wa">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        </a>
        <a href="https://www.youtube.com/channel/UCAuOCfNoaW8xTCFAMI38Anw" target="_blank" aria-label="يوتيوب" class="social-link">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-1.96C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.4 19.54C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="#0e4f76"/></svg>
        </a>
      </div>
      <div class="app-stores">
        <a href="#" target="_blank"><img src="assets/images/imgi_49_google store.svg"  alt="Google Play"  class="store-badge" /></a>
        <a href="#" target="_blank"><img src="assets/images/imgi_50_apple store.svg"   alt="App Store"    class="store-badge" /></a>
        <a href="#" target="_blank"><img src="assets/images/imgi_51_huawei store.svg"  alt="Huawei Store" class="store-badge" /></a>
      </div>
    </div>

    <div class="footer-col">
      <button class="footer-col-toggle" aria-expanded="false">عن بي كير <span class="material-icons">expand_more</span></button>
      <ul class="footer-links">
        <li><a href="#">من نحن</a></li>
        <li><a href="#">المدونة</a></li>
        <li><a href="#">الشروط والأحكام</a></li>
        <li><a href="#">سياسة الخصوصية</a></li>
        <li><a href="#">قواعد هيئة التأمين</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <button class="footer-col-toggle" aria-expanded="false">منتجاتنا <span class="material-icons">expand_more</span></button>
      <ul class="footer-links">
        <li><a href="#">تأمين المركبات</a></li>
        <li><a href="https://medical.bcare.com.sa/" target="_blank">التأمين الطبي</a></li>
        <li><a href="https://mm.bcare.com.sa/" target="_blank">تأمين الأخطاء الطبية</a></li>
        <li><a href="https://travel.bcare.com.sa/" target="_blank">تأمين السفر</a></li>
        <li><a href="https://helpers.bcare.com.sa/" target="_blank">العمالة المنزلية</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <button class="footer-col-toggle" aria-expanded="false">الدعم الفني <span class="material-icons">expand_more</span></button>
      <ul class="footer-links">
        <li><a href="#">مركز المساعدة</a></li>
        <li><a href="#">تواصل معنا</a></li>
        <li><a href="tel:8001180044">8001180044</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <button class="footer-col-toggle" aria-expanded="false">روابط مهمة <span class="material-icons">expand_more</span></button>
      <ul class="footer-links">
        <li><a href="#">خصومات وريف</a></li>
        <li><a href="#">تجديد التأمين</a></li>
        <li><a href="#">الأسئلة الشائعة</a></li>
      </ul>
    </div>

  </div>

  <div class="footer-bottom">
    <div class="container footer-bottom-inner">
      <p>2026 © جميع الحقوق محفوظة، شركة عناية الوسيط لوساطة التأمين</p>
      <img src="assets/images/imgi_48_PaymentMethods1.svg" alt="طرق الدفع" class="payment-methods" />
    </div>
  </div>
</footer>

<!-- زر العودة للأعلى -->
<button class="back-to-top" id="back-to-top" aria-label="العودة للأعلى">
  <span class="material-icons">arrow_upward</span>
</button>

<!-- زر الدعم (دائرة برتقالية) -->
<a href="https://api.whatsapp.com/send?phone=966920010050" target="_blank" class="support-btn" aria-label="تواصل مع الدعم">
  <span class="material-icons">headset_mic</span>
</a>`;
}

/* ─── حقن الهيدر والفوتر ─────────────────────────── */
function renderLayout() {
  /* الهيدر */
  const headerEl = document.getElementById('app-header');
  if (headerEl) {
    const variant = headerEl.dataset.variant || 'home';
    headerEl.outerHTML = getHeaderHTML(variant);
  }

  /* الفوتر */
  const footerEl = document.getElementById('app-footer');
  if (footerEl) {
    footerEl.outerHTML = getFooterHTML();
  }
}

/* ─── تهيئة مشتركة بعد حقن الهيدر/الفوتر ─────────── */
function initSharedLayout() {
  /* هامبرغر (يوجد فقط في variant=home) */
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      const open = mobileNav.classList.toggle('open');
      hamburger.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open);
    });
    document.addEventListener('click', e => {
      if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
        mobileNav.classList.remove('open');
        hamburger.classList.remove('open');
      }
    });
    document.querySelectorAll('#mobile-nav a').forEach(a => {
      a.addEventListener('click', () => {
        mobileNav.classList.remove('open');
        hamburger.classList.remove('open');
      });
    });
  }

  /* أقسام الفوتر (accordion — جوال) */
  document.querySelectorAll('.footer-col-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      if (window.innerWidth >= 640) return;
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      document.querySelectorAll('.footer-col-toggle').forEach(t => {
        t.setAttribute('aria-expanded', 'false');
        const ul = t.nextElementSibling;
        if (ul) ul.classList.remove('open');
      });
      if (!expanded) {
        toggle.setAttribute('aria-expanded', 'true');
        const ul = toggle.nextElementSibling;
        if (ul) ul.classList.add('open');
      }
    });
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 640) {
      document.querySelectorAll('.footer-col-toggle').forEach(t => t.setAttribute('aria-expanded', 'false'));
      document.querySelectorAll('.footer-links').forEach(ul => ul.classList.remove('open'));
    }
  });

  /* زر العودة للأعلى */
  const backBtn = document.getElementById('back-to-top');
  if (backBtn) {
    window.addEventListener('scroll', () => {
      backBtn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    backBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  /* shadow الهيدر عند التمرير */
  const header = document.getElementById('header');
  if (header) {
    window.addEventListener('scroll', () => {
      header.style.boxShadow = window.scrollY > 8
        ? '0 4px 18px rgba(20,99,148,.16)'
        : '0 1px 4px rgba(20,99,148,.10)';
    }, { passive: true });
  }

  /* تمرير سلس */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href').slice(1);
      if (!id) return;
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        const hh = (document.getElementById('header') || {}).offsetHeight || 66;
        window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - hh - 10, behavior: 'smooth' });
      }
    });
  });
}

/* ─── تشغيل عند تحميل DOM ────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  renderLayout();
  initSharedLayout();
});
