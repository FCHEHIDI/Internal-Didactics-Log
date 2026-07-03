const express = require('express');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const cors = require('cors');
const { Storage } = require('@google-cloud/storage');
const { createStore, articleView } = require('./storage');

const app = express();
const PORT = process.env.PORT || 8080;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'change-this-password';
const SESSION_TTL_MS = 1000 * 60 * 60 * 12;
const MAX_PAGE_SIZE = 24;
const PUBLIC_ASSET_BASE_URL = String(process.env.PUBLIC_ASSET_BASE_URL || '').replace(/\/+$/, '');
const CORS_ORIGIN = String(process.env.CORS_ORIGIN || '');
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || '';

const store = createStore();
const sessions = new Map();
const rateState = new Map();
const storage = new Storage();
const bucket = BUCKET_NAME ? storage.bucket(BUCKET_NAME) : null;

app.set('trust proxy', 1);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (!CORS_ORIGIN || CORS_ORIGIN === '*') return true;

  const allowedOrigins = CORS_ORIGIN.split(',').map(value => value.trim()).filter(Boolean);
  if (allowedOrigins.includes(origin)) return true;

  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
    if (hostname.endsWith('.vercel.app')) return true;
  } catch (_error) {
    return false;
  }

  return false;
}

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      return callback(null, origin || true);
    }
    return callback(new Error('CORS origin not allowed'));
  },
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }
});

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const out = {};
  header.split(';').forEach(chunk => {
    const trimmed = chunk.trim();
    if (!trimmed) return;
    const idx = trimmed.indexOf('=');
    if (idx < 0) return;
    out[trimmed.slice(0, idx)] = decodeURIComponent(trimmed.slice(idx + 1));
  });
  return out;
}

function isHttpsRequest(req) {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return req.secure || forwardedProto === 'https';
}

function setSessionCookie(req, res, token) {
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  const secureAttrs = isHttpsRequest(req)
    ? '; SameSite=None; Secure'
    : '; SameSite=Lax';
  res.setHeader('Set-Cookie', `idl_admin_sid=${encodeURIComponent(token)}; Path=/; HttpOnly${secureAttrs}; Max-Age=${maxAgeSec}`);
}

function clearSessionCookie(req, res) {
  const secureAttrs = isHttpsRequest(req)
    ? '; SameSite=None; Secure'
    : '; SameSite=Lax';
  res.setHeader('Set-Cookie', `idl_admin_sid=; Path=/; HttpOnly${secureAttrs}; Max-Age=0`);
}

function verifySessionToken(token) {
  if (!token) return false;
  const [issuedAtStr, signature] = token.split('.');
  if (!issuedAtStr || !signature) return false;
  const issuedAt = Number(issuedAtStr);
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > SESSION_TTL_MS) return false;
  const expected = crypto.createHmac('sha256', ADMIN_PASSWORD).update(issuedAtStr).digest('hex');
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function createSessionToken() {
  const issuedAtStr = String(Date.now());
  const signature = crypto.createHmac('sha256', ADMIN_PASSWORD).update(issuedAtStr).digest('hex');
  return `${issuedAtStr}.${signature}`;
}

function authRequired(req, res, next) {
  const cookies = parseCookies(req);
  const token = cookies.idl_admin_sid || '';
  if (!verifySessionToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
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
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    const key = `${forwarded || req.ip}:${req.path}`;
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

function safeAssetUrl(fileName) {
  if (!PUBLIC_ASSET_BASE_URL) return '';
  const normalized = normalizePath(fileName);
  return `${PUBLIC_ASSET_BASE_URL}/${normalized}`;
}

function normalizePath(rawPath) {
  return String(rawPath || '').replace(/^\/+/, '');
}

function buildArticleResponse(article, comments) {
  return {
    ...articleView(article, comments),
    comments
  };
}

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/ready', async (_req, res) => {
  try {
    const articles = await store.listArticles();
    res.json({ ok: true, articles: articles.length, storage: bucket ? 'gcs' : 'none' });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'not ready' });
  }
});

app.post('/api/admin/login', antiSpam(10, 300_000), (req, res) => {
  const password = String(req.body?.password || '');
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  setSessionCookie(req, res, createSessionToken());
  return res.json({ ok: true });
});

app.post('/api/admin/logout', authRequired, (_req, res) => {
  clearSessionCookie(_req, res);
  return res.json({ ok: true });
});

