const express = require('express');
const path = require('path');
const cfg = require('./config');
const { ensureTrips } = require('./db');
const { seed } = require('./seed');

if (seed()) console.log("Namunaviy shaharlar, avtobuslar va reyslar qo'shildi.");
ensureTrips(21);
setInterval(() => ensureTrips(21), 60 * 60 * 1000).unref();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '50kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

const pub = require('./routes/public');
const admin = require('./routes/admin');
app.use('/api/admin', admin.router);
app.use('/api', pub.router);

app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));

// Xatoliklar
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err && err.status) return res.status(err.status).json({ error: err.code, ...(err.extra || {}) });
  if (err && err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json' });
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

if (require.main === module) {
  app.listen(cfg.PORT, () => {
    console.log(`${cfg.BRAND} ishga tushdi: http://localhost:${cfg.PORT}`);
    console.log(`Admin panel: http://localhost:${cfg.PORT}/admin.html`);
    if (cfg.ADMIN_PASSWORD === 'admin123') console.warn("DIQQAT: admin paroli standart (admin123). .env da ADMIN_PASSWORD ni o'zgartiring!");
    if (cfg.DEMO) console.warn("DEMO rejim: to'lov soxta, SMS kodi 123456.");
  });
}

module.exports = app;
