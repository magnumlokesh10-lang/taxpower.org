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
    demo.querySelector('.tds-form-trigger').disabled = true;
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
        demo.querySelector('.tds-form-trigger').disabled = false;
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

(() => {
  'use strict';
  function parts(picker) {
    return {
      trigger: picker.querySelector('.tds-form-trigger'),
      menu: picker.querySelector('.tds-form-menu'),
      select: picker.querySelector('select'),
      options: Array.from(picker.querySelectorAll('[role="option"]'))
    };
  }
  function highlight(picker, index) {
    const { trigger, options } = parts(picker);
    options.forEach((option, i) => option.classList.toggle('is-active', i === index));
    trigger.setAttribute('aria-activedescendant', options[index].id);
    picker.dataset.activeIndex = String(index);
  }
  function close(picker) {
    const { trigger, menu } = parts(picker);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-activedescendant');
    menu.hidden = true;
    picker.classList.remove('is-open');
  }
  function open(picker) {
    const { trigger, menu, select } = parts(picker);
    if (select.disabled) return;
    document.querySelectorAll('.tds-form-select.is-open').forEach(other => { if (other !== picker) close(other); });
    menu.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    picker.classList.add('is-open');
    highlight(picker, select.selectedIndex);
  }
  function choose(picker, index) {
    const { trigger, select, options } = parts(picker);
    if (select.disabled) return;
    select.selectedIndex = index;
    trigger.querySelector('span').textContent = select.options[index].textContent;
    options.forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
    close(picker);
    trigger.focus({ preventScroll: true });
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }
  document.addEventListener('click', event => {
    const picker = event.target.closest('.tds-form-select');
    document.querySelectorAll('.tds-form-select.is-open').forEach(other => { if (other !== picker) close(other); });
    if (!picker) return;
    if (event.target.closest('.tds-form-trigger')) {
      if (parts(picker).menu.hidden) open(picker); else close(picker);
    }
    const option = event.target.closest('[data-form-index]');
    if (option) choose(picker, Number(option.dataset.formIndex));
  });
  document.addEventListener('focusin', event => {
    document.querySelectorAll('.tds-form-select.is-open').forEach(picker => {
      if (!picker.contains(event.target)) close(picker);
    });
  });
  document.addEventListener('keydown', event => {
    const trigger = event.target.closest('.tds-form-trigger');
    if (!trigger || trigger.disabled) return;
    const picker = trigger.closest('.tds-form-select');
    const { menu, options } = parts(picker);
    if (event.key === 'Escape') { event.preventDefault(); close(picker); return; }
    if (event.key === 'Tab') { close(picker); return; }
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault();
      if (menu.hidden) { open(picker); return; }
      let index = Number(picker.dataset.activeIndex);
      if (event.key === 'Home') index = 0;
      else if (event.key === 'End') index = options.length - 1;
      else index = (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      highlight(picker, index);
    } else if ((event.key === 'Enter' || event.key === ' ') && !menu.hidden) {
      event.preventDefault();
      choose(picker, Number(picker.dataset.activeIndex));
    }
  });
})();
