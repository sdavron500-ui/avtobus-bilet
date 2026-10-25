// Bitta HTML faylli DEMO uchun brauzer ichidagi soxta backend.
// Haqiqiy serverdagi (server/routes/public.js) mantiqning qisqartirilgan nusxasi: ma'lumot localStorage'da.
// Admin panel bu versiyada yo'q.
import uz from '../public/i18n/uz.json';
import ru from '../public/i18n/ru.json';
import en from '../public/i18n/en.json';

const DICTS = { uz, ru, en };
const HOLD_MS = 10 * 60 * 1000, FEE = 2, RETURN_MIN = 60, MAX_SEATS = 5;
const nowL = () => new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(0, 16);
const toD = (l) => new Date(l.replace(' ', 'T') + ':00Z');
const addMin = (l, m) => new Date(toD(l).getTime() + m * 60000).toISOString().slice(0, 16).replace('T', ' ');
const diffMin = (a, b) => Math.round((toD(b) - toD(a)) / 60000);
const addDays = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const rid = (n = 8) => Array.from({ length: n * 2 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
const E = (status, code, extra) => ({ status, code, extra });

const C = [
  ['Toshkent', 'Ташкент', 'Tashkent', 'UZ'], ['Samarqand', 'Самарканд', 'Samarkand', 'UZ'], ['Buxoro', 'Бухара', 'Bukhara', 'UZ'],
  ['Andijon', 'Андижан', 'Andijan', 'UZ'], ['Namangan', 'Наманган', 'Namangan', 'UZ'], ["Farg'ona", 'Фергана', 'Fergana', 'UZ'],
  ['Xiva', 'Хива', 'Khiva', 'UZ'], ['Nukus', 'Нукус', 'Nukus', 'UZ'], ['Qarshi', 'Карши', 'Karshi', 'UZ'], ['Termiz', 'Термез', 'Termez', 'UZ'],
  ['Shymkent', 'Шымкент', 'Shymkent', 'KZ'], ['Almaty', 'Алматы', 'Almaty', 'KZ'], ['Bishkek', 'Бишкек', 'Bishkek', 'KG'], ['Dushanbe', 'Душанбе', 'Dushanbe', 'TJ']
].map((c, i) => ({ id: i + 1, uz: c[0], ru: c[1], en: c[2], country: c[3] }));
const cid = (n) => C.find((c) => c.uz === n).id;
const BUSES = [
  { name: 'Avtobus 1', model: 'Yutong ZK6122', seats: 40, amenities: 'AC,USB,WiFi' },
  { name: 'Avtobus 2', model: 'Mercedes Tourismo', seats: 44, amenities: 'AC,USB' },
  { name: 'Avtobus 3', model: 'Higer KLQ', seats: 36, amenities: 'AC' }
];
const ROUTES = [
  ['Toshkent', 'Samarqand', 270, 120000, ['07:30', '13:00', '20:00'], '3'], ['Toshkent', 'Buxoro', 450, 190000, ['09:00', '21:30'], '4'],
  ['Toshkent', 'Andijon', 360, 150000, ['06:00', '15:00'], '2'], ['Toshkent', 'Namangan', 300, 120000, ['08:00'], '2'],
  ['Toshkent', "Farg'ona", 330, 130000, ['07:00'], '2'], ['Toshkent', 'Xiva', 840, 280000, ['18:00'], '5'],
  ['Toshkent', 'Nukus', 1080, 320000, ['17:00'], '5'], ['Toshkent', 'Qarshi', 420, 170000, ['08:30'], '4'],
  ['Toshkent', 'Termiz', 660, 230000, ['19:00'], '6'], ['Samarqand', 'Buxoro', 180, 90000, ['10:00', '16:00'], '1'],
  ['Toshkent', 'Shymkent', 300, 160000, ['07:00'], '7'], ['Toshkent', 'Almaty', 1080, 420000, ['16:00'], '7'],
  ['Toshkent', 'Bishkek', 960, 380000, ['15:00'], '7'], ['Toshkent', 'Dushanbe', 900, 400000, ['14:00'], '7']
];
const SCHED = [];
{ let k = 0;
  for (const [a, b, dur, price, times, plat] of ROUTES) {
    for (const t of times) {
      SCHED.push({ from: cid(a), to: cid(b), time: t, dur, price, bus: BUSES[k++ % 3], plat });
      const [h, m] = t.split(':').map(Number);
      SCHED.push({ from: cid(b), to: cid(a), time: String((h + 3) % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0'), dur, price, bus: BUSES[k++ % 3], plat });
    }
  }
}

const KEY = 'marshrut_demo_v1';
let DB;
try { DB = JSON.parse(localStorage.getItem(KEY)); } catch { DB = null; }
if (!DB) DB = { tickets: [], orders: [], users: [], sessions: {}, notes: [], holds: {}, codes: {} };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch { /* ignore */ } };

function allTrips() {
  const now = nowL(), today = now.slice(0, 10), out = [];
  for (let d = 0; d < 21; d++) {
    const date = addDays(today, d);
    SCHED.forEach((s, i) => {
      const dep = date + ' ' + s.time;
      if (dep <= now) return;
      out.push({ id: Number(date.replace(/-/g, '') + String(i).padStart(2, '0')), from_id: s.from, to_id: s.to, depart_at: dep, arrive_at: addMin(dep, s.dur), duration: s.dur, price: s.price, bus: s.bus, platform: s.plat });
    });
  }
  return out;
}
const findTrip = (id) => allTrips().find((t) => t.id === id) || null;
const cityOf = (id) => C.find((c) => c.id === id);

// Demo uchun ba'zi o'rinlar oldindan band (trip id'ga bog'liq, o'zgarmas)
function fakeTaken(t) {
  let s = t.id % 2147483647;
  const rnd = () => (s = (s * 48271) % 2147483647) / 2147483647;
  const m = new Map();
  const n = Math.floor(t.bus.seats * (0.15 + rnd() * 0.45));
  while (m.size < n) m.set(1 + Math.floor(rnd() * t.bus.seats), rnd() < 0.5 ? 'm' : 'f');
  return m;
}
const live = (k) => k.status === 'pending' || k.status === 'active';
function takenMap(t) {
  const m = fakeTaken(t);
  DB.tickets.filter((k) => k.trip_id === t.id && live(k)).forEach((k) => m.set(k.seat_no, k.gender));
  return m;
}
function tripOut(t) {
  const f = cityOf(t.from_id), c = cityOf(t.to_id), taken = takenMap(t).size;
  return {
    id: t.id, from: { id: f.id, uz: f.uz, ru: f.ru, en: f.en, country: f.country }, to: { id: c.id, uz: c.uz, ru: c.ru, en: c.en, country: c.country },
    departAt: t.depart_at, arriveAt: t.arrive_at, duration: t.duration, price: t.price, platform: t.platform, status: 'active',
    bus: { name: t.bus.name, model: t.bus.model, amenities: t.bus.amenities.split(',') },
    total: t.bus.seats, free: Math.max(0, t.bus.seats - taken), foreign: f.country !== 'UZ' || c.country !== 'UZ'
  };
}
function tripById(id) { const t = findTrip(id); if (!t) throw E(404, 'trip_not_found'); return t; }

function expireStale() {
  const lim = Date.now() - HOLD_MS;
  DB.orders.filter((o) => o.status === 'pending' && o.created_ms < lim).forEach((o) => {
    o.status = 'expired';
    DB.tickets.filter((k) => k.order_id === o.id && k.status === 'pending').forEach((k) => { k.status = 'cancelled'; });
  });
  Object.keys(DB.holds).forEach((k) => { if (DB.holds[k].exp < Date.now()) delete DB.holds[k]; });
}

function ticketOut(k) {
  const o = DB.orders.find((x) => x.id === k.order_id), t = tripById(k.trip_id) || {};
  const f = cityOf(t.from_id), c = cityOf(t.to_id);
  return {
    id: k.id, orderId: k.order_id, number: k.number, seat: k.seat_no, fio: k.fio, gender: k.gender, passport: k.passport, birth: k.birth,
    price: k.price, status: k.status, phone: o.phone, boughtAt: o.created_at, departAt: k.depart_at, arriveAt: k.arrive_at, platform: k.platform,
    duration: k.duration, from: { uz: f.uz, ru: f.ru, en: f.en }, to: { uz: c.uz, ru: c.ru, en: c.en },
    foreign: f.country !== 'UZ' || c.country !== 'UZ', bus: { name: k.bus_name, model: k.bus_model },
    canReturn: k.status === 'active' && diffMin(nowL(), k.depart_at) >= RETURN_MIN
  };
}
function orderOut(o) {
  const tickets = DB.tickets.filter((k) => k.order_id === o.id).sort((a, b) => a.seat_no - b.seat_no).map(ticketOut);
  return { id: o.id, status: o.status, phone: o.phone, amount: o.amount, fee: o.fee, total: o.total, createdAt: o.created_at, paidAt: o.paid_at, expiresAt: o.created_ms + HOLD_MS, trip: tripOut(tripById(o.trip_id)), tickets };
}

const luhn = (n) => { const s = String(n).replace(/\s+/g, ''); if (!/^\d{16}$/.test(s)) return false; let sum = 0; for (let i = 0; i < 16; i++) { let d = +s[15 - i]; if (i % 2) { d *= 2; if (d > 9) d -= 9; } sum += d; } return sum % 10 === 0; };
const validExp = (e) => { const m = String(e || '').match(/^(\d{2})\/(\d{2})$/); if (!m) return false; const mm = +m[1], yy = 2000 + +m[2], n = new Date(); return mm >= 1 && mm <= 12 && (yy > n.getFullYear() || (yy === n.getFullYear() && mm >= n.getMonth() + 1)); };
const normPhone = (p) => { const d = String(p || '').replace(/\D/g, ''); if (d.length === 9) return '+998' + d; if (d.length === 12 && d.startsWith('998')) return '+' + d; return null; };
const NAME_RE = /^[\p{L}][\p{L}\s'’`.-]{1,59}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const userOut = (u) => ({ id: u.id, email: u.email, name: u.name, phone: u.phone, lang: u.lang });

function handle(method, path, q, body, who) {
  let m;
  const me = who.token && DB.sessions[who.token] ? DB.users.find((u) => u.id === DB.sessions[who.token]) : null;
  const owns = (o) => (me && o.user_id === me.id) || (who.guest && o.guest_key === who.guest);
  const note = (o, kind, text) => DB.notes.unshift({ id: rid(4), user_id: o.user_id, guest_key: o.guest_key, kind, body: text, createdAt: nowL() });
  expireStale();

  if (path === '/config') return { brand: 'Marshrut', feePercent: FEE, holdMinutes: 10, maxSeats: MAX_SEATS, demo: true, returnBeforeMin: RETURN_MIN, contact: { phone: '+998 00 000 00 00', telegram: '@username', email: 'info@example.com', hours: '8:00-20:00', address: '' } };
  if (path === '/cities') return C;
  if (path === '/trips' && method === 'GET') {
    let list = allTrips();
    if (q.from) list = list.filter((t) => t.from_id === +q.from);
    if (q.to) list = list.filter((t) => t.to_id === +q.to);
    if (q.date) list = list.filter((t) => t.depart_at.startsWith(q.date));
    const out = list.map(tripOut);
    return out.filter((t) => (q.scope === 'local' ? !t.foreign : q.scope === 'foreign' ? t.foreign : true)).sort((a, b) => a.departAt.localeCompare(b.departAt)).slice(0, 100);
  }
  if (path === '/popular') {
    const seen = new Set(), out = [];
    for (const t of allTrips()) { const k = t.from_id + '-' + t.to_id; if (!seen.has(k)) { seen.add(k); out.push(tripOut(t)); } }
    return out.sort((a, b) => a.departAt.localeCompare(b.departAt)).slice(0, 8);
  }
  if ((m = path.match(/^\/trips\/(\d+)$/))) {
    const t = tripById(+m[1]);
    const taken = takenMap(t);
    const seats = [];
    for (let no = 1; no <= t.bus.seats; no++) {
      const base = { no, row: Math.ceil(no / 4), col: (no - 1) % 4 };
      const h = DB.holds[t.id + ':' + no];
      if (taken.has(no)) seats.push({ ...base, status: 'taken', gender: taken.get(no) });
      else if (h && h.exp > Date.now() && h.token !== q.hold) seats.push({ ...base, status: 'held' });
      else seats.push({ ...base, status: 'free' });
    }
    return { trip: tripOut(t), seats };
  }
  if (path === '/holds' && method === 'POST') {
    const t = tripById(+body.tripId);
    if (!Array.isArray(body.seats) || !body.seats.length || body.seats.length > MAX_SEATS) throw E(400, 'bad_seats');
    const list = [...new Set(body.seats.map(Number))];
    if (list.some((n) => !Number.isInteger(n) || n < 1 || n > t.bus.seats)) throw E(400, 'bad_seats');
    const token = /^[a-f0-9]{16,64}$/.test(body.holdToken || '') ? body.holdToken : rid(12);
    Object.keys(DB.holds).forEach((k) => { if (DB.holds[k].token === token) delete DB.holds[k]; });
    const taken = takenMap(t);
    for (const n of list) {
      const h = DB.holds[t.id + ':' + n];
      if (taken.has(n) || (h && h.exp > Date.now())) throw E(409, 'seat_taken', { seat: n });
    }
    list.forEach((n) => { DB.holds[t.id + ':' + n] = { token, exp: Date.now() + HOLD_MS }; });
    return { holdToken: token, expiresAt: Date.now() + HOLD_MS, seats: list };
  }
  if ((m = path.match(/^\/holds\/([\w-]+)$/)) && method === 'DELETE') {
    Object.keys(DB.holds).forEach((k) => { if (DB.holds[k].token === m[1]) delete DB.holds[k]; });
    return { ok: true };
  }
  if (path === '/orders' && method === 'POST') {
    const t = tripById(+body.tripId), phone = normPhone(body.phone);
    if (!phone) throw E(400, 'bad_phone');
    if (!Array.isArray(body.passengers) || !body.passengers.length) throw E(400, 'bad_passengers');
    const f = cityOf(t.from_id), c = cityOf(t.to_id), foreign = f.country !== 'UZ' || c.country !== 'UZ';
    const held = Object.entries(DB.holds).filter(([k, h]) => k.startsWith(t.id + ':') && h.token === body.holdToken && h.exp > Date.now()).map(([k]) => +k.split(':')[1]);
    const clean = body.passengers.map((p) => {
      const seat = Number(p.seat), fio = String(p.fio || '').trim().replace(/\s+/g, ' '), gender = p.gender === 'f' ? 'f' : p.gender === 'm' ? 'm' : null;
      const passport = String(p.passport || '').toUpperCase().replace(/\s/g, ''), birth = String(p.birth || '');
      if (!held.includes(seat)) throw E(409, 'hold_expired');
      if (!NAME_RE.test(fio)) throw E(400, 'bad_fio');
      if (!gender) throw E(400, 'bad_gender');
      if (foreign) { if (!/^[A-Z]{2}\d{7}$/.test(passport)) throw E(400, 'bad_passport'); if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) throw E(400, 'bad_birth'); }
      return { seat, fio, gender, passport: foreign ? passport : '', birth: foreign ? birth : '' };
    });
    if (clean.length !== held.length) throw E(409, 'hold_expired');
    const amount = t.price * clean.length, fee = Math.round((amount * FEE) / 100), id = rid(6);
    DB.orders.push({ id, user_id: me ? me.id : null, guest_key: who.guest, trip_id: t.id, phone, amount, fee, total: amount + fee, status: 'pending', sms_tries: 0, created_ms: Date.now(), created_at: nowL(), paid_at: null });
    clean.forEach((p) => {
      let number = ''; while (number.length < 10) number += Math.floor(Math.random() * 10);
      DB.tickets.push({ id: rid(8), order_id: id, trip_id: t.id, seat_no: p.seat, fio: p.fio, gender: p.gender, passport: p.passport, birth: p.birth, price: t.price, number, status: 'pending',
        depart_at: t.depart_at, arrive_at: t.arrive_at, platform: t.platform, duration: t.duration, bus_name: t.bus.name, bus_model: t.bus.model });
      delete DB.holds[t.id + ':' + p.seat];
    });
    return orderOut(DB.orders.find((o) => o.id === id));
  }
  if ((m = path.match(/^\/orders\/([a-f0-9]+)(?:\/(pay|confirm|return))?$/))) {
    const o = DB.orders.find((x) => x.id === m[1]);
    if (!o) throw E(404, 'order_not_found');
    if (!owns(o)) throw E(403, 'forbidden');
    if (!m[2] && method === 'GET') return orderOut(o);
    if (m[2] === 'pay') {
      if (o.status !== 'pending') throw E(409, o.status === 'expired' ? 'hold_expired' : 'order_closed');
      if (!luhn(body.number)) throw E(400, 'bad_card');
      if (!validExp(body.expiry)) throw E(400, 'bad_expiry');
      o.sms_tries = 0;
      return { needSms: true, phone: o.phone, demoCode: '123456' };
    }
    if (m[2] === 'confirm') {
      if (o.status !== 'pending') throw E(409, o.status === 'expired' ? 'hold_expired' : 'order_closed');
      if (o.sms_tries >= 5) throw E(429, 'too_many_tries');
      o.sms_tries++;
      if (String(body.code) !== '123456') throw E(400, 'bad_code');
      o.status = 'paid'; o.paid_at = nowL();
      DB.tickets.filter((k) => k.order_id === o.id && k.status === 'pending').forEach((k) => { k.status = 'active'; });
      const out = orderOut(o);
      note(o, 'paid', out.trip.from.uz + ' → ' + out.trip.to.uz + ' | ' + out.trip.departAt + ' | ' + out.tickets.map((x) => '#' + x.seat).join(', '));
      return out;
    }
    if (m[2] === 'return') return doReturn(DB.tickets.filter((k) => k.order_id === o.id && k.status === 'active'), o, note);
  }
  if (path === '/tickets' && method === 'GET') {
    const now = nowL(), st = q.status || 'active';
    return DB.tickets.filter((k) => {
      const o = DB.orders.find((x) => x.id === k.order_id);
      if (!o || !owns(o)) return false;
      if (st === 'returned') return k.status === 'returned';
      if (st === 'history') return k.status === 'active' && k.depart_at <= now;
      return k.status === 'active' && k.depart_at > now;
    }).sort((a, b) => (st === 'active' ? a.depart_at.localeCompare(b.depart_at) : b.depart_at.localeCompare(a.depart_at))).map(ticketOut);
  }
  if ((m = path.match(/^\/tickets\/([a-f0-9]+)(?:\/(return))?$/))) {
    const k = DB.tickets.find((x) => x.id === m[1]);
    if (!k) throw E(404, 'ticket_not_found');
    const o = DB.orders.find((x) => x.id === k.order_id);
    if (!owns(o)) throw E(403, 'forbidden');
    if (m[2]) return doReturn([k], o, note);
    return ticketOut(k);
  }
  if (path === '/auth/register') {
    const email = String(body.email || '').trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw E(400, 'bad_email');
    if (String(body.password || '').length < 6) throw E(400, 'short_password');
    if (DB.users.some((u) => u.email === email)) throw E(409, 'email_exists');
    const u = { id: DB.users.length + 1, email, pw: btoa(unescape(encodeURIComponent(body.password))), name: '', phone: '', lang: body.lang || 'uz' };
    DB.users.push(u);
    return session(u, who);
  }
  if (path === '/auth/login') {
    const u = DB.users.find((x) => x.email === String(body.email || '').trim().toLowerCase());
    if (!u || u.pw !== btoa(unescape(encodeURIComponent(body.password || '')))) throw E(401, 'bad_credentials');
    return session(u, who);
  }
  if (path === '/auth/logout') { if (who.token) delete DB.sessions[who.token]; return { ok: true }; }
  if (path === '/auth/forgot') {
    const email = String(body.email || '').trim().toLowerCase(), u = DB.users.find((x) => x.email === email);
    if (u) { DB.codes['reset:' + email] = '123456'; return { ok: true, demoCode: '123456' }; }
    return { ok: true };
  }
  if (path === '/auth/reset') {
    const email = String(body.email || '').trim().toLowerCase();
    if (String(body.password || '').length < 6) throw E(400, 'short_password');
    if (DB.codes['reset:' + email] !== String(body.code)) throw E(400, 'bad_code');
    const u = DB.users.find((x) => x.email === email);
    if (!u) throw E(400, 'bad_code');
    u.pw = btoa(unescape(encodeURIComponent(body.password)));
    delete DB.codes['reset:' + email];
    return { ok: true };
  }
  if (path === '/me') {
    if (!me) throw E(401, 'unauthorized');
    if (method === 'PUT') {
      const ph = String(body.phone || '').trim() ? normPhone(body.phone) : '';
      if (String(body.phone || '').trim() && !ph) throw E(400, 'bad_phone');
      me.name = String(body.name || '').trim().slice(0, 60); me.phone = ph; if (['uz', 'ru', 'en'].includes(body.lang)) me.lang = body.lang;
      return userOut(me);
    }
    if (method === 'DELETE') { DB.users = DB.users.filter((u) => u.id !== me.id); delete DB.sessions[who.token]; return { ok: true }; }
    return userOut(me);
  }
  if (path === '/restore/send') { if (!normPhone(body.phone)) throw E(400, 'bad_phone'); return { ok: true, demoCode: '123456' }; }
  if (path === '/restore/verify') {
    const phone = normPhone(body.phone);
    if (!phone) throw E(400, 'bad_phone');
    if (String(body.code) !== '123456') throw E(400, 'bad_code');
    const os = DB.orders.filter((o) => o.phone === phone && (o.status === 'paid' || o.status === 'returned'));
    os.forEach((o) => { if (me) o.user_id = me.id; else o.guest_key = who.guest; });
    return { restored: DB.tickets.filter((k) => os.some((o) => o.id === k.order_id)).length };
  }
  if (path === '/notifications') return DB.notes.filter((n) => (me && n.user_id === me.id) || (who.guest && n.guest_key === who.guest)).slice(0, 50).map((n) => ({ id: n.id, kind: n.kind, body: n.body, createdAt: n.createdAt }));
  throw E(404, 'not_found');
}

function session(u, who) {
  const token = rid(24);
  DB.sessions[token] = u.id;
  if (who.guest) DB.orders.forEach((o) => { if (o.guest_key === who.guest && !o.user_id) o.user_id = u.id; });
  return { token, user: userOut(u) };
}

function doReturn(rows, o, note) {
  const now = nowL();
  let refund = 0, n = 0;
  rows.forEach((k) => {
    if (k.status !== 'active') return;
    if (diffMin(now, k.depart_at) < RETURN_MIN) throw E(400, 'return_closed');
    k.status = 'returned'; refund += k.price; n++;
  });
  if (!n) throw E(400, 'nothing_to_return');
  if (!DB.tickets.some((k) => k.order_id === o.id && k.status === 'active')) o.status = 'returned';
  note(o, 'returned', n + ' | ' + refund);
  return { returned: n, refund };
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = typeof input === 'string' ? input : input.url;
  let m;
  if ((m = url.match(/^\/i18n\/(uz|ru|en)\.json$/))) return new Response(JSON.stringify(DICTS[m[1]]), { status: 200, headers: { 'content-type': 'application/json' } });
  if (!url.startsWith('/api/')) return realFetch(input, init);
  const [p, qs] = url.slice(4).split('?');
  const h = init.headers || {};
  const who = { guest: h['x-guest'] || null, token: (h.authorization || '').replace(/^Bearer /, '') || null };
  let status = 200, data;
  try {
    data = handle((init.method || 'GET').toUpperCase(), p, Object.fromEntries(new URLSearchParams(qs || '')), init.body ? JSON.parse(init.body) : {}, who);
    save();
  } catch (e) {
    if (e && e.status) { status = e.status; data = { error: e.code, ...(e.extra || {}) }; save(); }
    else { console.error(e); status = 500; data = { error: 'server_error' }; }
  }
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
};

// QR rasmlar: /api/tickets/<id>/qr.svg manzilini chipta raqamidan yasalgan rasm bilan almashtirish
export function ticketNumberById(id) { const k = DB.tickets.find((x) => x.id === id); return k && k.number; }
