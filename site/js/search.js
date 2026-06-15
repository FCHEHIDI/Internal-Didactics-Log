/**
 * search.js
 * IDL — Internal Didactics Log
 *
 * Client-side search stub.
 *
 * INTEGRATION NOTE:
 *   This file provides a scaffolded, XSS-safe search implementation.
 *   For production, replace INDEX with a generated static index,
 *   or integrate Pagefind (https://pagefind.app) / Fuse.js / Lunr.js.
 *
 *   Pagefind integration: replace the search() call with:
 *     const pagefind = await import('/pagefind/pagefind.js');
 *     const results  = await pagefind.search(query);
 */
(function () {
  'use strict';

  const form      = document.getElementById('search-form');
  const input     = document.getElementById('search-input');
  const resultsEl = document.getElementById('search-results');

  if (!form || !input || !resultsEl) return;

  /**
   * Entry index.
   * Populate from your static build pipeline or replace with Pagefind.
   *
   * @type {Array<{title: string, date: string, abstract: string, tags: string[], url: string}>}
   */
  const INDEX = [
    // { title: '', date: '', abstract: '', tags: [], url: '' }
  ];

  /* ── Search ────────────────────────────────────────────────── */
  function search(raw) {
    const q = raw.trim().toLowerCase();
    if (!q) return [];

    /* Tag filter: starts with # */
    if (q.startsWith('#')) {
      const tag = q.slice(1);
      return INDEX.filter(e => e.tags.some(t => t.toLowerCase() === tag));
    }

    /* Date prefix filter: YYYY or YYYY-MM */
    if (/^\d{4}(-\d{2})?$/.test(q)) {
      return INDEX.filter(e => e.date.startsWith(q));
    }

    /* Full-text: title + abstract + tags */
    return INDEX.filter(e =>
      e.title.toLowerCase().includes(q)    ||
      e.abstract.toLowerCase().includes(q) ||
      e.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  /* ── Render ────────────────────────────────────────────────── */
  function render(results, query) {
    if (results.length === 0) {
      resultsEl.innerHTML =
        `<p class="no-results">No entries match <code>${esc(query)}</code></p>`;
      return;
    }

    resultsEl.innerHTML = results.map(r => `
      <div class="search-result">
        <div class="result-date">${esc(r.date)}</div>
        <a href="${esc(r.url)}" class="result-title">${esc(r.title)}</a>
        <p class="result-abstract">${esc(r.abstract)}</p>
        <div class="card-tags">
          ${r.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  /* Minimal HTML escape — prevents XSS in rendered results */
  function esc(str) {
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g,  '&#x27;');
  }

  /* ── Event Listeners ───────────────────────────────────────── */
  form.addEventListener('submit', e => {
    e.preventDefault();
    render(search(input.value), input.value);
  });

  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (val.length > 1) {
      render(search(val), val);
    } else if (val === '') {
      resultsEl.innerHTML = '';
    }
  });
})();
