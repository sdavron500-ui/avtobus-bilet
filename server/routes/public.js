const express = require('express');
const QRCode = require('qrcode');
const cfg = require('../config');
const { db } = require('../db');
const payment = require('../payment');
const U = require('../util');

const r = express.Router();
const { HttpError } = U;
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/* ---------- umumiy yordamchilar ---------- */

// Kimligini aniqlash: Bearer token (akkaunt) va/yoki X-Guest (mehmon kaliti)
r.use((req, res, next) => {
  const h = req.headers.authorization || '';
  req.user = null;
  if (h.startsWith('Bearer ')) {
    req.token = h.slice(7);
    req.user = db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?').get(req.token) || null;
  }
  const g = req.headers['x-guest'];
  req.guest = /^[a-zA-Z0-9-]{8,64}$/.test(g || '') ? g : null;
  next();
});

function expireStale() {
  const limit = Date.now() - cfg.HOLD_MS;
  db.prepare(`UPDATE tickets SET status = 'cancelled' WHERE status = 'pending' AND order_id IN
    (SELECT id FROM orders WHERE status = 'pending' AND created_ms < ?)`).run(limit);
  db.prepare("UPDATE orders SET status = 'expired' WHERE status = 'pending' AND created_ms < ?").run(limit);
  db.prepare('DELETE FROM holds WHERE expires_at < ?').run(Date.now());
}

const owns = (req, o) => !!o && ((req.user && o.user_id === req.user.id) || (req.guest && o.guest_key === req.guest));

function notify(order, title, body) {
  db.prepare('INSERT INTO notifications (user_id, guest_key, title, body, created_at) VALUES (?,?,?,?,?)')
    .run(order.user_id || null, order.guest_key || null, title, body, U.nowLocal());
}

const cityOut = (c, p) => ({ id: c[p + 'id'] ?? c.id, uz: c[p + 'uz'], ru: c[p + 'ru'], en: c[p + 'en'], country: c[p + 'country'] });

const TRIP_SQL = `
SELECT t.*, b.name AS bus_name, b.model AS bus_model, b.seats AS total, b.amenities AS amenities,
  f.name_uz AS f_uz, f.name_ru AS f_ru, f.name_en AS f_en, f.country AS f_country,
  c.name_uz AS c_uz, c.name_ru AS c_ru, c.name_en AS c_en, c.country AS c_country,
  (SELECT COUNT(*) FROM tickets k WHERE k.trip_id = t.id AND k.status IN ('pending','active')) AS taken,
  (SELECT COUNT(*) FROM blocked x WHERE x.trip_id = t.id) AS blocked_cnt
FROM trips t
JOIN cities f ON f.id = t.from_id
JOIN cities c ON c.id = t.to_id
JOIN buses b ON b.id = t.bus_id`;

function tripOut(t) {
  return {
    id: t.id,
    from: { id: t.from_id, uz: t.f_uz, ru: t.f_ru, en: t.f_en, country: t.f_country },
    to: { id: t.to_id, uz: t.c_uz, ru: t.c_ru, en: t.c_en, country: t.c_country },
    departAt: t.depart_at, arriveAt: t.arrive_at, duration: t.duration_min,
    price: t.price, platform: t.platform, status: t.status,
    noticeReason: t.notice_reason || '', contactPhone: t.notice_phone || '',
    bus: { name: t.bus_name, model: t.bus_model, amenities: (t.amenities || '').split(',').filter(Boolean) },
    total: t.total, free: Math.max(0, t.total - t.taken - t.blocked_cnt),
    foreign: t.f_country !== 'UZ' || t.c_country !== 'UZ'
  };
}

function getTrip(id) {
  const t = db.prepare(TRIP_SQL + ' WHERE t.id = ?').get(id);
  if (!t) throw new HttpError(404, 'trip_not_found');
  return t;
}

const ticketSelect = `
SELECT k.*, o.phone, o.user_id, o.guest_key, o.created_at AS bought_at, o.status AS order_status, o.total AS order_total,
  t.depart_at, t.arrive_at, t.platform, t.duration_min, t.status AS trip_status,
  t.notice_reason, t.notice_phone,
  f.name_uz AS f_uz, f.name_ru AS f_ru, f.name_en AS f_en, f.country AS f_country,
  c.name_uz AS c_uz, c.name_ru AS c_ru, c.name_en AS c_en, c.country AS c_country,
  b.name AS bus_name, b.model AS bus_model
FROM tickets k
JOIN orders o ON o.id = k.order_id
JOIN trips t ON t.id = k.trip_id
JOIN cities f ON f.id = t.from_id
JOIN cities c ON c.id = t.to_id
JOIN buses b ON b.id = t.bus_id`;

