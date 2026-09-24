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
    const distance = Math.max(0, lane.clientWidth - truck.getBoundingClientRect().width - 8);
    const frames = reduced
      ? [{ opacity: 1 }, { opacity: .55 }, { opacity: 1 }]
      : [
          { transform: 'translateX(0) scaleX(1)', offset: 0 },
          { transform: `translateX(${distance}px) scaleX(1)`, offset: .44 },
          { transform: `translateX(${distance}px) scaleX(-1)`, offset: .5 },
          { transform: 'translateX(0) scaleX(-1)', offset: .94 },
          { transform: 'translateX(0) scaleX(1)', offset: 1 }
        ];
    const animation = truck.animate(frames, { duration: reduced ? 400 : 4400, easing: 'ease-in-out' });
    running.set(lane, animation);
    const clear = () => running.delete(lane);
    animation.onfinish = clear;
    animation.oncancel = clear;
  });
})();
