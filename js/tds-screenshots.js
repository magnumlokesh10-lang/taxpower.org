/* Delegated handlers support both the standalone TDS page and loaded home sections. */
(() => {
  let dialog;
  let trigger;
  let previousOverflow;
  function getDialog() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'tds-shot-dialog';
    dialog.setAttribute('aria-labelledby', 'tds-shot-title');
    dialog.innerHTML = '<div class="tds-shot-toolbar"><strong id="tds-shot-title"></strong><button type="button" data-tds-zoom aria-pressed="false">Zoom in</button><button type="button" data-tds-close autofocus>Close ×</button></div><div class="tds-shot-viewport" tabindex="0" aria-label="Screenshot preview; zoom in to scroll for details"><img alt=""></div>';
    document.body.appendChild(dialog);
    dialog.querySelector('[data-tds-close]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-tds-zoom]').addEventListener('click', (event) => {
      const zoomed = dialog.classList.toggle('is-zoomed');
      event.currentTarget.textContent = zoomed ? 'Fit to screen' : 'Zoom in';
      event.currentTarget.setAttribute('aria-pressed', String(zoomed));
    });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    });
    return dialog;
  }
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-tds-screenshot]');
    if (!button) return;
    const source = button.querySelector('img');
    if (!source) return;
    const preview = getDialog();
    if (preview.open) return;
    trigger = button;
    const picture = preview.querySelector('img');
    picture.src = source.currentSrc || source.src;
    picture.alt = source.alt;
    preview.querySelector('strong').textContent = source.alt;
    preview.style.setProperty('--tds-shot-width', `${source.naturalWidth || source.width}px`);
    preview.classList.remove('is-zoomed');
    const zoom = preview.querySelector('[data-tds-zoom]');
    zoom.textContent = 'Zoom in';
    zoom.setAttribute('aria-pressed', 'false');
    previousOverflow = document.body.style.overflow;
    preview.showModal();
    document.body.style.overflow = 'hidden';
    const viewport = preview.querySelector('.tds-shot-viewport');
    viewport.scrollTop = 0;
    viewport.scrollLeft = 0;
  });
})();
