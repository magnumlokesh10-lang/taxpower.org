/* Scroll-linked entrance for the TDS client heading and screenshot. */
(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 768px)');
  let section, frame, pending = 0;
  const clamp = (value) => Math.max(0, Math.min(1, value));
  function update() {
    pending = 0;
    if (!section?.isConnected || !frame || !section.getClientRects().length) return;
    const bounds = section.getBoundingClientRect();
    const viewport = window.innerHeight || document.documentElement.clientHeight;
    // Hold the lowered pose until the frame reaches mid-screen.
    // Settle at the viewport top, while the screenshot is still visible.
    const progress = clamp((viewport * .5 - bounds.top) / (viewport * .5));
    const remaining = reducedMotion.matches ? 0 : 1 - progress;
    const headingShift = (mobile.matches ? 95 : 185) * remaining;
    const imageShift = (mobile.matches ? 130 : 235) * remaining;
    section.style.setProperty('--tds-heading-shift', headingShift.toFixed(2) + 'px');
    frame.style.setProperty('--tds-image-shift', imageShift.toFixed(2) + 'px');
    const angle = (mobile.matches ? 12 : 20) * remaining;
    const scale = mobile.matches ? 1 - .04 * remaining : 1 + .02 * remaining;
    frame.style.setProperty('--tds-scroll-angle', angle.toFixed(3) + 'deg');
    frame.style.setProperty('--tds-scroll-scale', scale.toFixed(4));
    frame.classList.toggle('tds-scroll-active',
      !reducedMotion.matches && bounds.bottom > 0 && bounds.top < viewport);
  }
  function schedule() {
    if (!pending) pending = requestAnimationFrame(update);
  }
  const visibility = 'IntersectionObserver' in window
    ? new IntersectionObserver(schedule) : null;
  const size = 'ResizeObserver' in window ? new ResizeObserver(schedule) : null;
  function init() {
    const next = document.querySelector('#tds-deductors');
    if (!next) return;
    if (next !== section) {
      visibility?.disconnect();
      size?.disconnect();
      section = next;
      frame = section.querySelector('.gst-browser-frame');
      if (!frame) return;
      section.classList.add('tds-scroll-ready');
      visibility?.observe(section);
      size?.observe(section);
    }
    schedule();
  }
  // Capture also covers a scrollable ancestor when this section is embedded.
  document.addEventListener('scroll', schedule, { passive: true, capture: true });
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  reducedMotion.addEventListener('change', schedule);
  mobile.addEventListener('change', schedule);
  document.addEventListener('taxpower:sections-loaded', init);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
