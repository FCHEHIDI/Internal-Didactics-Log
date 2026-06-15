(function () {
  'use strict';

  let selectedId = '';

  const loginForm = document.getElementById('admin-login-form');
  const loginStatus = document.getElementById('admin-login-status');
  const panel = document.getElementById('admin-panel');
  const logoutBtn = document.getElementById('admin-logout');
  const sessionStatus = document.getElementById('admin-session-status');

  const form = document.getElementById('article-form');
  const articleId = document.getElementById('article-id');
  const title = document.getElementById('article-title');
  const slug = document.getElementById('article-slug');
  const published = document.getElementById('article-published');
  const summary = document.getElementById('article-summary');
  const content = document.getElementById('article-content');
  const cover = document.getElementById('article-cover');
  const upload = document.getElementById('article-upload');
  const video = document.getElementById('article-video');
  const tags = document.getElementById('article-tags');
  const links = document.getElementById('article-links');
  const status = document.getElementById('article-status');

  const resetBtn = document.getElementById('article-reset');
  const deleteBtn = document.getElementById('article-delete');

  const articlesList = document.getElementById('admin-articles-list');
  const messagesList = document.getElementById('admin-messages-list');
  const commentsList = document.getElementById('admin-comments-list');

  function jsonHeaders() {
    return { 'Content-Type': 'application/json' };
  }

  function parseLinks(value) {
    return String(value || '')
      .split('\n')
      .map(function (line) { return line.trim(); })
      .filter(Boolean)
      .map(function (line) {
        const split = line.split('|');
        return {
          label: (split[0] || '').trim(),
          url: (split[1] || '').trim()
        };
      })
      .filter(function (entry) { return entry.label && entry.url; });
  }

  function fillForm(item) {
    selectedId = item.id;
    articleId.value = item.id;
    title.value = item.title || '';
    slug.value = item.slug || '';
    published.value = item.published ? 'true' : 'false';
    summary.value = item.summary || '';
    content.value = item.contentHtml || '';
    cover.value = item.coverImage || '';
    video.value = item.mediaVideo || '';
    tags.value = (item.tags || []).join(', ');
    links.value = (item.links || []).map(function (l) {
      return (l.label || '') + '|' + (l.url || '');
    }).join('\n');
  }

  function clearForm() {
    selectedId = '';
    form.reset();
    articleId.value = '';
    published.value = 'true';
  }

  function loadArticles() {
    return fetch(idlApiUrl('/api/admin/articles'))
      .then(function (res) {
        if (!res.ok) throw new Error('Unauthorized');
        return res.json();
      })
      .then(function (items) {
        articlesList.innerHTML = items.map(function (item) {
          return [
            '<button type="button" class="admin-item" data-article-id="', item.id, '">',
              '<div class="admin-item-head">',
                '<strong>', item.title, '</strong>',
                '<span class="meta-value">', (item.createdAt || '').slice(0, 10), '</span>',
              '</div>',
              '<p>', item.summary || '', '</p>',
              '<p class="meta-value">', item.slug, ' · ', item.published ? 'published' : 'draft', ' · ', Number(item.likeCount || 0), ' likes</p>',
            '</button>'
          ].join('');
        }).join('');

        articlesList.querySelectorAll('[data-article-id]').forEach(function (button, index) {
          button.addEventListener('click', function () {
            fillForm(items[index]);
          });
        });
      });
  }

  function loadMessages() {
    return fetch(idlApiUrl('/api/admin/messages'))
      .then(function (res) { return res.json(); })
      .then(function (items) {
        messagesList.innerHTML = items.map(function (item) {
          return [
            '<article class="admin-item">',
              '<div class="admin-item-head">',
                '<strong>', item.name, '</strong>',
                '<span class="meta-value">', (item.createdAt || '').slice(0, 16).replace('T', ' '), '</span>',
              '</div>',
              '<p class="meta-value">', item.email, '</p>',
              '<p>', item.message, '</p>',
            '</article>'
          ].join('');
        }).join('') || '<p class="feed-empty">No messages.</p>';
      });
  }

  function loadComments() {
    return fetch(idlApiUrl('/api/admin/comments'))
      .then(function (res) { return res.json(); })
      .then(function (items) {
        commentsList.innerHTML = items.map(function (item) {
          return [
            '<article class="admin-item">',
              '<div class="admin-item-head">',
                '<strong>', item.name, '</strong>',
                '<span class="meta-value">', (item.createdAt || '').slice(0, 16).replace('T', ' '), '</span>',
              '</div>',
              '<p>', item.content, '</p>',
              '<button class="feed-btn" type="button" data-comment-id="', item.id, '">Delete</button>',
            '</article>'
          ].join('');
        }).join('') || '<p class="feed-empty">No comments.</p>';

        commentsList.querySelectorAll('[data-comment-id]').forEach(function (button) {
          button.addEventListener('click', function () {
            const commentId = button.getAttribute('data-comment-id');
            fetch('/api/admin/comments/' + encodeURIComponent(commentId), {
              method: 'DELETE'
            }).then(function () {
              loadComments();
            });
          });
        });
      });
  }

  function loadAll() {
    return Promise.all([loadArticles(), loadMessages(), loadComments()]);
  }

  function unlockPanel() {
    panel.hidden = false;
    loginForm.parentElement.hidden = true;
    loadAll().catch(function () {
      loginStatus.textContent = 'Session expired.';
      localStorage.removeItem(storageKey);
      panel.hidden = true;
      loginForm.parentElement.hidden = false;
    });
  }

  loginForm.addEventListener('submit', function (event) {
    event.preventDefault();
    const password = String(new FormData(loginForm).get('password') || '');

    fetch(idlApiUrl('/api/admin/login'), {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ password: password })
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Invalid credentials');
        return res.json();
      })
      .then(function (data) {
        if (!data.ok) throw new Error('Invalid');
        loginStatus.textContent = 'Authenticated.';
        unlockPanel();
      })
      .catch(function () {
        loginStatus.textContent = 'Invalid password.';
      });
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();

    const payload = {
      title: title.value.trim(),
      slug: slug.value.trim(),
      summary: summary.value.trim(),
      contentHtml: content.value.trim(),
      coverImage: cover.value.trim(),
      mediaVideo: video.value.trim(),
      tags: tags.value.split(',').map(function (v) { return v.trim(); }).filter(Boolean),
      links: parseLinks(links.value),
      published: published.value === 'true'
    };

    const method = selectedId ? 'PUT' : 'POST';
    const url = selectedId ? '/api/admin/articles/' + encodeURIComponent(selectedId) : '/api/admin/articles';

    fetch(idlApiUrl(url), {
      method: method,
      headers: jsonHeaders(),
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Save failed');
        return res.json();
      })
      .then(function () {
        status.textContent = 'Saved.';
        clearForm();
        loadAll();
      })
      .catch(function () {
        status.textContent = 'Unable to save article.';
      });
  });

  resetBtn.addEventListener('click', function () {
    clearForm();
    status.textContent = 'New article mode.';
  });

  upload.addEventListener('change', function () {
    const file = upload.files && upload.files[0];
    if (!file) return;

    const data = new FormData();
    data.append('file', file);

    fetch(idlApiUrl('/api/admin/upload'), {
      method: 'POST',
      body: data
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Upload failed');
        return res.json();
      })
      .then(function (result) {
        if (String(file.type || '').startsWith('video/')) {
          video.value = result.url;
        } else {
          cover.value = result.url;
        }
        status.textContent = 'Upload complete.';
      })
      .catch(function () {
        status.textContent = 'Upload failed.';
      });
  });

  deleteBtn.addEventListener('click', function () {
    if (!selectedId) {
      status.textContent = 'Select an article first.';
      return;
    }

    fetch(idlApiUrl('/api/admin/articles/' + encodeURIComponent(selectedId)), {
      method: 'DELETE'
    })
      .then(function (res) {
        if (!res.ok) throw new Error('Delete failed');
      })
      .then(function () {
        status.textContent = 'Deleted.';
        clearForm();
        loadAll();
      })
      .catch(function () {
        status.textContent = 'Unable to delete article.';
      });
  });

  logoutBtn.addEventListener('click', function () {
    fetch(idlApiUrl('/api/admin/logout'), {
      method: 'POST'
    }).then(function () {
      sessionStatus.textContent = 'Logged out.';
      panel.hidden = true;
      loginForm.parentElement.hidden = false;
    });
  });

  fetch(idlApiUrl('/api/admin/me'))
    .then(function (res) {
      if (!res.ok) throw new Error('No session');
      return res.json();
    })
    .then(function () {
      unlockPanel();
    })
    .catch(function () {
      panel.hidden = true;
    });
})();