function ticketOut(k) {
  return {
    id: k.id, orderId: k.order_id, number: k.number, seat: k.seat_no, fio: k.fio, gender: k.gender,
    passport: k.passport, birth: k.birth, price: k.price, status: k.status, phone: k.phone,
    boughtAt: k.bought_at, departAt: k.depart_at, arriveAt: k.arrive_at, platform: k.platform,
    duration: k.duration_min, tripStatus: k.trip_status, noticeReason: k.notice_reason || '',
    contactPhone: k.notice_phone || '',
    from: { uz: k.f_uz, ru: k.f_ru, en: k.f_en }, to: { uz: k.c_uz, ru: k.c_ru, en: k.c_en },
    foreign: k.f_country !== 'UZ' || k.c_country !== 'UZ',
    bus: { name: k.bus_name, model: k.bus_model },
    canReturn: k.status === 'active' && U.diffMinutes(U.nowLocal(), k.depart_at) >= cfg.RETURN_BEFORE_MIN
  };
}

/* ---------- ochiq ma'lumotlar ---------- */

r.get('/config', (req, res) => {
  res.json({
    brand: cfg.BRAND, feePercent: cfg.FEE_PERCENT, holdMinutes: cfg.HOLD_MS / 60000,
    maxSeats: cfg.MAX_SEATS, demo: cfg.DEMO, returnBeforeMin: cfg.RETURN_BEFORE_MIN,
    contact: {
      phone: cfg.CONTACT_PHONE, telegram: cfg.CONTACT_TELEGRAM, email: cfg.CONTACT_EMAIL,
      hours: cfg.CONTACT_HOURS, address: cfg.CONTACT_ADDRESS
    }
  });
});

r.get('/cities', (req, res) => {
  const rows = db.prepare('SELECT * FROM cities ORDER BY country != \'UZ\', name_uz').all();
  res.json(rows.map((c) => ({ id: c.id, uz: c.name_uz, ru: c.name_ru, en: c.name_en, country: c.country })));
});

r.get('/trips', (req, res) => {
  expireStale();
  const { from, to, date, scope } = req.query;
  const offsetRaw = req.query.offset;
  const offset = offsetRaw === undefined ? 0 : Number(offsetRaw);
  if (offsetRaw !== undefined && (typeof offsetRaw !== 'string' || !/^\d+$/.test(offsetRaw) || !Number.isSafeInteger(offset))) {
    throw new HttpError(400, 'bad_offset');
  }
  const now = U.nowLocal();
  const where = ["t.status = 'active'", 't.depart_at > ?', 't.schedule_id IS NULL'];
  const args = [now];
  if (from) { where.push('t.from_id = ?'); args.push(+from); }
  if (to) { where.push('t.to_id = ?'); args.push(+to); }
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) { where.push('t.depart_at LIKE ?'); args.push(date + '%'); }
  if (scope === 'local') where.push("f.country = 'UZ' AND c.country = 'UZ'");
  if (scope === 'foreign') where.push("(f.country != 'UZ' OR c.country != 'UZ')");
  const rows = db.prepare(TRIP_SQL + ' WHERE ' + where.join(' AND ') + ' ORDER BY t.depart_at, t.id LIMIT 100 OFFSET ?').all(...args, offset);
  res.json(rows.map(tripOut));
});

r.get('/popular', (req, res) => {
  expireStale();
  const rows = db.prepare(`${TRIP_SQL} WHERE t.status = 'active' AND t.depart_at > ? AND t.schedule_id IS NULL
    AND t.id IN (SELECT MIN(id) FROM trips WHERE status = 'active' AND depart_at > ? AND schedule_id IS NULL GROUP BY from_id, to_id)
    ORDER BY (SELECT COUNT(*) FROM tickets k2 JOIN trips t2 ON t2.id = k2.trip_id
      WHERE t2.from_id = t.from_id AND t2.to_id = t.to_id AND k2.status IN ('pending','active')) DESC, t.depart_at
    LIMIT 8`).all(U.nowLocal(), U.nowLocal());
  res.json(rows.map(tripOut));
});

