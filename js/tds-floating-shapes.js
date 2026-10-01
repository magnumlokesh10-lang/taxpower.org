/* Static random geometry; compositor motion runs only while the dashboard is visible. */
(() => {
 'use strict';
 const layers = new Set();
 const visible = new WeakMap();
 const updatePlayback = layer => {
  layer.dataset.motionRunning = String(!document.hidden && visible.get(layer) !== false);
 };
 const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  entries.forEach(entry => { visible.set(entry.target, entry.isIntersecting); updatePlayback(entry.target); });
 }, {threshold:0}) : null;
 const resize = 'ResizeObserver' in window ? new ResizeObserver(entries => {
  entries.forEach(entry => {
   if (entry.contentRect.height > 0) entry.target.style.setProperty('--tds-shape-travel', (-entry.contentRect.height - 180) + 'px');
  });
 }) : null;
 document.addEventListener('visibilitychange', () => {
  layers.forEach(layer => {
   if (!layer.isConnected) { observer?.unobserve(layer); resize?.unobserve(layer); layers.delete(layer); }
   else updatePlayback(layer);
  });
 });
 const random = (min, max) => min + Math.random() * (max - min);
 function init() {
  document.querySelectorAll('#tds-deductors > .tds-floating-shapes').forEach(layer => {
   if (layer.dataset.shapesInitialized) return;
   layer.dataset.shapesInitialized = 'true';
   layers.add(layer);
   visible.set(layer, !observer);
   updatePlayback(layer);
   observer?.observe(layer);
   resize?.observe(layer);
   const types = ['square','triangle','diamond','square','triangle','diamond','square','triangle','diamond','square'];
   for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
   }
   Array.from(layer.children).forEach((shape, index) => {
    const duration = random(26, 42);
    shape.dataset.shape = types[index % types.length];
    shape.dataset.tone = Math.random() < .5 ? 'peach' : 'lavender';
    const values = {
     '--shape-left': (3 + index * 8.7 + random(0, 3)).toFixed(2) + '%',
     '--shape-size': random(26, 88).toFixed(1) + 'px',
     '--shape-left-mobile': (5 + (index % 6) * 14.4 + random(0, 2)).toFixed(2) + '%',
     '--shape-duration': duration.toFixed(2) + 's',
     '--shape-delay': (-duration * (index % 3 === 0 ? random(.72,.85) : random(.15,.88))).toFixed(2) + 's',
     '--shape-angle': random(-12,12).toFixed(1) + 'deg',
     '--shape-turn': ((Math.random() < .5 ? -1 : 1) * random(650,850)).toFixed(1) + 'deg',
     '--shape-drift': random(-22,22).toFixed(1) + 'px'
    };
    Object.entries(values).forEach(([key, value]) => shape.style.setProperty(key, value));
   });
  });
 }
 document.addEventListener('taxpower:sections-loaded', init);
 if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
 else init();
})();
