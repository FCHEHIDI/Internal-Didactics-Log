const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Firestore, FieldValue } = require('@google-cloud/firestore');

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

function normalizeArticle(payload, existing = {}) {
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

function articleView(article, comments) {
  return {
    ...article,
    likeCount: Number(article.likeCount || 0),
    commentCount: comments.length
  };
}

class JsonStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.ensure();
  }

  ensure() {
    if (!fs.existsSync(this.filePath)) {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify({ articles: [], comments: [], messages: [] }, null, 2), 'utf8');
    }
  }

  read() {
    this.ensure();
    return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
  }

  write(store) {
    fs.writeFileSync(this.filePath, JSON.stringify(store, null, 2), 'utf8');
  }

  async listArticles() {
    const store = this.read();
    return store.articles.slice().sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  }

  async getArticleBySlug(slug) {
    const store = this.read();
    return store.articles.find(a => a.slug === slug && a.published) || null;
  }

  async getArticleById(id) {
    const store = this.read();
    return store.articles.find(a => a.id === id) || null;
  }

  async getCommentsForArticle(articleId) {
    const store = this.read();
    return store.comments.filter(c => c.articleId === articleId && c.approved !== false).sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  }

  async listComments() {
    const store = this.read();
    return store.comments.slice().sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  }

  async listMessages() {
    const store = this.read();
    return store.messages.slice().sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  }

  async createArticle(payload) {
    const store = this.read();
    const normalized = normalizeArticle(payload);
    if (store.articles.some(a => a.slug === normalized.slug)) {
      const error = new Error('slug already exists');
      error.statusCode = 409;
      throw error;
    }

    const article = {
      id: crypto.randomUUID(),
      ...normalized,
      createdAt: new Date().toISOString(),
      likeCount: 0
    };
    store.articles.push(article);
    this.write(store);
    return article;
  }

  async updateArticle(id, payload) {
    const store = this.read();
    const article = store.articles.find(a => a.id === id);
    if (!article) return null;
    const update = normalizeArticle(payload, article);
    if (store.articles.some(a => a.slug === update.slug && a.id !== article.id)) {
      const error = new Error('slug already exists');
      error.statusCode = 409;
      throw error;
    }
    Object.assign(article, update);
    this.write(store);
    return article;
  }

  async deleteArticle(id) {
    const store = this.read();
    const index = store.articles.findIndex(a => a.id === id);
    if (index < 0) return false;
    const [removed] = store.articles.splice(index, 1);
    store.comments = store.comments.filter(c => c.articleId !== removed.id);
    this.write(store);
    return true;
  }

  async incrementLike(slug) {
    const store = this.read();
    const article = store.articles.find(a => a.slug === slug && a.published);
    if (!article) return null;
    article.likeCount = Number(article.likeCount || 0) + 1;
    article.updatedAt = new Date().toISOString();
    this.write(store);
    return article.likeCount;
  }

  async addComment(slug, payload) {
    const store = this.read();
    const article = store.articles.find(a => a.slug === slug && a.published);
    if (!article) return null;
    const name = String(payload.name || '').trim();
    const content = String(payload.content || '').trim();
    const comment = {
      id: crypto.randomUUID(),
      articleId: article.id,
      name,
      content,
      approved: true,
      createdAt: new Date().toISOString()
    };
    store.comments.push(comment);
    this.write(store);
    return comment;
  }

  async addMessage(payload) {
    const store = this.read();
    const message = {
      id: crypto.randomUUID(),
      name: String(payload.name || '').trim(),
      email: String(payload.email || '').trim(),
      message: String(payload.message || '').trim(),
      createdAt: new Date().toISOString(),
      handled: false
    };
    store.messages.push(message);
    this.write(store);
    return message;
  }

  async deleteComment(id) {
    const store = this.read();
    const index = store.comments.findIndex(c => c.id === id);
    if (index < 0) return false;
    store.comments.splice(index, 1);
    this.write(store);
    return true;
  }

  async markMessageHandled(id, handled) {
    const store = this.read();
    const message = store.messages.find(m => m.id === id);
    if (!message) return null;
    message.handled = Boolean(handled);
    this.write(store);
    return message;
  }
}

class FirestoreStore {
  constructor() {
    this.db = new Firestore({ projectId: process.env.FIRESTORE_PROJECT_ID || undefined });
    this.articles = this.db.collection('articles');
    this.comments = this.db.collection('comments');
    this.messages = this.db.collection('messages');
  }

