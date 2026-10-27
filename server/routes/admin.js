const express = require('express');
const crypto = require('crypto');
const cfg = require('../config');
const { db } = require('../db');
const U = require('../util');
const { expireStale, TRIP_SQL, tripOut, markOrderPaid } = require('./public');

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
    upcomingTrips: one(`SELECT COUNT(*) c FROM trips t WHERE t.status = 'active' AND t.depart_at > ?
      AND (t.schedule_id IS NULL OR EXISTS (SELECT 1 FROM tickets k WHERE k.trip_id = t.id))`, now),
    activeTickets: one("SELECT COUNT(*) c FROM tickets k JOIN trips t ON t.id = k.trip_id WHERE k.status = 'active' AND t.depart_at > ?", now),
    // Tushum: to'langan summa minus qaytarilgan chipta narxlari (yig'im qaytarilmaydi)
    revenue: db.prepare(`SELECT
      (SELECT COALESCE(SUM(total),0) FROM orders WHERE status IN ('paid','returned')) -
      (SELECT COALESCE(SUM(price),0) FROM tickets WHERE status = 'returned') AS s`).get().s,
    users: one('SELECT COUNT(*) c FROM users'),
    returned: one("SELECT COUNT(*) c FROM tickets WHERE status = 'returned'"),
    archivedTrips: one("SELECT COUNT(*) c FROM trips WHERE status != 'active' OR depart_at <= ?", now)
  });
});

r.get('/sales-config', (req, res) => {
  res.json({ feePercent: cfg.FEE_PERCENT, demoCardPayments: cfg.DEMO });
});

