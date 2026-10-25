const express = require('express');
const crypto = require('crypto');
const cfg = require('../config');
const { db, ensureTrips } = require('../db');
const U = require('../util');
const { expireStale, TRIP_SQL, tripOut } = require('./public');

const r = express.Router();
const { HttpError } = U;

const sessions = new Map(); // token -> expires
const attempts = new Map(); // ip -> { n, until }

function safeEq(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

r.post('/login', (req, res) => {
  const ip = req.ip;
  const a = attempts.get(ip) || { n: 0, until: 0 };
  if (a.until > Date.now()) throw new HttpError(429, 'too_many_tries');
  if (!safeEq(req.body && req.body.password, cfg.ADMIN_PASSWORD)) {
    a.n++;
    if (a.n >= 5) { a.until = Date.now() + 5 * 60000; a.n = 0; }
    attempts.set(ip, a);
    throw new HttpError(401, 'bad_credentials');
  }
  attempts.delete(ip);
  const token = U.rid(24);
  sessions.set(token, Date.now() + 12 * 3600 * 1000);
  res.json({ token });
});

r.use((req, res, next) => {
  const t = req.headers['x-admin'];
  const exp = t && sessions.get(t);
  if (!exp || exp < Date.now()) throw new HttpError(401, 'unauthorized');
  next();
});

const int = (v, name, min = 0) => {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n) || n < min) throw new HttpError(400, 'bad_' + name);
  return n;
};
const str = (v, max = 80) => String(v == null ? '' : v).trim().slice(0, max);

r.get('/stats', (req, res) => {
  expireStale();
  const now = U.nowLocal();
  const one = (sql, ...a) => db.prepare(sql).get(...a).c;
  res.json({
    upcomingTrips: one("SELECT COUNT(*) c FROM trips WHERE status = 'active' AND depart_at > ?", now),
    activeTickets: one("SELECT COUNT(*) c FROM tickets k JOIN trips t ON t.id = k.trip_id WHERE k.status = 'active' AND t.depart_at > ?", now),
    // Tushum: to'langan summa minus qaytarilgan chipta narxlari (yig'im qaytarilmaydi)
    revenue: db.prepare(`SELECT
      (SELECT COALESCE(SUM(total),0) FROM orders WHERE status IN ('paid','returned')) -
      (SELECT COALESCE(SUM(price),0) FROM tickets WHERE status = 'returned') AS s`).get().s,
    users: one('SELECT COUNT(*) c FROM users'),
    returned: one("SELECT COUNT(*) c FROM tickets WHERE status = 'returned'")
  });
});

/* shaharlar */
r.get('/cities', (req, res) => res.json(db.prepare('SELECT * FROM cities ORDER BY id').all()));
r.post('/cities', (req, res) => {
  const b = req.body || {};
  const uz = str(b.name_uz, 60);
  if (!uz) throw new HttpError(400, 'bad_name');
  const id = db.prepare('INSERT INTO cities (name_uz,name_ru,name_en,country) VALUES (?,?,?,?)')
    .run(uz, str(b.name_ru, 60) || uz, str(b.name_en, 60) || uz, str(b.country, 2).toUpperCase() || 'UZ').lastInsertRowid;
  res.json({ id });
});
r.delete('/cities/:id', (req, res) => {
  try { db.prepare('DELETE FROM cities WHERE id = ?').run(+req.params.id); } catch (e) { throw new HttpError(409, 'in_use'); }
  res.json({ ok: true });
});

/* avtobuslar */
r.get('/buses', (req, res) => res.json(db.prepare('SELECT * FROM buses ORDER BY id').all()));
r.post('/buses', (req, res) => {
  const b = req.body || {};
  const name = str(b.name, 60);
  if (!name) throw new HttpError(400, 'bad_name');
  const id = db.prepare('INSERT INTO buses (name,plate,model,seats,amenities) VALUES (?,?,?,?,?)')
    .run(name, str(b.plate, 20), str(b.model, 60), Math.min(int(b.seats, 'seats', 4), 60), str(b.amenities, 100)).lastInsertRowid;
  res.json({ id });
});
r.put('/buses/:id', (req, res) => {
  const b = req.body || {};
  db.prepare('UPDATE buses SET name=?, plate=?, model=?, seats=?, amenities=? WHERE id=?')
    .run(str(b.name, 60), str(b.plate, 20), str(b.model, 60), Math.min(int(b.seats, 'seats', 4), 60), str(b.amenities, 100), +req.params.id);
  res.json({ ok: true });
});
r.delete('/buses/:id', (req, res) => {
  try { db.prepare('DELETE FROM buses WHERE id = ?').run(+req.params.id); } catch (e) { throw new HttpError(409, 'in_use'); }
  res.json({ ok: true });
});

