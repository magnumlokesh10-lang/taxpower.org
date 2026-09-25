(() => {
  'use strict';
  const timers = new WeakMap();
  const steps = {
    'tds-tab-returns': ['Import salary and deductee records.', 'Review PAN, deductions and return data.', 'Generate FVU and proceed to Income Tax portal filing.'],
    'tds-tab-challans': ['Import challan records from the portal.', 'Map challans and review utilisation.', 'Review computed interest and late fees.'],
    'tds-tab-traces': ['Request Conso files, reports or certificates from TRACES.', 'Prepare Form 16, 16A or 27D certificates.', 'Digitally sign and email certificates.']
  };
  function reset(preview) {
    window.clearTimeout(timers.get(preview));
    timers.delete(preview);
    const button = preview.querySelector('[data-tds-check]');
    button.disabled = false;
    button.textContent = 'Play workflow demo →';
    preview.querySelector('.tds-check-result').textContent = 'Select a tab, then play its illustrative workflow.';
  }
  function activate(tab) {
    const preview = tab.closest('.tds-preview');
    reset(preview);
    preview.querySelectorAll('[role="tab"]').forEach(button => {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      preview.querySelector('#' + button.getAttribute('aria-controls')).hidden = !selected;
    });
  }
  document.addEventListener('click', event => {
    const tab = event.target.closest('.tds-tabs [role="tab"]');
    if (tab) activate(tab);
    const button = event.target.closest('[data-tds-check]');
    if (!button || button.disabled) return;
    const preview = button.closest('.tds-preview');
    const result = preview.querySelector('.tds-check-result');
    const selected = preview.querySelector('[role="tab"][aria-selected="true"]');
    const sequence = steps[selected.id];
    if (!sequence) return;
    button.disabled = true;
    button.textContent = 'Playing demo…';
    let step = 0;
    function advance() {
      if (!preview.isConnected) return;
      if (step < sequence.length) {
        result.textContent = 'Demo ' + (step + 1) + '/3 · ' + sequence[step++];
        timers.set(preview, window.setTimeout(advance, 1500));
      } else {
        result.textContent = selected.textContent + ' workflow demo complete. No portal action was performed.';
        button.textContent = 'Replay workflow demo →';
        button.disabled = false;
        timers.delete(preview);
      }
    }
    advance();
  });
  document.addEventListener('keydown', event => {
    const tab = event.target.closest('.tds-tabs [role="tab"]');
    if (!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const tabs = Array.from(tab.parentElement.querySelectorAll('[role="tab"]'));
    let index = tabs.indexOf(tab);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = tabs.length - 1;
    else index = (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    activate(tabs[index]);
    tabs[index].focus();
  });
})();
