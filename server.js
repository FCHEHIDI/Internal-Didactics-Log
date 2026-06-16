const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password';
const DATA_FILE = path.join(__dirname, 'site', 'data', 'store.json');
const UPLOAD_DIR = path.join(__dirname, 'site', 'uploads');
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const MAX_PAGE_SIZE = 24;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, 'site')));
app.use('/assets', express.static(path.join(__dirname, '.assets')));

const rateState = new Map();

function ensureUploads() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

ensureUploads();

const upload = multer({
  storage: multer.diskStorage({
    destination: function (_req, _file, cb) {
      cb(null, UPLOAD_DIR);
    },
    filename: function (_req, file, cb) {
      const ext = path.extname(file.originalname || '').toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
    }
  }),
  limits: {
    fileSize: 15 * 1024 * 1024
  }
});

function ensureStore() {
  if (!fs.existsSync(DATA_FILE)) {
    const seed = {
      articles: [],
      comments: [],
      messages: []
    };
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf8');
  }
}

function readStore() {
  ensureStore();
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeStore(store) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), 'utf8');
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(chunk => {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    const idx = trimmed.indexOf('=');
    if (idx < 0) return;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    out[key] = decodeURIComponent(value);
  });
  return out;
}

function setSessionCookie(res, token) {
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  res.setHeader('Set-Cookie', `idl_admin_sid=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}`);
}

function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', 'idl_admin_sid=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
}

// ---------------------------------------------------------------------------
// Stateless HMAC session tokens — survives server restarts and cold starts.
// Token format: `${issuedAt}.${hmac-sha256-hex}`
// Identical approach to gcp/backend/src/server.js.
// ---------------------------------------------------------------------------