r.get('/reports/buses', (req, res) => {
  expireStale();
  if ((req.query.from !== undefined && typeof req.query.from !== 'string') ||
      (req.query.to !== undefined && typeof req.query.to !== 'string'))
    throw new HttpError(400, 'bad_date');
  const from = req.query.from || '';
  const to = req.query.to || '';
  const validDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const timestamp = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
  };
  if ((from && !validDate(from)) || (to && !validDate(to)))
    throw new HttpError(400, 'bad_date');
  if (from && to && from > to) throw new HttpError(400, 'bad_date');

  const where = ["t.status != 'archived'"];
  const args = [];
  if (from) { where.push('t.depart_at >= ?'); args.push(from + ' 00:00'); }
  if (to) { where.push('t.depart_at <= ?'); args.push(to + ' 23:59'); }
  const rows = db.prepare(`SELECT t.id, t.bus_id, t.from_id, t.to_id, t.depart_at, t.arrive_at, t.price, t.status,
      b.name AS bus_name, b.model AS bus_model, b.plate AS bus_plate, b.seats AS total,
      f.name_uz AS from_uz, f.name_ru AS from_ru, f.name_en AS from_en,
      c.name_uz AS to_uz, c.name_ru AS to_ru, c.name_en AS to_en,
      (SELECT COUNT(*) FROM tickets k JOIN orders o ON o.id = k.order_id
        WHERE k.trip_id = t.id AND k.status = 'active' AND o.status IN ('paid','returned')) AS passengers,
      (SELECT COUNT(*) FROM tickets k WHERE k.trip_id = t.id AND k.status IN ('pending','active')) AS occupied,
      (SELECT COUNT(*) FROM blocked x WHERE x.trip_id = t.id) AS blocked,
      (SELECT COALESCE(SUM(o.amount + o.fee), 0) FROM orders o
        WHERE o.trip_id = t.id AND o.status IN ('paid','returned')) -
      (SELECT COALESCE(SUM(k.price), 0) FROM tickets k JOIN orders o ON o.id = k.order_id
        WHERE k.trip_id = t.id AND k.status = 'returned' AND o.status IN ('paid','returned')) AS revenue,
      (SELECT COALESCE(SUM(o.amount + o.fee), 0) FROM orders o
        WHERE o.trip_id = t.id AND o.payment_method = 'cash' AND o.status IN ('paid','returned')) -
      (SELECT COALESCE(SUM(k.price), 0) FROM tickets k JOIN orders o ON o.id = k.order_id
        WHERE k.trip_id = t.id AND k.status = 'returned' AND o.payment_method = 'cash'
          AND o.status IN ('paid','returned')) AS cash_revenue,
      (SELECT COALESCE(SUM(o.amount + o.fee), 0) FROM orders o
        WHERE o.trip_id = t.id AND o.payment_method = 'card' AND o.status IN ('paid','returned')) -
      (SELECT COALESCE(SUM(k.price), 0) FROM tickets k JOIN orders o ON o.id = k.order_id
        WHERE k.trip_id = t.id AND k.status = 'returned' AND o.payment_method = 'card'
          AND o.status IN ('paid','returned')) AS card_revenue
    FROM trips t JOIN buses b ON b.id = t.bus_id
    JOIN cities f ON f.id = t.from_id JOIN cities c ON c.id = t.to_id
    WHERE ${where.join(' AND ')} ORDER BY b.id, t.depart_at, t.id`).all(...args);
  const byBus = new Map();
  for (const row of rows) {
    const trip = {
      id: row.id, fromId: row.from_id, toId: row.to_id, from: { uz: row.from_uz, ru: row.from_ru, en: row.from_en },
      to: { uz: row.to_uz, ru: row.to_ru, en: row.to_en }, departAt: row.depart_at, arriveAt: row.arrive_at,
      status: row.status, passengers: row.passengers, totalSeats: row.total,
      freeSeats: Math.max(0, row.total - row.occupied - row.blocked),
      occupancy: row.total ? Math.round(row.passengers * 1000 / row.total) / 10 : 0,
      revenue: row.revenue, cashRevenue: row.cash_revenue, cardRevenue: row.card_revenue,
      isReturn: false, pairedTripId: null
    };
    if (!byBus.has(row.bus_id)) {
      byBus.set(row.bus_id, {
        id: row.bus_id, name: row.bus_name, model: row.bus_model, plate: row.bus_plate, seats: row.total,
        trips: [], roundTrips: 0, passengers: 0, revenue: 0
      });
    }
    const bus = byBus.get(row.bus_id);
    bus.trips.push(trip);
    bus.passengers += trip.passengers;
    bus.revenue += trip.revenue;
  }

  const buses = Array.from(byBus.values());
  for (const bus of buses) {
    for (let i = 0; i < bus.trips.length; i++) {
      const outbound = bus.trips[i];
      if (outbound.pairedTripId) continue;
      const inbound = bus.trips.slice(i + 1).find((candidate) =>
        !candidate.pairedTripId && candidate.fromId === outbound.toId && candidate.toId === outbound.fromId &&
        candidate.departAt >= outbound.arriveAt
      );
      if (!inbound) continue;
      outbound.pairedTripId = inbound.id;
      inbound.pairedTripId = outbound.id;
      inbound.isReturn = true;
      bus.roundTrips++;
    }
    bus.tripCount = bus.trips.length;
    bus.outboundCount = bus.trips.filter((trip) => !trip.isReturn).length;
    bus.returnCount = bus.trips.filter((trip) => trip.isReturn).length;
    bus.averageOccupancy = bus.trips.length
      ? Math.round(bus.trips.reduce((sum, trip) => sum + trip.occupancy, 0) / bus.trips.length * 10) / 10
      : 0;
  }
  buses.sort((a, b) => b.revenue - a.revenue || b.tripCount - a.tripCount || a.name.localeCompare(b.name));

  res.json({
    buses,
    totals: {
      buses: buses.length, trips: rows.length, roundTrips: buses.reduce((sum, bus) => sum + bus.roundTrips, 0),
      passengers: buses.reduce((sum, bus) => sum + bus.passengers, 0),
      revenue: buses.reduce((sum, bus) => sum + bus.revenue, 0)
    },
    demoCardPayments: cfg.DEMO
  });
});

