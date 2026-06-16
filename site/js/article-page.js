(function () {
  'use strict';

  const params = new URLSearchParams(window.location.search);
  let slug = params.get('slug');

  const titleEl = document.getElementById('article-title');
  const dateEl = document.getElementById('article-date');
  const summaryEl = document.getElementById('article-summary');
  const coverEl = document.getElementById('article-cover');
  const contentEl = document.getElementById('article-content');
  const linksEl = document.getElementById('article-links');
  const tagsEl = document.getElementById('article-tags');
  const likesEl = document.getElementById('like-count');
  const likeBtn = document.getElementById('like-btn');
  const commentsList = document.getElementById('comments-list');
  const commentForm = document.getElementById('comment-form');
  const commentStatus = document.getElementById('comment-status');

  const articleSection = document.getElementById('article-section');
  const feedSection = document.getElementById('feed-section');

  // ── Feed / Article routing ──────────────────────────────────────────────
  // If no ?slug= in URL → show feed (all entries), public-home.js handles loading.
  // If ?slug= present   → show article viewer (existing behaviour).
  if (!slug) {
    if (feedSection) feedSection.style.display = '';
    if (articleSection) articleSection.style.display = 'none';
    if (titleEl) titleEl.textContent = 'Log';
    if (dateEl) dateEl.textContent = 'All entries';
    return;
  }

  // Article mode: hide feed, show article
  if (feedSection) feedSection.style.display = 'none';
  if (articleSection) articleSection.style.display = '';

  function setNoArticleState() {
    document.title = 'Log — Internal Didactics Log';
    titleEl.textContent = 'No log note yet';
    dateEl.textContent = 'Published';
    summaryEl.textContent = 'Create a scientific note from the admin section to display it here.';
    contentEl.innerHTML = '<p class="feed-empty">No log note is available right now.</p>';
    linksEl.innerHTML = '';
    tagsEl.innerHTML = '';
    commentsList.innerHTML = '';
    likesEl.textContent = '0';
    likeBtn.disabled = true;
    likeBtn.style.opacity = '0.6';
    if (commentForm) {
      commentForm.style.display = 'none';
    }
  }

  function esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  function renderComments(comments) {
    if (!comments.length) {
      commentsList.innerHTML = '<p class="feed-empty">No comments yet.</p>';
      return;
    }

    commentsList.innerHTML = comments.map(function (item) {
      return [
        '<article class="admin-item">',
          '<div class="admin-item-head">',
            '<strong>', esc(item.name), '</strong>',
            '<span class="meta-value">', esc((item.createdAt || '').slice(0, 16).replace('T', ' ')), '</span>',
          '</div>',
          '<p>', esc(item.content), '</p>',
        '</article>'
      ].join('');
    }).join('');
  }

  function loadArticle() {
    fetch(idlApiUrl('/api/articles/' + encodeURIComponent(slug)))
      .then(function (res) {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(function (article) {
        document.title = article.title + ' — Internal Didactics Log';
        titleEl.textContent = article.title;
        dateEl.textContent = (article.createdAt || '').slice(0, 10);
        summaryEl.textContent = article.summary || '';
        likesEl.textContent = String(article.likeCount || 0);

        if (article.coverImage) {
          coverEl.src = article.coverImage;
        }

        contentEl.innerHTML = article.contentHtml || '<p class="feed-empty">No content.</p>';

        const tags = Array.isArray(article.tags) ? article.tags : [];
        tagsEl.innerHTML = tags.map(function (tag) {
          return '<span class="tag">' + esc(tag) + '</span>';
        }).join('');

        const links = Array.isArray(article.links) ? article.links : [];
        linksEl.innerHTML = links.map(function (lnk) {
          return [
            '<a class="entry-card" href="', esc(lnk.url), '" target="_blank" rel="noopener">',
              '<div class="card-content">',
                '<span class="card-title">', esc(lnk.label), '</span>',
                '<span class="card-read-more">Open link &rarr;</span>',
              '</div>',
            '</a>'
          ].join('');
        }).join('');

        renderComments(Array.isArray(article.comments) ? article.comments : []);
      })
      .catch(function () {
        titleEl.textContent = 'Log not found';
        contentEl.innerHTML = '<p class="feed-empty">This log note is not available.</p>';
      });
  }

  likeBtn.addEventListener('click', function () {
    fetch(idlApiUrl('/api/articles/' + encodeURIComponent(slug) + '/like'), { method: 'POST' })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        likesEl.textContent = String(data.likeCount || 0);
      });
  });

  commentForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const formData = new FormData(commentForm);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      content: String(formData.get('content') || '').trim()
    };

    fetch(idlApiUrl('/api/articles/' + encodeURIComponent(slug) + '/comments'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Comment failed');
        commentForm.reset();
        commentStatus.textContent = 'Comment posted.';
        loadArticle();
      })
      .catch(function () {
        commentStatus.textContent = 'Unable to post comment.';
      });
  });

  loadArticle();
})();
