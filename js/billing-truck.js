(() => {
  'use strict';
  const running = new WeakMap();
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
          { transform: 'translateX(0)', opacity: 1, offset: 0 },
          { transform: `translateX(${exit}px)`, opacity: 1, offset: .42 },
          // Reuse the artwork only while fully outside the clipped lane.
          { transform: `translateX(${exit}px)`, opacity: 0, offset: .43 },
          { transform: `translateX(${entry}px)`, opacity: 0, offset: .44 },
          { transform: `translateX(${entry}px)`, opacity: 1, offset: .45 },
          { transform: `translateX(${parkingOvershoot}px)`, opacity: 1, offset: .82 },
          { transform: 'translateX(0)', opacity: 1, offset: 1 }
        ];
    const animation = truck.animate(frames, { duration: reduced ? 400 : 4200, easing: 'ease-in-out' });
    running.set(lane, animation);
    const clear = () => running.delete(lane);
    animation.onfinish = clear;
    animation.oncancel = clear;
  });
})();