function createSessionToken() {
  const issuedAt = String(Date.now());
  const sig = crypto.createHmac('sha256', ADMIN_PASSWORD).update(issuedAt).digest('hex');
  return `${issuedAt}.${sig}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot < 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = crypto.createHmac('sha256', ADMIN_PASSWORD).update(payload).digest('hex');
  if (sig.length !== expected.length) return false;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return false;
  } catch (_) {
    return false;
  }
  const issuedAt = Number(payload);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > SESSION_TTL_MS) return false;
  return true;
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function toSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeArticle(payload, existing = {}) {
  const title = String(payload.title || existing.title || '').trim();
  const slug = slugify(payload.slug || title || existing.slug || 'article');
  const summary = String(payload.summary || existing.summary || '').trim();
  const contentHtml = String(payload.contentHtml || existing.contentHtml || '').trim();
  const coverImage = String(payload.coverImage || existing.coverImage || '').trim();
  const mediaVideo = String(payload.mediaVideo || existing.mediaVideo || '').trim();
  const tags = toSafeArray(payload.tags || existing.tags).map(String).map(v => v.trim()).filter(Boolean);
  const links = toSafeArray(payload.links || existing.links)
    .map(item => ({
      label: String(item.label || '').trim(),
      url: String(item.url || '').trim()
    }))
    .filter(item => item.label && item.url);

  return {
    title,
    slug,
    summary,
    contentHtml,
    coverImage,
    mediaVideo,
    tags,
    links,
    published: Boolean(payload.published ?? existing.published),
    updatedAt: new Date().toISOString()
  };
}

function articleView(article, store) {
  const comments = store.comments.filter(c => c.articleId === article.id && c.approved !== false);
  return {
    ...article,
    likeCount: Number(article.likeCount || 0),
    commentCount: comments.length
  };
}

function checkRateLimit(key, limit, windowMs) {
  const now = Date.now();
  const item = rateState.get(key) || { count: 0, resetAt: now + windowMs };

  if (now > item.resetAt) {
    item.count = 0;
    item.resetAt = now + windowMs;
  }

  item.count += 1;
  rateState.set(key, item);
  return item.count <= limit;
}

function antiSpam(limit, windowMs) {
  return function (req, res, next) {
    const key = `${req.ip}:${req.path}`;
    if (!checkRateLimit(key, limit, windowMs)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const honey = String(req.body?.website || '').trim();
    if (honey) {
      return res.status(400).json({ error: 'Spam detected' });
    }

    next();
  };
}

function authRequired(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies.idl_admin_sid || '';
  if (!verifySessionToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password || '');
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  setSessionCookie(res, createSessionToken());
  return res.json({ ok: true });
});

app.post('/api/admin/logout', authRequired, (_req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

app.get('/api/admin/me', authRequired, (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/articles', (req, res) => {
  const store = readStore();
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit || 3)));
  const page = Math.max(1, Number(req.query.page || 1));
  const mode = req.query.mode === 'random' ? 'random' : 'recent';
  const query = String(req.query.q || '').trim().toLowerCase();

  let published = store.articles
    .filter(a => a.published)
    .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));

  if (query) {
    published = published.filter(item => {
      const title = String(item.title || '').toLowerCase();
      const summary = String(item.summary || '').toLowerCase();
      const tags = Array.isArray(item.tags) ? item.tags.join(' ').toLowerCase() : '';
      return title.includes(query) || summary.includes(query) || tags.includes(query);
    });
  }

  const prepared = mode === 'random'
    ? published
        .map(item => ({ item, score: Math.random() }))
        .sort((a, b) => a.score - b.score)
        .map(x => x.item)
    : published;

  const start = (page - 1) * limit;
  const output = prepared.slice(start, start + limit).map(a => articleView(a, store));

  res.json({
    items: output,
    page,
    limit,
    total: prepared.length,
    hasNext: start + limit < prepared.length
  });
});

app.get('/api/articles/:slug', (req, res) => {
  const store = readStore();
  const article = store.articles.find(a => a.slug === req.params.slug && a.published);

  if (!article) return res.status(404).json({ error: 'Article not found' });

  const comments = store.comments
    .filter(c => c.articleId === article.id && c.approved !== false)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));

  res.json({
    ...articleView(article, store),
    comments
  });
});

app.post('/api/articles/:slug/like', (req, res) => {
  const store = readStore();
  const article = store.articles.find(a => a.slug === req.params.slug && a.published);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  article.likeCount = Number(article.likeCount || 0) + 1;
  article.updatedAt = new Date().toISOString();
  writeStore(store);

  res.json({ likeCount: article.likeCount });
});

app.post('/api/articles/:slug/comments', antiSpam(5, 60_000), (req, res) => {
  const store = readStore();
  const article = store.articles.find(a => a.slug === req.params.slug && a.published);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const name = String(req.body?.name || '').trim();
  const content = String(req.body?.content || '').trim();

  if (!name || !content) {
    return res.status(400).json({ error: 'Name and comment are required' });
  }

  if (name.length > 120 || content.length > 2000) {
    return res.status(400).json({ error: 'Input too long' });
  }

  store.comments.push({
    id: crypto.randomUUID(),
    articleId: article.id,
    name,
    content,
    approved: true,
    createdAt: new Date().toISOString()
  });

  writeStore(store);
  res.status(201).json({ ok: true });
});

app.post('/api/messages', antiSpam(4, 60_000), (req, res) => {
  const store = readStore();
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required' });
  }

  if (name.length > 120 || email.length > 180 || message.length > 4000) {
    return res.status(400).json({ error: 'Input too long' });
  }

  store.messages.push({
    id: crypto.randomUUID(),
    name,
    email,
    message,
    createdAt: new Date().toISOString(),
    handled: false
  });

  writeStore(store);
  res.status(201).json({ ok: true });
});

app.post('/api/admin/upload', authRequired, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Missing file' });
  }

  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname
  });
});

app.get('/api/admin/articles', authRequired, (req, res) => {
  const store = readStore();
  const items = store.articles
    .slice()
    .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  res.json(items.map(a => articleView(a, store)));
});

app.post('/api/admin/articles', authRequired, (req, res) => {
  const store = readStore();
  const payload = sanitizeArticle(req.body);

  if (!payload.title || !payload.summary || !payload.contentHtml) {
    return res.status(400).json({ error: 'title, summary and contentHtml are required' });
  }

  if (store.articles.some(a => a.slug === payload.slug)) {
    return res.status(409).json({ error: 'slug already exists' });
  }

  const now = new Date().toISOString();
  const article = {
    id: crypto.randomUUID(),
    ...payload,
    createdAt: now,
    likeCount: 0
  };

  store.articles.push(article);
  writeStore(store);
  res.status(201).json(article);
});

app.put('/api/admin/articles/:id', authRequired, (req, res) => {
  const store = readStore();
  const article = store.articles.find(a => a.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });

  const update = sanitizeArticle(req.body, article);

  if (!update.title || !update.summary || !update.contentHtml) {
    return res.status(400).json({ error: 'title, summary and contentHtml are required' });
  }

  if (store.articles.some(a => a.slug === update.slug && a.id !== article.id)) {
    return res.status(409).json({ error: 'slug already exists' });
  }

  Object.assign(article, update);
  writeStore(store);
  res.json(article);
});

app.delete('/api/admin/articles/:id', authRequired, (req, res) => {
  const store = readStore();
  const index = store.articles.findIndex(a => a.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Article not found' });

  const [removed] = store.articles.splice(index, 1);
  store.comments = store.comments.filter(c => c.articleId !== removed.id);
  writeStore(store);
  res.json({ ok: true });
});

app.get('/api/admin/messages', authRequired, (req, res) => {
  const store = readStore();
  const items = store.messages
    .slice()
    .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  res.json(items);
});

app.patch('/api/admin/messages/:id/handled', authRequired, (req, res) => {
  const store = readStore();
  const message = store.messages.find(m => m.id === req.params.id);
  if (!message) return res.status(404).json({ error: 'Message not found' });

  message.handled = Boolean(req.body?.handled);
  writeStore(store);
  res.json(message);
});

app.delete('/api/admin/comments/:id', authRequired, (req, res) => {
  const store = readStore();
  const index = store.comments.findIndex(c => c.id === req.params.id);
  if (index < 0) return res.status(404).json({ error: 'Comment not found' });

  store.comments.splice(index, 1);
  writeStore(store);
  res.json({ ok: true });
});

app.get('/api/admin/comments', authRequired, (req, res) => {
  const store = readStore();
  const items = store.comments
    .slice()
    .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  res.json(items);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'site', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`IDL server running on http://localhost:${PORT}`);
});
