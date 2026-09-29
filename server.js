const express = require('express');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const path = require('path');

const { API_KEY, DATABASE_URL, JWT_SECRET, ADMIN_EMAIL } = process.env;
if (!API_KEY || !DATABASE_URL || !JWT_SECRET) { console.error('API_KEY, DATABASE_URL ve JWT_SECRET tanımlanmalı.'); process.exit(1); }
const API_URL = 'https://onaylasms.com.tr/stubs/handler_api.php';
const COUNTRY = process.env.COUNTRY || '0';
const TIMEOUT_MIN = 20;

const PRODUCTS = {
  wa: { name: 'WhatsApp', price: 200 },
  tg: { name: 'Telegram', price: 200 },
  lg: { name: 'Letgo', price: 80 }
};

const db = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
const q = (t, p) => db.query(t, p);

async function init() {
  await q(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, hash TEXT NOT NULL, balance NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (balance >= 0), is_admin BOOLEAN DEFAULT FALSE)`);
  await q(`CREATE TABLE IF NOT EXISTS activations (id SERIAL PRIMARY KEY, user_id INT NOT NULL, ext_id TEXT NOT NULL, service TEXT NOT NULL, phone TEXT, price NUMERIC(10,2) NOT NULL, status TEXT NOT NULL DEFAULT 'waiting', code TEXT, created_at TIMESTAMPTZ DEFAULT now())`);
  await q(`CREATE TABLE IF NOT EXISTS deposits (id SERIAL PRIMARY KEY, user_id INT NOT NULL, sender TEXT NOT NULL, amount NUMERIC(10,2) NOT NULL, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ DEFAULT now())`);
}

const supplier = async (params) => String((await axios.get(API_URL, { params: { api_key: API_KEY, ...params }, timeout: 15000 })).data);

const app = express();
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '10kb' }));
app.use('/api/', rateLimit({ windowMs: 60000, max: 60 }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60000, max: 20 }));
app.use(express.static(path.join(__dirname, 'public')));

const wrap = (fn) => (req, res) => fn(req, res).catch((e) => { console.error(e.message); res.status(500).json({ message: 'Sunucu hatası. Biraz sonra tekrar deneyin.' }); });

function auth(req, res, next) {
  try {
    req.uid = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), JWT_SECRET).uid;
    next();
  } catch { res.status(401).json({ message: 'Oturum süresi doldu. Tekrar giriş yapın.' }); }
}
async function admin(req, res, next) {
  const { rows } = await q('SELECT is_admin FROM users WHERE id=$1', [req.uid]);
  if (!rows[0]?.is_admin) return res.status(403).json({ message: 'Yetkiniz yok.' });
  next();
}
const token = (uid) => jwt.sign({ uid }, JWT_SECRET, { expiresIn: '7d' });

app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 8)
    return res.status(400).json({ message: 'Ad, geçerli bir e-posta ve en az 8 karakterli şifre girin.' });
  const isAdmin = !!ADMIN_EMAIL && email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  try {
    const { rows } = await q('INSERT INTO users(email,name,hash,is_admin) VALUES($1,$2,$3,$4) RETURNING id', [email.toLowerCase(), name.trim().slice(0, 60), await bcrypt.hash(password, 10), isAdmin]);
    res.json({ token: token(rows[0].id) });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ message: 'Bu e-posta zaten kayıtlı. Giriş yapın.' });
    throw e;
  }
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await q('SELECT * FROM users WHERE email=$1', [String(email || '').toLowerCase()]);
  if (!rows[0] || !(await bcrypt.compare(String(password || ''), rows[0].hash)))
    return res.status(401).json({ message: 'E-posta veya şifre hatalı.' });
  res.json({ token: token(rows[0].id) });
}));

app.get('/api/me', auth, wrap(async (req, res) => {
  const { rows } = await q('SELECT name,email,balance,is_admin FROM users WHERE id=$1', [req.uid]);
  const acts = await q('SELECT id,service,phone,price,status,code,created_at FROM activations WHERE user_id=$1 ORDER BY id DESC LIMIT 10', [req.uid]);
  res.json({ ...rows[0], balance: Number(rows[0].balance), products: PRODUCTS, activations: acts.rows });
}));

app.post('/api/buy', auth, wrap(async (req, res) => {
  const p = PRODUCTS[req.body.service];
  if (!p) return res.status(400).json({ message: 'Geçersiz ürün.' });
  // Atomik düşüm: bakiye yetersizse satır güncellenmez
  const paid = await q('UPDATE users SET balance=balance-$1 WHERE id=$2 AND balance>=$1 RETURNING balance', [p.price, req.uid]);
  if (!paid.rows[0]) return res.status(400).json({ message: `Bakiye yetersiz. ${p.name} ${p.price} TL. Bakiye yükleyin.` });
  const refund = () => q('UPDATE users SET balance=balance+$1 WHERE id=$2', [p.price, req.uid]);
  try {
    const out = await supplier({ action: 'getNumber', service: req.body.service, country: COUNTRY });
    if (!out.startsWith('ACCESS_NUMBER')) { await refund(); return res.status(400).json({ message: 'Şu an bu ürün için numara yok. Ücret iade edildi.' }); }
    const [, extId, phone] = out.split(':');
    const a = await q('INSERT INTO activations(user_id,ext_id,service,phone,price) VALUES($1,$2,$3,$4,$5) RETURNING id', [req.uid, extId, req.body.service, phone, p.price]);
    res.json({ id: a.rows[0].id, phone, balance: Number(paid.rows[0].balance) });
  } catch (e) { await refund(); throw e; }
}));

// Bir kez iptal + iade (tekrar çağrılırsa çift iade olmaz)
async function cancelAndRefund(a) {
  const c = await q("UPDATE activations SET status='cancelled' WHERE id=$1 AND status='waiting' RETURNING id", [a.id]);
  if (!c.rows[0]) return false;
  await supplier({ action: 'setStatus', id: a.ext_id, status: 8 }).catch(() => {});
  await q('UPDATE users SET balance=balance+$1 WHERE id=$2', [a.price, a.user_id]);
  return true;
}

app.get('/api/check/:id', auth, wrap(async (req, res) => {
  const { rows } = await q('SELECT * FROM activations WHERE id=$1 AND user_id=$2', [Number(req.params.id) || 0, req.uid]);
  const a = rows[0];
  if (!a) return res.status(404).json({ message: 'İşlem bulunamadı.' });
  if (a.status !== 'waiting') return res.json({ status: a.status, code: a.code });
  const out = await supplier({ action: 'getStatus', id: a.ext_id });
  if (out.startsWith('STATUS_OK')) {
    const code = out.split(':')[1];
    await q("UPDATE activations SET status='done', code=$1 WHERE id=$2", [code, a.id]);
    return res.json({ status: 'done', code });
  }
  if (Date.now() - new Date(a.created_at) > TIMEOUT_MIN * 60000) {
    await cancelAndRefund(a);
    return res.json({ status: 'cancelled' });
  }
  res.json({ status: 'waiting' });
}));

app.post('/api/cancel/:id', auth, wrap(async (req, res) => {
  const { rows } = await q('SELECT * FROM activations WHERE id=$1 AND user_id=$2', [Number(req.params.id) || 0, req.uid]);
  if (!rows[0]) return res.status(404).json({ message: 'İşlem bulunamadı.' });
  res.json({ refunded: await cancelAndRefund(rows[0]) });
}));

app.post('/api/deposit', auth, wrap(async (req, res) => {
  const amount = Number(req.body.amount), sender = String(req.body.sender || '').trim().slice(0, 80);
  if (!sender || !(amount >= 10 && amount <= 50000)) return res.status(400).json({ message: 'Gönderen adı ve 10-50000 TL arası tutar girin.' });
  await q('INSERT INTO deposits(user_id,sender,amount) VALUES($1,$2,$3)', [req.uid, sender, amount]);
  res.json({ message: 'Bildirim alındı. Ödeme kontrol edilince bakiyeniz eklenecek.' });
}));

app.get('/api/admin/deposits', auth, admin, wrap(async (req, res) => {
  const { rows } = await q("SELECT d.id,d.sender,d.amount,d.created_at,u.email FROM deposits d JOIN users u ON u.id=d.user_id WHERE d.status='pending' ORDER BY d.id");
  res.json(rows);
}));

app.post('/api/admin/deposits/:id/approve', auth, admin, wrap(async (req, res) => {
  const d = await q("UPDATE deposits SET status='approved' WHERE id=$1 AND status='pending' RETURNING user_id,amount", [Number(req.params.id) || 0]);
  if (!d.rows[0]) return res.status(404).json({ message: 'Bekleyen bildirim yok.' });
  await q('UPDATE users SET balance=balance+$1 WHERE id=$2', [d.rows[0].amount, d.rows[0].user_id]);
  res.json({ ok: true });
}));

init().then(() => app.listen(process.env.PORT || 3000, () => console.log('AnkaSMS çalışıyor'))).catch((e) => { console.error(e); process.exit(1); });
