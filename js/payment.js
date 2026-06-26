/* =====================================================
   بي كير — payment.js
   صفحة الدفع — قراءة sessionStorage وعرض الملخص
===================================================== */
'use strict';

function loadOfferData() {
  try {
    const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
    if (!offer.companyName) return;

    const fmt = v => 'ر.س ' + parseFloat(v).toFixed(2);

    /* بطاقة تفاصيل الخدمة */
    const setTxt = (id, val) => { const el = document.getElementById(id); if(el) el.textContent = val; };
    setTxt('pay-company', offer.companyName);
    setTxt('pay-type',    offer.insuranceType);
    setTxt('pay-price',   fmt(offer.price));
    setTxt('pay-vat',     fmt(offer.vat));
    setTxt('pay-total',   fmt(offer.total));

    /* ملخص الطلب */
    setTxt('sum-company', offer.companyName);
    setTxt('sum-type',    offer.insuranceType);
    setTxt('sum-price',   fmt(offer.price));
    setTxt('sum-vat',     fmt(offer.vat));
    setTxt('sum-total',   fmt(offer.total));
  } catch(e) { /* ignore */ }
}

/* راديو طريقة الدفع */
function initPayMethodRadio() {
  document.querySelectorAll('input[name="payMethod"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.querySelectorAll('.payment-method-opt').forEach(opt => opt.classList.remove('selected'));
      if (radio.checked) radio.closest('.payment-method-opt').classList.add('selected');

      /* حفظ طريقة الدفع */
      try {
        const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
        offer.payMethod = radio.value;
        sessionStorage.setItem('bcare_offer', JSON.stringify(offer));
      } catch(e) {}
    });
  });
}

function goToCheckout() {
  /* حفظ طريقة الدفع المحددة */
  try {
    const selected = document.querySelector('input[name="payMethod"]:checked');
    if (selected) {
      const offer = JSON.parse(sessionStorage.getItem('bcare_offer') || '{}');
      offer.payMethod = selected.value;
      sessionStorage.setItem('bcare_offer', JSON.stringify(offer));
    }
  } catch(e) {}
  window.location.href = 'secure-checkout.html';
}

document.addEventListener('DOMContentLoaded', () => {
  loadOfferData();
  initPayMethodRadio();
});