r.get('/reports/trips/:id/passengers', (req, res) => {
  const tripId = int(req.params.id, 'trip', 1);
  if (!db.prepare('SELECT 1 FROM trips WHERE id = ?').get(tripId)) throw new HttpError(404, 'trip_not_found');
  const passengers = db.prepare(`SELECT k.seat_no AS seat, k.fio, k.gender, o.phone
    FROM tickets k JOIN orders o ON o.id = k.order_id
    WHERE k.trip_id = ? AND k.status = 'active' AND o.status IN ('paid','returned')
    ORDER BY k.seat_no`).all(tripId);
  res.json({ passengers });
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

/* Oldingi takrorlanuvchi jadval andozalari */
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
  res.json({ id });
});
r.put('/schedules/:id/active', (req, res) => {
  const on = req.body && req.body.active ? 1 : 0;
  db.prepare('UPDATE schedules SET active = ? WHERE id = ?').run(on, +req.params.id);
  res.json({ ok: true });
});
r.delete('/schedules/:id', (req, res) => {
  const id = int(req.params.id, 'schedule', 1);
  if (!db.prepare('SELECT 1 FROM schedules WHERE id = ?').get(id)) throw new HttpError(404, 'schedule_not_found');
  const result = db.transaction(() => {
    const deletedTrips = db.prepare(`DELETE FROM trips WHERE schedule_id = ?
      AND NOT EXISTS (SELECT 1 FROM tickets WHERE tickets.trip_id = trips.id)`).run(id).changes;
    const preservedTrips = db.prepare('SELECT COUNT(*) AS c FROM trips WHERE schedule_id = ?').get(id).c;
    db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
    return { deletedTrips, preservedTrips };
  })();
  res.json(result);
});

/* reyslar */
r.get('/trips', (req, res) => {
  expireStale();
  const date = req.query.date;
  const validDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
  const archive = req.query.archive === '1';
  const where = archive ? ["(t.status != 'active' OR t.depart_at <= ?)"] : ["t.status = 'active'"];
  const args = archive ? [U.nowLocal()] : [];
  if (!archive) where.push('(t.schedule_id IS NULL OR EXISTS (SELECT 1 FROM tickets k WHERE k.trip_id = t.id))');
  if (!archive && !validDate) { where.push('t.depart_at > ?'); args.push(U.nowLocal()); }
  if (validDate) { where.push('t.depart_at LIKE ?'); args.push(date + '%'); }
  if (req.query.manual === '1') where.push('(t.schedule_id IS NULL OR EXISTS (SELECT 1 FROM tickets k WHERE k.trip_id = t.id))');
  const rows = db.prepare(TRIP_SQL + ' WHERE ' + where.join(' AND ') + ' ORDER BY t.depart_at LIMIT 300').all(...args);
  res.json(rows.map((t) => ({
    ...tripOut(t),
    bookedCount: db.prepare(`SELECT COUNT(*) c FROM tickets k JOIN orders o ON o.id = k.order_id
      WHERE k.trip_id = ? AND k.status IN ('active','cancelled') AND o.status = 'paid'`).get(t.id).c
  })));
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
  const result = db.prepare('UPDATE trips SET price = ?, platform = ? WHERE id = ?')
    .run(int(b.price, 'price', 1000), str(b.platform, 10), +req.params.id);
  if (!result.changes) throw new HttpError(404, 'trip_not_found');
  res.json({ ok: true });
});

function requiredReason(value) {
  const reason = str(value, 300);
  if (reason.length < 3) throw new HttpError(400, 'bad_reason');
  return reason;
}

function validFutureDateTime(value) {
  const date = str(value, 16).replace('T', ' ');
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(date)) return null;
  const parsed = new Date(date.replace(' ', 'T') + ':00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 16).replace('T', ' ') !== date || date <= U.nowLocal()) return null;
  return date;
}

function notifyTripOrders(tripId, title, body) {
  const orders = db.prepare(`SELECT DISTINCT o.id, o.user_id, o.guest_key FROM orders o
    JOIN tickets k ON k.order_id = o.id WHERE k.trip_id = ? AND k.status IN ('active','cancelled')
    AND o.status = 'paid'`).all(tripId);
  const insert = db.prepare('INSERT INTO notifications (user_id, guest_key, title, body, created_at) VALUES (?,?,?,?,?)');
  for (const order of orders) insert.run(order.user_id || null, order.guest_key || null, title, body, U.nowLocal());
}

