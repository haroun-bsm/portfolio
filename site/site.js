// site.js — bespoke behavior for this page only (engine untouched).
(() => {
  'use strict';
  // nav condenses after the first pixels of scroll
  const nav = document.querySelector('.site-nav');
  if (nav) {
    const toggle = () => nav.classList.toggle('is-scrolled', window.scrollY > 12);
    addEventListener('scroll', toggle, { passive: true });
    toggle();
  }

  // Motion is enhancement-only: the static hero, copy and all sections paint without
  // it. The engine + WebGL layers load as one bundle on the first real interaction —
  // exactly when motion matters — or after a quiet 12s for visitors who only read.
  // That keeps LCP/TBT on a cold mobile load free of WebGL boots and a 17k-page layout.
  let motionKicked = false;
  const loadMotion = () => {
    if (motionKicked) return;
    motionKicked = true;
    const s = document.createElement('script');
    s.src = 'assets/boot.min.js';
    s.defer = true;
    document.body.appendChild(s);
  };
  for (const ev of ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel', 'scroll']) {
    addEventListener(ev, loadMotion, { once: true, passive: true });
  }
  setTimeout(loadMotion, 12000);
})();
