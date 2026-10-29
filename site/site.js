// site.js — bespoke behavior for this page only (engine untouched).
(() => {
  'use strict';
  // nav condenses after the first pixels of scroll
  const nav = document.querySelector('.site-nav');
  if (nav) {
    const toggle = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
    addEventListener('scroll', toggle, { passive: true });
    toggle();
  }
})();