r.put('/trips/:id/reschedule', (req, res) => {
  const id = int(req.params.id, 'trip', 1);
  const trip = db.prepare(TRIP_SQL + ' WHERE t.id = ?').get(id);
  if (!trip) throw new HttpError(404, 'trip_not_found');
  if (trip.status !== 'active') throw new HttpError(409, 'trip_not_active');
  const departAt = validFutureDateTime(req.body && req.body.depart_at);
  if (!departAt) throw new HttpError(400, 'bad_time');
  const reason = requiredReason(req.body && req.body.reason);
  if (trip.schedule_id && db.prepare('SELECT 1 FROM trips WHERE schedule_id = ? AND depart_at = ? AND id != ?').get(trip.schedule_id, departAt, id))
    throw new HttpError(409, 'trip_time_exists');
  const arriveAt = U.addMinutes(departAt, trip.duration_min);
  const body = `Noqulaylik uchun uzr so'raymiz | ${trip.f_uz} → ${trip.c_uz} | ${trip.depart_at} → ${departAt} | Sabab: ${reason} | Aloqa: ${cfg.CONTACT_PHONE}`;
  const tx = db.transaction(() => {
    db.prepare('UPDATE trips SET depart_at = ?, arrive_at = ?, notice_reason = ?, notice_phone = ? WHERE id = ?')
      .run(departAt, arriveAt, reason, cfg.CONTACT_PHONE, id);
    notifyTripOrders(id, 'trip_rescheduled', body);
  });
  tx();
  res.json({ ok: true, departAt, arriveAt, notified: db.prepare("SELECT COUNT(*) c FROM tickets WHERE trip_id = ? AND status = 'active'").get(id).c });
});

r.post('/trips/:id/cancel', (req, res) => {
  const id = int(req.params.id, 'trip', 1);
  const trip = db.prepare(TRIP_SQL + ' WHERE t.id = ?').get(id);
  if (!trip) throw new HttpError(404, 'trip_not_found');
  if (trip.status !== 'active') throw new HttpError(409, 'trip_not_active');
  const reason = requiredReason(req.body && req.body.reason);
  const body = `Noqulaylik uchun uzr so'raymiz | ${trip.f_uz} → ${trip.c_uz} | ${trip.depart_at} | Sabab: ${reason} | Aloqa: ${cfg.CONTACT_PHONE}`;
  const tx = db.transaction(() => {
    db.prepare("UPDATE trips SET status = 'cancelled', notice_reason = ?, notice_phone = ? WHERE id = ?")
      .run(reason, cfg.CONTACT_PHONE, id);
    db.prepare("UPDATE tickets SET status = 'cancelled', returned_at = ? WHERE trip_id = ? AND status = 'active'")
      .run(U.nowLocal(), id);
    db.prepare("UPDATE tickets SET status = 'cancelled', returned_at = ? WHERE trip_id = ? AND status = 'pending'")
      .run(U.nowLocal(), id);
    db.prepare("UPDATE orders SET status = 'cancelled' WHERE trip_id = ? AND status = 'pending'").run(id);
    notifyTripOrders(id, 'trip_cancelled', body);
  });
  tx();
  res.json({ ok: true });
});

r.delete('/trips/:id', (req, res) => {
  const id = int(req.params.id, 'trip', 1);
  const trip = db.prepare('SELECT status FROM trips WHERE id = ?').get(id);
  if (!trip) throw new HttpError(404, 'trip_not_found');
  if (trip.status !== 'active') throw new HttpError(409, 'trip_not_active');
  if (db.prepare('SELECT 1 FROM tickets WHERE trip_id = ? LIMIT 1').get(id)) throw new HttpError(409, 'trip_has_tickets');
  db.transaction(() => {
    db.prepare('DELETE FROM holds WHERE trip_id = ?').run(id);
    db.prepare('DELETE FROM blocked WHERE trip_id = ?').run(id);
    db.prepare("UPDATE trips SET status = 'archived' WHERE id = ?").run(id);
  })();
  res.json({ ok: true });
});