/* jadvallar (har kuni takrorlanadi) */
r.get('/schedules', (req, res) => {
  res.json(db.prepare(`SELECT s.*, f.name_uz AS f_uz, c.name_uz AS c_uz, b.name AS bus_name FROM schedules s
    JOIN cities f ON f.id = s.from_id JOIN cities c ON c.id = s.to_id JOIN buses b ON b.id = s.bus_id
    ORDER BY s.from_id, s.to_id, s.depart_time`).all());
});
r.post('/schedules', (req, res) => {
  const b = req.body || {};
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(b.depart_time || '')) throw new HttpError(400, 'bad_time');
  if (+b.from_id === +b.to_id) throw new HttpError(400, 'same_city');
  const id = db.prepare(`INSERT INTO schedules (from_id,to_id,depart_time,duration_min,price,bus_id,platform)
    VALUES (?,?,?,?,?,?,?)`).run(int(b.from_id, 'city', 1), int(b.to_id, 'city', 1), b.depart_time,
    int(b.duration_min, 'duration', 10), int(b.price, 'price', 1000), int(b.bus_id, 'bus', 1), str(b.platform, 10)).lastInsertRowid;
  ensureTrips(21);
  res.json({ id });
});
r.put('/schedules/:id/active', (req, res) => {
  const on = req.body && req.body.active ? 1 : 0;
  db.prepare('UPDATE schedules SET active = ? WHERE id = ?').run(on, +req.params.id);
  if (!on) {
    // Kelajakdagi, hali chipta sotilmagan reyslarni olib tashlash
    db.prepare(`DELETE FROM trips WHERE schedule_id = ? AND depart_at > ? AND id NOT IN
      (SELECT trip_id FROM tickets WHERE status IN ('pending','active'))`).run(+req.params.id, U.nowLocal());
  } else ensureTrips(21);
  res.json({ ok: true });
});

/* reyslar */
r.get('/trips', (req, res) => {
  expireStale();
  const date = req.query.date;
  const where = ['t.depart_at > ?'], args = [req.query.past ? '0000-00-00 00:00' : U.nowLocal()];
  if (date && /^\d{4}-\d{2}-\d{2}$/.test(date)) { where.push('t.depart_at LIKE ?'); args.push(date + '%'); }
  const rows = db.prepare(TRIP_SQL + ' WHERE ' + where.join(' AND ') + ' ORDER BY t.depart_at LIMIT 300').all(...args);
  res.json(rows.map(tripOut));
});
r.post('/trips', (req, res) => {
  const b = req.body || {};
  const dep = str(b.depart_at, 16).replace('T', ' ');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(dep)) throw new HttpError(400, 'bad_time');
  if (+b.from_id === +b.to_id) throw new HttpError(400, 'same_city');
  const dur = int(b.duration_min, 'duration', 10);
  const id = db.prepare(`INSERT INTO trips (from_id,to_id,depart_at,arrive_at,duration_min,price,bus_id,platform)
    VALUES (?,?,?,?,?,?,?,?)`).run(int(b.from_id, 'city', 1), int(b.to_id, 'city', 1), dep, U.addMinutes(dep, dur), dur,
    int(b.price, 'price', 1000), int(b.bus_id, 'bus', 1), str(b.platform, 10)).lastInsertRowid;
  res.json({ id });
});
r.put('/trips/:id', (req, res) => {
  const b = req.body || {};
  const status = ['active', 'cancelled'].includes(b.status) ? b.status : 'active';
  db.prepare('UPDATE trips SET price = ?, platform = ?, status = ? WHERE id = ?')
    .run(int(b.price, 'price', 1000), str(b.platform, 10), status, +req.params.id);
  res.json({ ok: true });
});

