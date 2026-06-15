(function () {
  'use strict';

  const FEED_LIMIT = 3;

  const grid = document.getElementById('feed-grid');
  const btnPrev = document.getElementById('feed-prev');
  const btnNext = document.getElementById('feed-next');
  const queryInput = document.getElementById('feed-query');
  const status = document.getElementById('feed-status');

  if (!grid || !btnPrev || !btnNext || !queryInput || !status) return;

  let mode = 'recent';
  let page = 1;
  let hasNext = false;
  let query = '';
  let posts = [];

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  function render(items) {
    if (!items.length) {
      grid.innerHTML = '<p class="feed-empty">No log notes yet.</p>';
      status.textContent = '0 posts shown';
      return;
    }

    grid.innerHTML = items.map(function (post) {
      const tags = (post.tags || []).map(function (tag) {
        return '<span class="tag">' + esc(tag) + '</span>';
      }).join('');

      return [
        '<a href="log.html?slug=', esc(post.slug), '" class="entry-card">',
          '<figure class="card-media" aria-hidden="true">',
            '<img src="', esc(post.coverImage || '/assets/Backgrounds/EntryHeaderBackground.png'), '" alt="">',
          '</figure>',
          '<div class="card-content">',
            '<div class="card-meta">',
              '<span class="card-date">', esc((post.createdAt || '').slice(0, 10)), '</span>',
              '<span class="tag">', esc(post.tags?.[0] || 'entry'), '</span>',
            '</div>',
            '<span class="card-title">', esc(post.title), '</span>',
            '<span class="card-abstract">', esc(post.summary || ''), '</span>',
            '<div class="card-tags">', tags, '</div>',
            '<span class="card-read-more">Read entry &rarr; &nbsp; ',
              '<span class="meta-value">', Number(post.likeCount || 0), ' likes · ', Number(post.commentCount || 0), ' comments</span>',
            '</span>',
          '</div>',
        '</a>'
      ].join('');
    }).join('');

    status.textContent = items.length + ' posts shown';
  }

  function loadFeed() {
    const url = idlApiUrl('/api/articles?limit=' + FEED_LIMIT + '&page=' + page + '&mode=' + mode + '&q=' + encodeURIComponent(query));

    fetch(url)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed feed');
        return res.json();
      })
      .then(function (data) {
        posts = Array.isArray(data.items) ? data.items : [];
        hasNext = Boolean(data.hasNext);
        btnPrev.disabled = page <= 1;
        btnNext.disabled = !hasNext;
        render(posts);
      })
      .catch(function () {
        grid.innerHTML = '<p class="feed-empty">Feed unavailable right now.</p>';
        status.textContent = 'feed error';
      });
  }

  btnPrev.addEventListener('click', function () {
    if (page <= 1) return;
    page -= 1;
    loadFeed();
  });

  btnNext.addEventListener('click', function () {
    if (!hasNext) return;
    page += 1;
    loadFeed();
  });

  queryInput.addEventListener('input', function () {
    query = queryInput.value.trim();
    page = 1;
    loadFeed();
  });

  loadFeed();
})();
