(() => {
  'use strict';
  const running = new WeakMap();
  function animateCount(counter, increment, reduced) {
    let value = Number.parseInt(counter.textContent, 10) || 0;
    const target = value + increment;
    const paint = () => { counter.textContent = String(value).padStart(2, '0'); };
    if (reduced) { value = target; paint(); return; }
    let previous = 0;
    function step(time) {
      if (!counter.isConnected) return;
      if (!previous) previous = time;
      if (time - previous >= 55) {
        value += 1;
        paint();
        previous = time;
      }
      if (value < target) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  // Delegation also covers the GST section loaded into the homepage.
  document.addEventListener('click', event => {
    const lane = event.target.closest('.gst-billing-truck-lane');
    if (!lane || running.has(lane)) return;
    const truck = lane.querySelector('.gst-billing-truck');
    if (!truck || typeof truck.animate !== 'function') return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const exit = lane.clientWidth + 12;
    const entry = -truck.getBoundingClientRect().width - 12;
    const parkingOvershoot = Math.min(24, lane.clientWidth * .08);
    const frames = reduced
      ? [{ opacity: 1 }, { opacity: .55 }, { opacity: 1 }]
      : [
          { transform: 'translateX(0)', opacity: 1, offset: 0, easing: 'cubic-bezier(.4,0,.8,.6)' },
          { transform: `translateX(${exit}px)`, opacity: 1, offset: .42 },
          // Reuse the artwork only while fully outside the clipped lane.
          { transform: `translateX(${exit}px)`, opacity: 0, offset: .43 },
          { transform: `translateX(${entry}px)`, opacity: 0, offset: .44 },
          { transform: `translateX(${entry}px)`, opacity: 1, offset: .45, easing: 'cubic-bezier(.2,.7,.3,1)' },
          { transform: `translateX(${parkingOvershoot}px)`, opacity: 1, offset: .78 },
          { transform: `translateX(${parkingOvershoot}px)`, opacity: 1, offset: .84, easing: 'ease-in-out' },
          { transform: 'translateX(0)', opacity: 1, offset: 1 }
        ];
    const animation = truck.animate(frames, { duration: reduced ? 400 : 4200, easing: 'ease-in-out' });
    running.set(lane, animation);
    // Count only after a new truck animation actually starts.
    const counters = lane.closest('.gst-billing-intro-visual')?.querySelectorAll('.gst-billing-journey b');
    counters?.forEach(counter => animateCount(counter, Math.floor(Math.random() * 30) + 1, reduced));
    const clear = () => running.delete(lane);
    animation.onfinish = clear;
    animation.oncancel = clear;
  });
})();
