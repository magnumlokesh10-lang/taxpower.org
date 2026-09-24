(() => {
  'use strict';
  const viewport = document.querySelector('.company-logo-marquee');
  const track = document.querySelector('.company-logo-track');
  if (!viewport || !track) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mouseHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  const duplicate = track.querySelector('[aria-hidden="true"]');
  let hovered = false;
  let focused = false;
  let touching = false;
  let visible = true;
  let resumeAfter = 0;
  let distance = 0;
  let position = viewport.scrollLeft;
  let previousTime = 0;
  let frame = 0;

  function measure() {
    // Measure equivalent cards, including the seam gap; do not assume 50% of track width.
    distance = duplicate && !reducedMotion.matches
      ? duplicate.getBoundingClientRect().left - track.firstElementChild.getBoundingClientRect().left
      : 0;
    position = viewport.scrollLeft;
  }
  function tick(time) {
    const elapsed = previousTime ? Math.min(time - previousTime, 50) : 0;
    previousTime = time;
    if (!hovered && !focused && !touching && time >= resumeAfter && distance > 0) {
      // Keep fractional pixels across frames, including high-refresh-rate screens.
      const speed = viewport.clientWidth <= 768 ? 42 : 62;
      position = (position + speed * elapsed / 1000) % distance;
      viewport.scrollLeft = position;
    } else {
      position = viewport.scrollLeft;
    }
    frame = requestAnimationFrame(tick);
  }
  function syncAnimation() {
    cancelAnimationFrame(frame);
    previousTime = 0;
    if (!document.hidden && visible && !reducedMotion.matches) frame = requestAnimationFrame(tick);
  }
  function updatePreference() {
    viewport.classList.toggle('is-enhanced', !reducedMotion.matches);
    measure();
    syncAnimation();
  }
  viewport.addEventListener('mouseenter', () => { hovered = mouseHover.matches; });
  viewport.addEventListener('mouseleave', () => { hovered = false; });
  viewport.addEventListener('focusin', () => { focused = viewport.matches(':focus-visible'); });
  viewport.addEventListener('focusout', () => { focused = false; });
  viewport.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse') return;
    touching = true;
    // A touch focuses scroll regions on some browsers; only keyboard focus should pause indefinitely.
    focused = false;
  }, { passive: true });
  function release() {
    if (!touching) return;
    touching = false;
    resumeAfter = performance.now() + 2000;
  }
  window.addEventListener('pointerup', release, { passive: true });
  window.addEventListener('pointercancel', release, { passive: true });
  viewport.addEventListener('scroll', () => {
    if (touching || performance.now() < resumeAfter) resumeAfter = performance.now() + 2000;
  }, { passive: true });
  viewport.addEventListener('wheel', () => { resumeAfter = performance.now() + 2000; }, { passive: true });
  viewport.addEventListener('keydown', event => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    viewport.scrollLeft += event.key === 'ArrowRight' ? 180 : -180;
    position = viewport.scrollLeft;
  });
  document.addEventListener('visibilitychange', () => {
    touching = false;
    position = viewport.scrollLeft;
    syncAnimation();
  });
  if ('ResizeObserver' in window) new ResizeObserver(measure).observe(viewport);
  else window.addEventListener('resize', measure);
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncAnimation();
  }).observe(viewport);
  reducedMotion.addEventListener('change', updatePreference);
  updatePreference();
})();