/* reys o'rinlari: kim o'tirgan, qaysi o'rin bloklangan */
r.get('/trips/:id/seats', (req, res) => {
  expireStale();
  const row = db.prepare(TRIP_SQL + ' WHERE t.id = ?').get(+req.params.id);
  if (!row) throw new HttpError(404, 'trip_not_found');
  const tickets = db.prepare(`SELECT k.seat_no, k.fio, k.gender, k.number, k.status, o.phone
    FROM tickets k JOIN orders o ON o.id = k.order_id
    WHERE k.trip_id = ? AND k.status IN ('pending','active')`).all(row.id);
  const blocked = db.prepare('SELECT seat_no, reason FROM blocked WHERE trip_id = ?').all(row.id);
  const seats = [];
  for (let no = 1; no <= row.total; no++) {
    const t = tickets.find((x) => x.seat_no === no);
    const b = blocked.find((x) => x.seat_no === no);
    seats.push({
      no, ...U.seatPos(no),
      status: t ? 'taken' : b ? 'blocked' : 'free',
      gender: t && t.gender, fio: t && t.fio, phone: t && t.phone, number: t && t.number,
      pending: !!t && t.status === 'pending', reason: b && b.reason
    });
  }
  res.json({ trip: tripOut(row), seats });
});
r.post('/trips/:id/block', (req, res) => {
  const seat = int(req.body && req.body.seat, 'seat', 1);
  const t = db.prepare('SELECT b.seats FROM trips t JOIN buses b ON b.id = t.bus_id WHERE t.id = ?').get(+req.params.id);
  if (!t || seat > t.seats) throw new HttpError(400, 'bad_seat');
  if (db.prepare("SELECT 1 FROM tickets WHERE trip_id = ? AND seat_no = ? AND status IN ('pending','active')").get(+req.params.id, seat))
    throw new HttpError(409, 'seat_taken');
  db.prepare('INSERT OR REPLACE INTO blocked (trip_id, seat_no, reason) VALUES (?,?,?)')
    .run(+req.params.id, seat, str(req.body.reason, 60) || 'kassa');
  res.json({ ok: true });
});
r.delete('/trips/:id/block/:seat', (req, res) => {
  db.prepare('DELETE FROM blocked WHERE trip_id = ? AND seat_no = ?').run(+req.params.id, +req.params.seat);
  res.json({ ok: true });
});

/* buyurtmalar va chipta tekshirish */
r.get('/orders', (req, res) => {
  const rows = db.prepare(`SELECT o.id, o.phone, o.total, o.status, o.created_at,
      t.depart_at, f.name_uz AS f_uz, c.name_uz AS c_uz,
      (SELECT group_concat(seat_no) FROM tickets k WHERE k.order_id = o.id) AS seats
    FROM orders o JOIN trips t ON t.id = o.trip_id
    JOIN cities f ON f.id = t.from_id JOIN cities c ON c.id = t.to_id
    ORDER BY o.created_ms DESC LIMIT 150`).all();
  res.json(rows);
});
r.get('/ticket/:number', (req, res) => {
  const number = String(req.params.number).replace(/^TICKET:/i, '').replace(/\D/g, '');
  const k = db.prepare(`SELECT k.*, o.phone, t.depart_at, f.name_uz AS f_uz, c.name_uz AS c_uz
    FROM tickets k JOIN orders o ON o.id = k.order_id JOIN trips t ON t.id = k.trip_id
    JOIN cities f ON f.id = t.from_id JOIN cities c ON c.id = t.to_id WHERE k.number = ?`).get(number);
  if (!k) throw new HttpError(404, 'ticket_not_found');
  res.json({
    number: k.number, status: k.status, fio: k.fio, seat: k.seat_no, phone: k.phone,
    route: k.f_uz + ' → ' + k.c_uz, departAt: k.depart_at, valid: k.status === 'active'
  });
});

module.exports = { router: r };
