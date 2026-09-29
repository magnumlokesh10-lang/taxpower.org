/* Border-beam effect adapted from the user-provided MIT-licensed Motiq example.
   Standalone JavaScript; existing dashboard content and scroll effects are untouched. */
(() => {
 const initialized = new WeakSet();
 const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
 function init() {
  const panel = document.getElementById('tds-deductors');
  if (!panel || initialized.has(panel)) return;
  initialized.add(panel);
  let angle = 137.508, speed = 42, velocity = 0, target = 42;
  let hovered = false, frame = 0, last = 0;
  const rect = panel.getBoundingClientRect();
  let onScreen = rect.bottom > 0 && rect.top < window.innerHeight;
  const paint = () => panel.style.setProperty('--tds-beam-offset', (-((angle % 360 + 360) % 360) / 360 * 1000).toFixed(3));
  const running = () => panel.isConnected && onScreen && !document.hidden && !reduced.matches;
  function tick(now) {
   frame = 0;
   if (!running()) { last = 0; return; }
   const dt = last ? Math.min((now - last) / 1000, .05) : 0;
   last = now;
   velocity += (30 * (target - speed) - 11 * velocity) * dt;
   speed += velocity * dt;
   angle += speed * dt;
   paint();
   frame = requestAnimationFrame(tick);
  }
  function sync() {
   if (frame) cancelAnimationFrame(frame);
   frame = 0; last = 0;
   if (reduced.matches) { angle = 40; speed = 42; velocity = 0; paint(); }
   if (running()) frame = requestAnimationFrame(tick);
  }
  function updateTarget() {
   target = hovered || panel.contains(document.activeElement) ? 240 : 42;
  }
  panel.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = true; updateTarget(); } });
  panel.addEventListener('pointerleave', () => { hovered = false; updateTarget(); });
  panel.addEventListener('focusin', updateTarget);
  panel.addEventListener('focusout', () => queueMicrotask(updateTarget));
  if ('IntersectionObserver' in window) {
   const observer = new IntersectionObserver(entries => {
    onScreen = entries.some(entry => entry.isIntersecting);
    sync();
   }, { threshold: .05 });
   observer.observe(panel);
  }
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  paint(); sync();
 }
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
 else init();
 document.addEventListener('taxpower:sections-loaded', init);
})();
