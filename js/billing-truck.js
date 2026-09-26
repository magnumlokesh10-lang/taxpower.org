(() => {
  'use strict';
  const running = new WeakSet();
  function animateCount(counter, increment, reduced) {
    return new Promise(resolve => {
      let value = Number.parseInt(counter.textContent, 10) || 0;
      const target = value + increment;
      const paint = () => { counter.textContent = String(value).padStart(2, '0'); };
      if (reduced) { value = target; paint(); resolve(); return; }
      let previous = null;
      function step(time) {
        if (!counter.isConnected) { resolve(); return; }
        if (previous === null) previous = time;
        if (time - previous >= 55) { value += 1; paint(); previous = time; }
        if (value < target) requestAnimationFrame(step); else resolve();
      }
      requestAnimationFrame(step);
    });
  }
  // Delegation supports the GST section loaded into the homepage.
  document.addEventListener('click', async event => {
    const lane = event.target.closest('.gst-billing-truck-lane');
    if (!lane || running.has(lane)) return;
    const truck = lane.querySelector('.gst-billing-truck');
    const visual = lane.closest('.gst-billing-intro-visual');
    if (!truck || !visual || typeof truck.animate !== 'function') return;
    running.add(lane);
    lane.setAttribute('aria-busy', 'true');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cards = Array.from(visual.querySelectorAll('[data-billing-document]'));
    const animations = [];
    function play(element, keyframes, options) {
      const animation = element.animate(keyframes, options);
      animations.push(animation);
      return animation;
    }
    try {
      const truckBox = truck.getBoundingClientRect();
      // Aim at the blue cargo compartment, using each SVG's coordinate system.
      const cargoX = truckBox.left + truckBox.width * .32;
      const cargoY = truckBox.top + truckBox.height * .35;
      const loading = cards.map((card, index) => {
        if (reduced) return play(card, [{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' }).finished;
        const svg = card.ownerSVGElement;
        const matrix = svg.getScreenCTM();
        if (!matrix) return Promise.resolve();
        const point = svg.createSVGPoint();
        point.x = cargoX;
        point.y = cargoY;
        const destination = point.matrixTransform(matrix.inverse());
        const box = card.getBBox();
        const dx = destination.x - (box.x + box.width / 2);
        const dy = destination.y - (box.y + box.height / 2);
        return play(card, [
          { transform: 'translate(0px, 0px) scale(1)', opacity: 1, offset: 0 },
          { transform: `translate(${dx * .2}px, ${dy * .15 - 14}px) scale(.92)`, opacity: 1, offset: .22 },
          { transform: `translate(${dx}px, ${dy}px) scale(.15)`, opacity: .8, offset: .9 },
          { transform: `translate(${dx}px, ${dy}px) scale(.08)`, opacity: 0, offset: 1 }
        ], { duration: 1000, delay: index * 180, easing: 'ease-in-out', fill: 'forwards' }).finished;
      });
      await Promise.all(loading);
      if (!lane.isConnected) return;
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

      const drive = play(truck, frames, { duration: reduced ? 400 : 4200, easing: 'ease-in-out' });
      // Counts begin when the loaded truck starts, not during document loading.
      const counts = Array.from(visual.querySelectorAll('.gst-billing-journey b'),
        counter => animateCount(counter, Math.floor(Math.random() * 30) + 1, reduced));
      await Promise.all([drive.finished, ...counts]);
      // The next parked truck gets a fresh pair of document cards.
      animations.forEach(animation => animation.cancel());
      await Promise.all(cards.map(card => play(card,
        [{ opacity: 0 }, { opacity: 1 }],
        { duration: reduced ? 0 : 260, easing: 'ease-out' }).finished));
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Billing animation could not complete.', error);
    } finally {
      animations.forEach(animation => animation.cancel());
      lane.removeAttribute('aria-busy');
      running.delete(lane);
    }
  });
})();