// Reys va uning o'rinlar xaritasi
r.get('/trips/:id', (req, res) => {
  expireStale();
  const t = getTrip(+req.params.id);
  if (t.schedule_id !== null) throw new HttpError(404, 'trip_not_found');
  const mine = String(req.query.hold || '');
  const taken = db.prepare(`SELECT seat_no, gender FROM tickets WHERE trip_id = ? AND status IN ('pending','active')`).all(t.id);
  const blocked = db.prepare('SELECT seat_no FROM blocked WHERE trip_id = ?').all(t.id);
  const holds = db.prepare('SELECT seat_no, token FROM holds WHERE trip_id = ? AND expires_at > ?').all(t.id, Date.now());
  const state = new Map();
  for (const h of holds) if (h.token !== mine) state.set(h.seat_no, { status: 'held' });
  for (const b of blocked) state.set(b.seat_no, { status: 'blocked' });
  for (const k of taken) state.set(k.seat_no, { status: 'taken', gender: k.gender });
  const seats = [];
  for (let no = 1; no <= t.total; no++) {
    const s = state.get(no) || { status: 'free' };
    seats.push({ no, ...U.seatPos(no), ...s });
  }
  res.json({ trip: tripOut(t), seats });
});

/* ---------- o'rinni vaqtincha ushlab turish ---------- */

r.post('/holds', (req, res) => {
  expireStale();
  const { tripId, seats } = req.body || {};
  const t = getTrip(+tripId);
  if (t.status !== 'active' || t.depart_at <= U.nowLocal()) throw new HttpError(400, 'trip_closed');
  if (!Array.isArray(seats) || !seats.length || seats.length > cfg.MAX_SEATS) throw new HttpError(400, 'bad_seats');
  const list = [...new Set(seats.map(Number))];
  if (list.some((n) => !Number.isInteger(n) || n < 1 || n > t.total)) throw new HttpError(400, 'bad_seats');
  const token = /^[a-f0-9]{16,64}$/.test(req.body.holdToken || '') ? req.body.holdToken : U.rid(12);
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM holds WHERE token = ?').run(token);
    for (const n of list) {
      const busy = db.prepare(`SELECT 1 FROM tickets WHERE trip_id = ? AND seat_no = ? AND status IN ('pending','active')
        UNION SELECT 1 FROM blocked WHERE trip_id = ? AND seat_no = ?
        UNION SELECT 1 FROM holds WHERE trip_id = ? AND seat_no = ? AND expires_at > ?`)
        .get(t.id, n, t.id, n, t.id, n, Date.now());
      if (busy) throw new HttpError(409, 'seat_taken', { seat: n });
      db.prepare('INSERT OR REPLACE INTO holds (token, trip_id, seat_no, expires_at) VALUES (?,?,?,?)')
        .run(token, t.id, n, Date.now() + cfg.HOLD_MS);
    }
  });
  tx();
  res.json({ holdToken: token, expiresAt: Date.now() + cfg.HOLD_MS, seats: list });
});

r.delete('/holds/:token', (req, res) => {
  db.prepare('DELETE FROM holds WHERE token = ?').run(req.params.token);
  res.json({ ok: true });
});

/* ---------- buyurtma va to'lov ---------- */