  async listArticles() {
    const snap = await this.articles.get();
    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => Date.parse(b.createdAt || '') - Date.parse(a.createdAt || ''));
  }

  async getArticleBySlug(slug) {
    const snap = await this.articles.where('slug', '==', slug).where('published', '==', true).limit(1).get();
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  }

  async getArticleById(id) {
    const doc = await this.articles.doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async getCommentsForArticle(articleId) {
    const snap = await this.comments.where('articleId', '==', articleId).get();
    return snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(comment => comment.approved === true)
      .sort((a, b) => Date.parse(a.createdAt || '') - Date.parse(b.createdAt || ''));
  }

  async listComments() {
    const snap = await this.comments.orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async listMessages() {
    const snap = await this.messages.orderBy('createdAt', 'desc').get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async createArticle(payload) {
    const normalized = normalizeArticle(payload);
    const existing = await this.getArticleBySlug(normalized.slug);
    if (existing) {
      const error = new Error('slug already exists');
      error.statusCode = 409;
      throw error;
    }

    const article = {
      ...normalized,
      createdAt: new Date().toISOString(),
      likeCount: 0
    };

    const ref = await this.articles.add(article);
    return { id: ref.id, ...article };
  }

  async updateArticle(id, payload) {
    const doc = this.articles.doc(id);
    const snap = await doc.get();
    if (!snap.exists) return null;

    const current = { id: snap.id, ...snap.data() };
    const update = normalizeArticle(payload, current);
    const existing = await this.getArticleBySlug(update.slug);
    if (existing && existing.id !== id) {
      const error = new Error('slug already exists');
      error.statusCode = 409;
      throw error;
    }

    await doc.set({ ...current, ...update }, { merge: true });
    return { ...current, ...update };
  }

  async deleteArticle(id) {
    const doc = this.articles.doc(id);
    const snap = await doc.get();
    if (!snap.exists) return false;

    const batch = this.db.batch();
    batch.delete(doc);
    const commentsSnap = await this.comments.where('articleId', '==', id).get();
    commentsSnap.docs.forEach(commentDoc => batch.delete(commentDoc.ref));
    await batch.commit();
    return true;
  }

  async incrementLike(slug) {
    const snap = await this.articles.where('slug', '==', slug).where('published', '==', true).limit(1).get();
    if (snap.empty) return null;
    const ref = snap.docs[0].ref;
    await ref.update({ likeCount: FieldValue.increment(1), updatedAt: new Date().toISOString() });
    const updated = await ref.get();
    return Number(updated.data().likeCount || 0);
  }

  async addComment(slug, payload) {
    const article = await this.getArticleBySlug(slug);
    if (!article) return null;
    const name = String(payload.name || '').trim();
    const content = String(payload.content || '').trim();
    const comment = {
      articleId: article.id,
      name,
      content,
      approved: true,
      createdAt: new Date().toISOString()
    };
    const ref = await this.comments.add(comment);
    return { id: ref.id, ...comment };
  }

  async addMessage(payload) {
    const message = {
      name: String(payload.name || '').trim(),
      email: String(payload.email || '').trim(),
      message: String(payload.message || '').trim(),
      createdAt: new Date().toISOString(),
      handled: false
    };
    const ref = await this.messages.add(message);
    return { id: ref.id, ...message };
  }

  async deleteComment(id) {
    const doc = await this.comments.doc(id).get();
    if (!doc.exists) return false;
    await this.comments.doc(id).delete();
    return true;
  }

  async markMessageHandled(id, handled) {
    const doc = await this.messages.doc(id).get();
    if (!doc.exists) return null;
    await this.messages.doc(id).update({ handled: Boolean(handled) });
    const updated = await this.messages.doc(id).get();
    return { id: updated.id, ...updated.data() };
  }

  async ping() {
    await this.db.listCollections();
    return true;
  }
}

function createStore() {
  const backend = String(process.env.DATA_BACKEND || 'json').toLowerCase();
  if (backend === 'json') {
    const filePath = process.env.LOCAL_DATA_FILE || path.join(process.cwd(), 'data', 'store.json');
    return new JsonStore(filePath);
  }
  return new FirestoreStore();
}

module.exports = {
  createStore,
  articleView
};
