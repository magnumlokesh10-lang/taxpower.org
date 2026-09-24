(() => {
  'use strict';
  function activate(tab) {
    const preview = tab.closest('.tds-preview');
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
    const label = preview.querySelector('[role="tab"][aria-selected="true"]').textContent;
    button.disabled = true;
    button.textContent = 'Checking sample…';
    result.textContent = 'Running simulated checks for ' + label.toLowerCase() + '…';
    window.setTimeout(() => {
      if (!button.isConnected) return;
      result.textContent = label + ' demo complete. Sample records checked successfully.';
      button.textContent = 'Run sample check →';
      button.disabled = false;
    }, 1100);
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