const NAME_RE = /^[\p{L}][\p{L}\s'’`.-]{1,59}$/u;

r.post('/orders', (req, res) => {
  expireStale();
  const { tripId, holdToken, passengers } = req.body || {};
  const t = getTrip(+tripId);
  const phone = U.normPhone(req.body.phone);
  if (!phone) throw new HttpError(400, 'bad_phone');
  if (!Array.isArray(passengers) || !passengers.length) throw new HttpError(400, 'bad_passengers');
  const foreign = t.f_country !== 'UZ' || t.c_country !== 'UZ';

  const holds = db.prepare('SELECT seat_no FROM holds WHERE token = ? AND trip_id = ? AND expires_at > ?')
    .all(String(holdToken || ''), t.id, Date.now()).map((h) => h.seat_no);
  const seatSet = new Set(holds);
  const clean = passengers.map((p) => {
    const seat = Number(p.seat);
    const fio = String(p.fio || '').trim().replace(/\s+/g, ' ');
    const gender = p.gender === 'f' ? 'f' : p.gender === 'm' ? 'm' : null;
    const passport = String(p.passport || '').toUpperCase().replace(/\s/g, '');
    const birth = String(p.birth || '').trim();
    if (!seatSet.has(seat)) throw new HttpError(409, 'hold_expired');
    if (!NAME_RE.test(fio)) throw new HttpError(400, 'bad_fio');
    if (!gender) throw new HttpError(400, 'bad_gender');
    if (foreign) {
      if (!/^[A-Z]{2}\d{7}$/.test(passport)) throw new HttpError(400, 'bad_passport');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || isNaN(Date.parse(birth)) || birth > U.nowLocal().slice(0, 10)) throw new HttpError(400, 'bad_birth');
    }
    return { seat, fio, gender, passport: foreign ? passport : '', birth: foreign ? birth : '' };
  });
  if (clean.length !== seatSet.size || new Set(clean.map((p) => p.seat)).size !== clean.length) throw new HttpError(409, 'hold_expired');

  const amount = t.price * clean.length;
  const fee = Math.round((amount * cfg.FEE_PERCENT) / 100);
  const orderId = U.rid(6);
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO orders (id, user_id, guest_key, trip_id, phone, amount, fee, total, status, created_ms, created_at)
      VALUES (?,?,?,?,?,?,?,?, 'pending', ?, ?)`)
      .run(orderId, req.user ? req.user.id : null, req.guest, t.id, phone, amount, fee, amount + fee, Date.now(), U.nowLocal());
    const ins = db.prepare(`INSERT INTO tickets (id, order_id, trip_id, seat_no, fio, gender, passport, birth, price, number, status)
      VALUES (?,?,?,?,?,?,?,?,?,?, 'pending')`);
    for (const p of clean) ins.run(U.rid(8), orderId, t.id, p.seat, p.fio, p.gender, p.passport, p.birth, t.price, U.ticketNumber());
    db.prepare('DELETE FROM holds WHERE token = ?').run(holdToken);
  });
  try { tx(); } catch (e) {
    if (String(e.message).includes('UNIQUE')) throw new HttpError(409, 'seat_taken');
    throw e;
  }
  res.json(orderOut(orderId));
});

function orderOut(id) {
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!o) throw new HttpError(404, 'order_not_found');
  const tickets = db.prepare(ticketSelect + ' WHERE k.order_id = ? ORDER BY k.seat_no').all(id).map(ticketOut);
  const t = getTrip(o.trip_id);
  return {
    id: o.id, status: o.status, phone: o.phone, amount: o.amount, fee: o.fee, total: o.total,
    paymentMethod: o.payment_method, paymentStarted: !!o.sms_code, createdAt: o.created_at, paidAt: o.paid_at,
    expiresAt: o.created_ms + cfg.HOLD_MS, trip: tripOut(t), tickets
  };
}

function loadOrder(req) {
  expireStale();
  const o = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!o) throw new HttpError(404, 'order_not_found');
  if (!owns(req, o)) throw new HttpError(403, 'forbidden');
  return o;
}

r.get('/orders/:id', (req, res) => {
  const o = loadOrder(req);
  res.json(orderOut(o.id));
});

r.post('/orders/:id/pay', wrap(async (req, res) => {
  const o = loadOrder(req);
  if (o.status !== 'pending') throw new HttpError(409, o.status === 'expired' ? 'hold_expired' : 'order_closed');
  const number = String((req.body && req.body.number) || '');
  const expiry = String((req.body && req.body.expiry) || '');
  if (!U.luhn(number)) throw new HttpError(400, 'bad_card');
  if (!U.validExpiry(expiry)) throw new HttpError(400, 'bad_expiry');
  const result = await payment.start(o, { number, expiry });
  db.prepare("UPDATE orders SET payment_method = 'card', sms_code = ?, sms_tries = 0 WHERE id = ? AND status = 'pending'")
    .run(result.code || null, o.id);
  res.json({ needSms: !!result.needSms, phone: o.phone, demoCode: cfg.DEMO ? cfg.DEMO_CODE : undefined });
}));

function markOrderPaid(orderId, requiredMethod) {
  const tx = db.transaction(() => {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
    if (!order) throw new HttpError(404, 'order_not_found');
    if (order.status !== 'pending') throw new HttpError(409, order.status === 'expired' ? 'hold_expired' : 'order_closed');
    if (requiredMethod && order.payment_method !== requiredMethod) throw new HttpError(409, 'payment_method_mismatch');
    const changed = db.prepare("UPDATE orders SET status = 'paid', paid_at = ? WHERE id = ? AND status = 'pending'")
      .run(U.nowLocal(), orderId).changes;
    if (!changed) throw new HttpError(409, 'order_closed');
    db.prepare("UPDATE tickets SET status = 'active' WHERE order_id = ? AND status = 'pending'").run(orderId);
    return order;
  });
  const order = tx();
  const out = orderOut(orderId);
  notify(order, 'paid', out.trip.from.uz + ' → ' + out.trip.to.uz + ' | ' + out.trip.departAt + ' | ' + out.tickets.map((x) => '#' + x.seat).join(', '));
  return out;
}

r.post('/orders/:id/cash', (req, res) => {
  const order = loadOrder(req);
  if (order.status !== 'pending') throw new HttpError(409, order.status === 'expired' ? 'hold_expired' : 'order_closed');
  if (order.sms_code) throw new HttpError(409, 'payment_method_locked');
  db.prepare("UPDATE orders SET payment_method = 'cash' WHERE id = ? AND status = 'pending' AND sms_code IS NULL")
    .run(order.id);
  res.json(orderOut(order.id));
});

r.post('/orders/:id/confirm', wrap(async (req, res) => {
  const order = loadOrder(req);
  if (order.status !== 'pending') throw new HttpError(409, order.status === 'expired' ? 'hold_expired' : 'order_closed');
  if (order.payment_method !== 'card') throw new HttpError(409, 'payment_method_mismatch');
  if (order.sms_tries >= 5) throw new HttpError(429, 'too_many_tries');
  db.prepare('UPDATE orders SET sms_tries = sms_tries + 1 WHERE id = ?').run(order.id);
  const ok = await payment.confirm(order, String((req.body && req.body.code) || ''));
  if (!ok) throw new HttpError(400, 'bad_code');
  const out = markOrderPaid(order.id, 'card');
  res.json(out);
}));

/* ---------- chiptalar ---------- */

function actorFilter(req) {
  const parts = [], args = [];
  if (req.user) { parts.push('o.user_id = ?'); args.push(req.user.id); }
  if (req.guest) { parts.push('o.guest_key = ?'); args.push(req.guest); }
  return parts.length ? { sql: '(' + parts.join(' OR ') + ')', args } : null;
}

r.get('/tickets', (req, res) => {
  expireStale();
  const f = actorFilter(req);
  if (!f) return res.json([]);
  const now = U.nowLocal();
  const status = req.query.status || 'active';
  let cond;
  const args = [...f.args];
  if (status === 'returned') cond = "k.status = 'returned'";
  else if (status === 'cancelled') cond = "k.status = 'cancelled' AND t.status = 'cancelled' AND o.status = 'paid'";
  else if (status === 'history') { cond = "k.status = 'active' AND t.depart_at <= ?"; args.push(now); }
  else { cond = "k.status = 'active' AND t.depart_at > ?"; args.push(now); }
  const rows = db.prepare(`${ticketSelect} WHERE ${f.sql} AND ${cond}
    ORDER BY t.depart_at ${status === 'active' ? 'ASC' : 'DESC'} LIMIT 200`).all(...args);
  res.json(rows.map(ticketOut));
});

function loadTicket(req) {
  const k = db.prepare(ticketSelect + ' WHERE k.id = ?').get(req.params.id);
  if (!k) throw new HttpError(404, 'ticket_not_found');
  if (!owns(req, k)) throw new HttpError(403, 'forbidden');
  return k;
}

r.get('/tickets/:id', (req, res) => res.json(ticketOut(loadTicket(req))));

// QR-kod: chipta raqami. Nazoratchi admin paneldan tekshiradi.
r.get('/tickets/:id/qr.svg', wrap(async (req, res) => {
  const k = db.prepare('SELECT number FROM tickets WHERE id = ?').get(req.params.id);
  if (!k) throw new HttpError(404, 'ticket_not_found');
  const svg = await QRCode.toString('TICKET:' + k.number, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  res.type('image/svg+xml').send(svg);
}));

function doReturn(req, ticketRows) {
  const now = U.nowLocal();
  let refund = 0, n = 0;
  const tx = db.transaction(() => {
    for (const k of ticketRows) {
      if (k.status !== 'active') continue;
      if (U.diffMinutes(now, k.depart_at) < cfg.RETURN_BEFORE_MIN) throw new HttpError(400, 'return_closed');
      db.prepare("UPDATE tickets SET status = 'returned', returned_at = ? WHERE id = ?").run(now, k.id);
      refund += k.price; n++;
    }
    if (!n) throw new HttpError(400, 'nothing_to_return');
    for (const oid of new Set(ticketRows.map((k) => k.order_id))) {
      const left = db.prepare("SELECT COUNT(*) c FROM tickets WHERE order_id = ? AND status = 'active'").get(oid).c;
      if (!left) db.prepare("UPDATE orders SET status = 'returned' WHERE id = ?").run(oid);
    }
  });
  tx();
  const first = ticketRows[0];
  notify(first, 'returned', n + ' | ' + refund);
  return { returned: n, refund };
}

r.post('/tickets/:id/return', (req, res) => {
  const k = loadTicket(req);
  res.json(doReturn(req, [k]));
});

r.post('/orders/:id/return', (req, res) => {
  const o = loadOrder(req);
  const rows = db.prepare(ticketSelect + " WHERE k.order_id = ? AND k.status = 'active'").all(o.id);
  if (!rows.length) throw new HttpError(400, 'nothing_to_return');
  res.json(doReturn(req, rows));
});

/* ---------- akkaunt ---------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function userOut(u) {
  return { id: u.id, email: u.email, name: u.name, phone: u.phone, lang: u.lang };
}

function startSession(req, userId) {
  const token = U.rid(24);
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?,?,?)').run(token, userId, U.nowLocal());
  // Mehmon sifatida olingan buyurtmalarni akkauntga biriktirish
  if (req.guest) {
    db.prepare('UPDATE orders SET user_id = ? WHERE guest_key = ? AND user_id IS NULL').run(userId, req.guest);
    db.prepare('UPDATE notifications SET user_id = ? WHERE guest_key = ? AND user_id IS NULL').run(userId, req.guest);
  }
  return token;
}

r.post('/auth/register', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'bad_email');
  if (password.length < 6) throw new HttpError(400, 'short_password');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw new HttpError(409, 'email_exists');
  const lang = ['uz', 'ru', 'en'].includes(req.body.lang) ? req.body.lang : 'uz';
  const id = db.prepare('INSERT INTO users (email, pass_hash, lang, created_at) VALUES (?,?,?,?)')
    .run(email, U.hashPw(password), lang, U.nowLocal()).lastInsertRowid;
  const token = startSession(req, Number(id));
  res.json({ token, user: userOut(db.prepare('SELECT * FROM users WHERE id = ?').get(id)) });
});

r.post('/auth/login', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!u || !U.checkPw(String(req.body.password || ''), u.pass_hash)) throw new HttpError(401, 'bad_credentials');
  res.json({ token: startSession(req, u.id), user: userOut(u) });
});

r.post('/auth/logout', (req, res) => {
  if (req.token) db.prepare('DELETE FROM sessions WHERE token = ?').run(req.token);
  res.json({ ok: true });
});

r.post('/auth/forgot', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const u = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  const out = { ok: true };
  if (u) {
    const code = cfg.DEMO ? cfg.DEMO_CODE : String(require('crypto').randomInt(100000, 1000000));
    db.prepare('INSERT OR REPLACE INTO codes (kind, key, code, expires_at) VALUES (?,?,?,?)')
      .run('reset', email, code, Date.now() + 15 * 60000);
    // Haqiqiy loyihada kod emailga yuboriladi (SMTP). Demo rejimda javobda qaytariladi.
    if (cfg.DEMO) out.demoCode = code; else console.log('[reset code]', email, code);
  }
  res.json(out);
});

r.post('/auth/reset', (req, res) => {
  const email = String((req.body && req.body.email) || '').trim().toLowerCase();
  const password = String((req.body && req.body.password) || '');
  if (password.length < 6) throw new HttpError(400, 'short_password');
  const c = db.prepare("SELECT * FROM codes WHERE kind = 'reset' AND key = ?").get(email);
  if (!c || c.expires_at < Date.now() || c.code !== String(req.body.code || '')) throw new HttpError(400, 'bad_code');
  const u = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!u) throw new HttpError(400, 'bad_code');
  db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(U.hashPw(password), u.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  db.prepare("DELETE FROM codes WHERE kind = 'reset' AND key = ?").run(email);
  res.json({ ok: true });
});

r.get('/me', (req, res) => {
  if (!req.user) throw new HttpError(401, 'unauthorized');
  res.json(userOut(req.user));
});

r.put('/me', (req, res) => {
  if (!req.user) throw new HttpError(401, 'unauthorized');
  const name = String(req.body.name || '').trim().slice(0, 60);
  const phoneRaw = String(req.body.phone || '').trim();
  const phone = phoneRaw ? U.normPhone(phoneRaw) : '';
  if (phoneRaw && !phone) throw new HttpError(400, 'bad_phone');
  const lang = ['uz', 'ru', 'en'].includes(req.body.lang) ? req.body.lang : req.user.lang;
  db.prepare('UPDATE users SET name = ?, phone = ?, lang = ? WHERE id = ?').run(name, phone, lang, req.user.id);
  res.json(userOut(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)));
});

r.delete('/me', (req, res) => {
  if (!req.user) throw new HttpError(401, 'unauthorized');
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.json({ ok: true });
});

/* ---------- chiptalarni telefon raqami bo'yicha tiklash ---------- */

r.post('/restore/send', (req, res) => {
  const phone = U.normPhone(req.body && req.body.phone);
  if (!phone) throw new HttpError(400, 'bad_phone');
  const code = cfg.DEMO ? cfg.DEMO_CODE : String(require('crypto').randomInt(100000, 1000000));
  db.prepare('INSERT OR REPLACE INTO codes (kind, key, code, expires_at) VALUES (?,?,?,?)')
    .run('restore', phone, code, Date.now() + 10 * 60000);
  // Haqiqiy loyihada kod SMS gateway orqali yuboriladi.
  res.json({ ok: true, demoCode: cfg.DEMO ? code : undefined });
});

r.post('/restore/verify', (req, res) => {
  const phone = U.normPhone(req.body && req.body.phone);
  if (!phone) throw new HttpError(400, 'bad_phone');
  if (!req.user && !req.guest) throw new HttpError(400, 'no_actor');
  const c = db.prepare("SELECT * FROM codes WHERE kind = 'restore' AND key = ?").get(phone);
  if (!c || c.expires_at < Date.now() || c.code !== String((req.body && req.body.code) || '')) throw new HttpError(400, 'bad_code');
  const orders = db.prepare("SELECT id FROM orders WHERE phone = ? AND status IN ('paid','returned')").all(phone);
  for (const o of orders) {
    if (req.user) db.prepare('UPDATE orders SET user_id = ? WHERE id = ?').run(req.user.id, o.id);
    else db.prepare('UPDATE orders SET guest_key = ? WHERE id = ?').run(req.guest, o.id);
  }
  db.prepare("DELETE FROM codes WHERE kind = 'restore' AND key = ?").run(phone);
  const count = orders.length
    ? db.prepare(`SELECT COUNT(*) c FROM tickets WHERE order_id IN (${orders.map(() => '?').join(',')})`).get(...orders.map((o) => o.id)).c
    : 0;
  res.json({ restored: count });
});

/* ---------- bildirishnomalar ---------- */

r.get('/notifications', (req, res) => {
  const parts = [], args = [];
  if (req.user) { parts.push('user_id = ?'); args.push(req.user.id); }
  if (req.guest) { parts.push('guest_key = ?'); args.push(req.guest); }
  if (!parts.length) return res.json([]);
  const rows = db.prepare(`SELECT id, title, body, created_at FROM notifications WHERE ${parts.join(' OR ')} ORDER BY id DESC LIMIT 50`).all(...args);
  res.json(rows.map((n) => ({ id: n.id, kind: n.title, body: n.body, createdAt: n.created_at })));
});

module.exports = { router: r, expireStale, TRIP_SQL, tripOut, ticketSelect, ticketOut, cityOut, markOrderPaid };
