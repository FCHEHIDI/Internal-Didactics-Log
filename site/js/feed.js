(function () {
  'use strict';

  const FEED_LIMIT = 3;
  const FEED_FILE = 'data/posts.json';
  const FALLBACK_COVER = '/assets/Backgrounds/EntryHeaderBackground.png';

  const grid = document.getElementById('feed-grid');
  const btnRecent = document.getElementById('feed-mode-recent');
  const btnRandom = document.getElementById('feed-mode-random');
  const status = document.getElementById('feed-status');

  if (!grid || !btnRecent || !btnRandom || !status) return;

  const queryMode = new URLSearchParams(window.location.search).get('feed');
  let mode = queryMode === 'random' ? 'random' : 'recent';
  let posts = [];

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  function toDateValue(input) {
    const value = Date.parse(input);
    return Number.isNaN(value) ? 0 : value;
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  function normalize(post) {
    return {
      title: post.title || 'Untitled',
      date: post.date || '',
      summary: post.summary || '',
      category: post.category || 'notes',
      tags: Array.isArray(post.tags) ? post.tags : [],
      url: post.url || '#',
      cover: post.cover || FALLBACK_COVER,
    };
  }

  function render(items) {
    if (items.length === 0) {
      grid.innerHTML = '<p class="feed-empty">No entries published yet.</p>';
      status.textContent = '0 post loaded';
      return;
    }

    grid.innerHTML = items.map(function (raw) {
      const post = normalize(raw);
      const tags = post.tags.map(function (tag) {
        return '<span class="tag">' + esc(tag) + '</span>';
      }).join('');

      return [
        '<a href="', esc(post.url), '" class="entry-card">',
          '<figure class="card-media" aria-hidden="true">',
            '<img src="', esc(post.cover), '" alt="">',
          '</figure>',
          '<div class="card-content">',
            '<div class="card-meta">',
              '<span class="card-date">', esc(post.date), '</span>',
              '<span class="tag">', esc(post.category), '</span>',
            '</div>',
            '<span class="card-title">', esc(post.title), '</span>',
            '<span class="card-abstract">', esc(post.summary), '</span>',
            '<div class="card-tags">', tags, '</div>',
            '<span class="card-read-more">Read entry &rarr;</span>',
          '</div>',
        '</a>'
      ].join('');
    }).join('');

    status.textContent = items.length + ' posts shown (' + mode + ')';
  }

  function applyMode() {
    const prepared = posts.slice().sort(function (a, b) {
      return toDateValue(b.date) - toDateValue(a.date);
    });

    const selected = mode === 'random'
      ? shuffle(prepared).slice(0, FEED_LIMIT)
      : prepared.slice(0, FEED_LIMIT);

    btnRecent.classList.toggle('active', mode === 'recent');
    btnRandom.classList.toggle('active', mode === 'random');
    render(selected);
  }

  function setMode(next) {
    mode = next;
    applyMode();
  }

  btnRecent.addEventListener('click', function () {
    setMode('recent');
  });

  btnRandom.addEventListener('click', function () {
    setMode('random');
  });

  fetch(FEED_FILE)
    .then(function (res) {
      if (!res.ok) throw new Error('Failed to fetch feed data');
      return res.json();
    })
    .then(function (data) {
      posts = Array.isArray(data) ? data : [];
      applyMode();
    })
    .catch(function () {
      grid.innerHTML = '<p class="feed-empty">Unable to load feed data right now.</p>';
      status.textContent = 'feed load error';
    });
})();