r.get('/trips/:id/move-options', (req, res) => {
  const id = int(req.params.id, 'trip', 1);
  const source = db.prepare(TRIP_SQL + ' WHERE t.id = ?').get(id);
  if (!source) throw new HttpError(404, 'trip_not_found');
  if (!['active', 'cancelled'].includes(source.status)) throw new HttpError(409, 'trip_not_active');
  const orders = db.prepare(`SELECT o.id, o.phone, COUNT(k.id) AS ticket_count,
      group_concat(k.fio, ', ') AS passengers
    FROM orders o JOIN tickets k ON k.order_id = o.id
    WHERE k.trip_id = ? AND k.status IN ('active','cancelled') AND o.status = 'paid'
    GROUP BY o.id ORDER BY o.created_ms`).all(id);
  const trips = db.prepare(TRIP_SQL + ` WHERE t.id != ? AND t.from_id = ? AND t.to_id = ?
    AND t.status = 'active' AND t.depart_at > ? ORDER BY t.depart_at LIMIT 100`)
    .all(id, source.from_id, source.to_id, U.nowLocal())
    .map((trip) => {
      const held = db.prepare('SELECT COUNT(*) c FROM holds WHERE trip_id = ? AND expires_at > ?').get(trip.id, Date.now()).c;
      return { ...tripOut(trip), free: Math.max(0, tripOut(trip).free - held) };
    })
    .filter((trip) => trip.free > 0);
  res.json({ orders, trips });
});