app.get('/api/admin/me', authRequired, (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/articles', async (req, res, next) => {
  try {
    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(req.query.limit || 3)));
    const page = Math.max(1, Number(req.query.page || 1));
    const mode = req.query.mode === 'random' ? 'random' : 'recent';
    const query = String(req.query.q || '').trim().toLowerCase();

    let published = await store.listArticles();
    published = published.filter(a => a.published);

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
    const output = [];

    for (const article of prepared.slice(start, start + limit)) {
      const comments = await store.getCommentsForArticle(article.id);
      output.push(articleView(article, comments));
    }

    res.json({
      items: output,
      page,
      limit,
      total: prepared.length,
      hasNext: start + limit < prepared.length
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/articles/:slug', async (req, res, next) => {
  try {
    const article = await store.getArticleBySlug(req.params.slug);
    if (!article) return res.status(404).json({ error: 'Article not found' });

    const comments = await store.getCommentsForArticle(article.id);
    res.json(buildArticleResponse(article, comments));
  } catch (error) {
    next(error);
  }
});

app.post('/api/articles/:slug/like', antiSpam(10, 60_000), async (req, res, next) => {
  try {
    const likeCount = await store.incrementLike(req.params.slug);
    if (likeCount === null) return res.status(404).json({ error: 'Article not found' });
    res.json({ likeCount });
  } catch (error) {
    next(error);
  }
});

app.post('/api/articles/:slug/comments', antiSpam(5, 60_000), async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const content = String(req.body?.content || '').trim();

    if (!name || !content) {
      return res.status(400).json({ error: 'Name and comment are required' });
    }

    if (name.length > 120 || content.length > 2000) {
      return res.status(400).json({ error: 'Input too long' });
    }

    const comment = await store.addComment(req.params.slug, { name, content });
    if (!comment) return res.status(404).json({ error: 'Article not found' });
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/messages', antiSpam(4, 60_000), async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email and message are required' });
    }

    if (name.length > 120 || email.length > 180 || message.length > 4000) {
      return res.status(400).json({ error: 'Input too long' });
    }

    await store.addMessage({ name, email, message });
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/upload', authRequired, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Missing file' });
    }

    if (!bucket) {
      return res.status(500).json({ error: 'Cloud Storage bucket is not configured' });
    }

    const ext = path.extname(req.file.originalname || '').toLowerCase();
    const objectName = `uploads/${Date.now()}-${crypto.randomUUID()}${ext}`;
    const file = bucket.file(objectName);

    await file.save(req.file.buffer, {
      contentType: req.file.mimetype,
      resumable: false,
      metadata: {
        cacheControl: 'public, max-age=31536000'
      }
    });

    const url = safeAssetUrl(normalizePath(objectName));
    res.status(201).json({ url, originalName: req.file.originalname });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/articles', authRequired, async (_req, res, next) => {
  try {
    const items = await store.listArticles();
    const output = [];
    for (const article of items) {
      const comments = await store.getCommentsForArticle(article.id);
      output.push(articleView(article, comments));
    }
    res.json(output);
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/articles', authRequired, async (req, res, next) => {
  try {
    const payload = req.body || {};
    if (!payload.title || !payload.summary || !payload.contentHtml) {
      return res.status(400).json({ error: 'title, summary and contentHtml are required' });
    }

    const article = await store.createArticle(payload);
    res.status(201).json(article);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

app.put('/api/admin/articles/:id', authRequired, async (req, res, next) => {
  try {
    const updated = await store.updateArticle(req.params.id, req.body || {});
    if (!updated) return res.status(404).json({ error: 'Article not found' });
    if (!updated.title || !updated.summary || !updated.contentHtml) {
      return res.status(400).json({ error: 'title, summary and contentHtml are required' });
    }
    res.json(updated);
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

app.delete('/api/admin/articles/:id', authRequired, async (req, res, next) => {
  try {
    const removed = await store.deleteArticle(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Article not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/messages', authRequired, async (_req, res, next) => {
  try {
    res.json(await store.listMessages());
  } catch (error) {
    next(error);
  }
});

app.patch('/api/admin/messages/:id/handled', authRequired, async (req, res, next) => {
  try {
    const updated = await store.markMessageHandled(req.params.id, Boolean(req.body?.handled));
    if (!updated) return res.status(404).json({ error: 'Message not found' });
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/admin/comments/:id', authRequired, async (req, res, next) => {
  try {
    const removed = await store.deleteComment(req.params.id);
    if (!removed) return res.status(404).json({ error: 'Comment not found' });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/comments', authRequired, async (_req, res, next) => {
  try {
    res.json(await store.listComments());
  } catch (error) {
    next(error);
  }
});

app.get('/healthz', (_req, res) => {
  res.json({ ok: true, service: 'internal-didactics-log-backend' });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Cloud Run backend listening on ${PORT}`);
});
