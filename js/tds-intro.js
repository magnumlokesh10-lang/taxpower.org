(() => {
  'use strict';
  const active = new WeakSet();
  function countUp(demo, kind) {
    const node = demo.querySelector('[data-tds-count="' + kind + '"]');
    node.textContent = String((Number.parseInt(node.textContent, 10) || 0) + 1).padStart(2, '0');
    if (typeof node.animate === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.animate([{ transform: 'translateY(6px)', opacity: .3 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 450, easing: 'ease-out' });
    }
  }
  function showStep(demo, stage) {
    demo.dataset.stage = stage;
    const order = ['upload', 'validate', 'filed'];
    const current = order.indexOf(stage);
    demo.querySelectorAll('[data-filing-step]').forEach((node, index) => {
      node.classList.toggle('is-current', index === current);
      node.classList.toggle('is-done', index < current || stage === 'filed');
    });
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-tds-upload]');
    if (!button) return;
    const demo = button.closest('.tds-filing-demo');
    if (active.has(demo)) return;
    active.add(demo);
    const select = demo.querySelector('select');
    const form = select.options[select.selectedIndex].textContent;
    const progress = demo.querySelector('progress');
    const percent = demo.querySelector('[data-tds-percent]');
    const status = demo.querySelector('.tds-upload-status');
    button.disabled = true;
    select.disabled = true;
    progress.value = 0;
    percent.textContent = '0%';
    showStep(demo, 'upload');
    button.textContent = 'Uploading…';
    status.textContent = 'Demo: uploading ' + form + '.';
    let start = null;
    let uploaded = false;
    function tick(time) {
      if (!demo.isConnected) { active.delete(demo); return; }
      if (start === null) start = time;
      const elapsed = time - start;
      const value = Math.min(100, Math.floor(elapsed / 1800 * 100));
      progress.value = value;
      percent.textContent = value + '%';
      if (elapsed >= 1800 && !uploaded) {
        uploaded = true;
        countUp(demo, 'uploaded');
        showStep(demo, 'validate');
        button.textContent = 'Validating…';
        status.textContent = 'Demo: upload complete. Validating the sample return.';
      }
      if (elapsed >= 3000) {
        countUp(demo, 'filed');
        showStep(demo, 'filed');
        status.textContent = 'Demo: ' + form + ' — Filed Successfully.';
        button.textContent = 'Upload Another Return ↑';
        button.disabled = false;
        select.disabled = false;
        active.delete(demo);
        return;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
  document.addEventListener('change', event => {
    const select = event.target.closest('.tds-filing-demo select');
    if (!select) return;
    const demo = select.closest('.tds-filing-demo');
    if (active.has(demo)) return;
    showStep(demo, 'ready');
    demo.querySelector('progress').value = 0;
    demo.querySelector('[data-tds-percent]').textContent = '0%';
    demo.querySelector('.tds-upload-status').textContent = 'Selected ' + select.options[select.selectedIndex].textContent + '. Ready for the demo.';
    demo.querySelector('[data-tds-upload]').textContent = 'Upload Return ↑';
  });
})();