r.post('/orders/:id/move', (req, res) => {
  const orderId = str(req.params.id, 32);
  const toTripId = int(req.body && req.body.toTripId, 'trip', 1);
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order || order.status !== 'paid') throw new HttpError(404, 'order_not_found');
  const source = db.prepare('SELECT * FROM trips WHERE id = ?').get(order.trip_id);
  const target = db.prepare('SELECT * FROM trips WHERE id = ?').get(toTripId);
  if (!source || !target || !['active', 'cancelled'].includes(source.status)) throw new HttpError(404, 'trip_not_found');
  if (target.status !== 'active' || target.depart_at <= U.nowLocal()) throw new HttpError(409, 'trip_not_active');
  if (source.from_id !== target.from_id || source.to_id !== target.to_id) throw new HttpError(400, 'route_mismatch');
  const tickets = db.prepare(`SELECT id, seat_no, status FROM tickets WHERE order_id = ? AND trip_id = ?
    AND status IN ('active','cancelled') ORDER BY seat_no`).all(orderId, source.id);
  if (!tickets.length) throw new HttpError(400, 'nothing_to_move');
  const tx = db.transaction(() => {
    const bus = db.prepare('SELECT seats FROM buses WHERE id = ?').get(target.bus_id);
    const occupied = new Set(db.prepare(`SELECT seat_no FROM tickets WHERE trip_id = ? AND status IN ('active','pending')
      UNION SELECT seat_no FROM blocked WHERE trip_id = ?
      UNION SELECT seat_no FROM holds WHERE trip_id = ? AND expires_at > ?`)
      .all(target.id, target.id, target.id, Date.now()).map((seat) => seat.seat_no));
    const freeSeats = [];
    for (let seat = 1; seat <= bus.seats && freeSeats.length < tickets.length; seat++) {
      if (!occupied.has(seat)) freeSeats.push(seat);
    }
    if (freeSeats.length !== tickets.length) throw new HttpError(409, 'not_enough_seats');
    const update = db.prepare("UPDATE tickets SET trip_id = ?, seat_no = ?, status = 'active', returned_at = NULL WHERE id = ?");
    tickets.forEach((ticket, index) => update.run(target.id, freeSeats[index], ticket.id));
    db.prepare('UPDATE orders SET trip_id = ? WHERE id = ?').run(target.id, orderId);
    const to = db.prepare('SELECT depart_at FROM trips WHERE id = ?').get(target.id);
    const route = db.prepare(`SELECT f.name_uz AS from_name, c.name_uz AS to_name FROM trips t
      JOIN cities f ON f.id = t.from_id JOIN cities c ON c.id = t.to_id WHERE t.id = ?`).get(target.id);
    const body = `${route.from_name} → ${route.to_name} | ${to.depart_at} | Yangi reysga ko'chirildi. Narx farqini kelishish uchun aloqa: ${cfg.CONTACT_PHONE}`;
    db.prepare('INSERT INTO notifications (user_id, guest_key, title, body, created_at) VALUES (?,?,?,?,?)')
      .run(order.user_id || null, order.guest_key || null, 'trip_moved', body, U.nowLocal());
    return freeSeats;
  });
  const seats = tx();
  res.json({ ok: true, moved: tickets.length, seats, tripId: target.id });
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

r.post('/trips/:id/sales', (req, res) => {
  expireStale();
  const tripId = int(req.params.id, 'trip', 1);
  const body = req.body || {};
  const trip = db.prepare(`${TRIP_SQL} WHERE t.id = ?`).get(tripId);
  if (!trip) throw new HttpError(404, 'trip_not_found');
  if (trip.status !== 'active' || trip.depart_at <= U.nowLocal()) throw new HttpError(409, 'trip_not_active');
  const seat = int(body.seat, 'seat', 1);
  if (seat > trip.total) throw new HttpError(400, 'bad_seat');
  const fio = str(body.fio, 60).replace(/\s+/g, ' ');
  if (!/^[\p{L}][\p{L}\s'’`.-]{1,59}$/u.test(fio)) throw new HttpError(400, 'bad_fio');
  const gender = body.gender === 'f' ? 'f' : body.gender === 'm' ? 'm' : null;
  if (!gender) throw new HttpError(400, 'bad_gender');
  const phone = U.normPhone(body.phone);
  if (!phone) throw new HttpError(400, 'bad_phone');
  const foreign = trip.f_country !== 'UZ' || trip.c_country !== 'UZ';
  const passport = str(body.passport, 20).toUpperCase().replace(/\s/g, '');
  const birth = str(body.birth, 10);
  if (foreign && !/^[A-Z]{2}\d{7}$/.test(passport)) throw new HttpError(400, 'bad_passport');
  if (foreign && (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || isNaN(Date.parse(birth)) ||
      new Date(birth).toISOString().slice(0, 10) !== birth || birth > U.nowLocal().slice(0, 10)))
    throw new HttpError(400, 'bad_birth');
  const paymentMethod = body.paymentMethod;
  if (!['cash', 'card'].includes(paymentMethod)) throw new HttpError(400, 'bad_payment_method');
  if (db.prepare("SELECT 1 FROM tickets WHERE trip_id = ? AND seat_no = ? AND status IN ('pending','active')").get(tripId, seat) ||
      db.prepare('SELECT 1 FROM blocked WHERE trip_id = ? AND seat_no = ?').get(tripId, seat))
    throw new HttpError(409, 'seat_taken');

  const orderId = U.rid(6);
  const amount = trip.price;
  const fee = Math.round((amount * cfg.FEE_PERCENT) / 100);
  const now = U.nowLocal();
  const tx = db.transaction(() => {
    db.prepare(`INSERT INTO orders
      (id, trip_id, phone, amount, fee, total, status, payment_method, created_ms, created_at, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?, ?, ?)`)
      .run(orderId, tripId, phone, amount, fee, amount + fee, paymentMethod, Date.now(), now, now);
    db.prepare(`INSERT INTO tickets
      (id, order_id, trip_id, seat_no, fio, gender, passport, birth, price, number, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`)
      .run(U.rid(8), orderId, tripId, seat, fio, gender, foreign ? passport : '', foreign ? birth : '',
        amount, U.ticketNumber());
  });
  try { tx(); } catch (error) {
    if (String(error.message).includes('UNIQUE')) throw new HttpError(409, 'seat_taken');
    throw error;
  }
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const sold = db.prepare(`SELECT k.number, k.seat_no FROM tickets k WHERE k.order_id = ?`).get(orderId);
  res.json({
    orderId, ticketNumber: sold.number, seat, total: order.total, paymentMethod,
    status: order.status
  });
});

/* buyurtmalar va chipta tekshirish */
r.get('/orders', (req, res) => {
  expireStale();
  const rows = db.prepare(`SELECT o.id, o.phone, o.total, o.status, o.payment_method, o.created_at,
      t.depart_at,
      f.name_uz AS f_uz, f.name_ru AS f_ru, f.name_en AS f_en,
      c.name_uz AS c_uz, c.name_ru AS c_ru, c.name_en AS c_en,
      (SELECT group_concat(seat_no) FROM tickets k WHERE k.order_id = o.id) AS seats
    FROM orders o JOIN trips t ON t.id = o.trip_id
    JOIN cities f ON f.id = t.from_id JOIN cities c ON c.id = t.to_id
    ORDER BY o.created_ms DESC LIMIT 150`).all();
  res.json(rows);
});
r.post('/orders/:id/cash/confirm', (req, res) => {
  expireStale();
  res.json(markOrderPaid(String(req.params.id), 'cash'));
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
