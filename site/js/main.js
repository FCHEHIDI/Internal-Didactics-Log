/**
 * main.js
 * IDL — Internal Didactics Log
 * Core site interactivity: navigation state, TOC highlighting, smooth scroll.
 */
(function () {
  'use strict';

  /* ── Active nav link ───────────────────────────────────────── */
  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    link.classList.toggle('active', href === currentFile);
  });

  /* ── Smooth scroll for in-page anchors ─────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const id     = this.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ── TOC — highlight active section on scroll ──────────────── */
  const tocLinks  = document.querySelectorAll('.toc-list a');
  const headings  = document.querySelectorAll('.entry-body h2[id], .entry-body h3[id]');

  if (tocLinks.length > 0 && headings.length > 0) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        tocLinks.forEach(link => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === `#${id}`
          );
        });
      });
    }, { rootMargin: '-15% 0px -75% 0px' });

    headings.forEach(h => io.observe(h));
  }

  /* ── Search filter chips ────────────────────────────────────── */
  document.querySelectorAll('.search-filters .tag[data-filter]').forEach(chip => {
    chip.addEventListener('click', function (e) {
      e.preventDefault();
      const input = document.getElementById('search-input');
      if (!input) return;
      input.value = this.dataset.filter;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    });
  });
})();
