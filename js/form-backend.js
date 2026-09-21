/* TaxPower demo enquiry -> Google Sheet + Email + WhatsApp
 * Paste your deployed Google Apps Script Web App URL below.
 * It must look like: https://script.google.com/macros/s/AKfycb...../exec
 */
window.TAXPOWER_FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbz8GTacY-V0Loi3-MtnOdzExnGv3b5uCqRLTgqhEiR_ibXYGRF9t9ETljXDKbxdesIQ/exec';

(function () {
  'use strict';

  function collectFormData(form) {
    const data = {};
    const fd = new FormData(form);

    fd.forEach((value, key) => {
      if (key === 'product') return;
      data[key] = typeof value === 'string' ? value.trim() : value;
    });

    data.product = Array.from(form.querySelectorAll('input[name="product"]:checked'))
      .map((input) => input.value)
      .join(', ');

    const purpose = document.getElementById('purposeSelectHidden');
    if (purpose && purpose.value) data.purpose = purpose.value;

    data.page = window.location.href;
    data.submittedAt = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    return data;
  }

  function setButtonLoading(button, isLoading) {
    if (!button) return;
    const text = button.querySelector('.submit-btn-text');

    if (isLoading) {
      button.dataset.originalText = button.dataset.originalText || (text ? text.textContent : '');
      if (text) text.textContent = 'Sending...';
      button.classList.add('is-sending');
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      return;
    }

    if (text && button.dataset.originalText) text.textContent = button.dataset.originalText;
    button.classList.remove('is-sending');
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }

  function sendToGoogleSheet(payload) {
    const body = new URLSearchParams();
    Object.keys(payload).forEach((key) => body.append(key, payload[key] == null ? '' : String(payload[key])));

    return fetch('/api/public/enquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString(),
    })
      .then(function (res) { return res.ok; })
      .catch(function (error) {
        console.error('TaxPower: sheet save failed', error);
        return false;
      });
  }

  function sendToAppsScript(endpoint, payload) {
    if (!endpoint || endpoint.indexOf('script.google.com') === -1) {
      console.warn('TaxPower: Google Apps Script Web App URL is not configured in js/form-backend.js');
      return Promise.resolve(false);
    }

    const body = new URLSearchParams();
    Object.keys(payload).forEach((key) => body.append(key, payload[key] == null ? '' : String(payload[key])));

    return fetch(endpoint, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: body.toString(),
    })
      .then(function () { return true; })
      .catch(function (error) {
        console.error('TaxPower: email/WhatsApp alert failed', error);
        return false;
      });
  }

  window.sendDemoEnquiryToBackend = function sendDemoEnquiryToBackend(form) {
    const endpoint = window.TAXPOWER_FORM_ENDPOINT;
    const button = form.querySelector('.demo-submit-kicker-badge');
    const payload = collectFormData(form);

    setButtonLoading(button, true);

    return Promise.all([
      sendToGoogleSheet(payload),
      sendToAppsScript(endpoint, payload),
    ])
      .then(function (results) {
        return results[0] || results[1];
      })
      .finally(function () {
        setButtonLoading(button, false);
      });
  };
})();
