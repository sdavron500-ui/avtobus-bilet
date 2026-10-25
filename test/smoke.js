// To'liq oqim sinovi: qidirish -> o'rin ushlash -> buyurtma -> to'lov -> qaytarish -> admin
// Ishga tushirish: npm test  (vaqtinchalik baza ishlatadi)
const os = require('os');
const fs = require('fs');
const path = require('path');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'bilet-test-'));
process.env.ADMIN_PASSWORD = 'test-admin';
process.env.DEMO = '1';

const assert = require('assert');
const app = require('../server/index.js');

let base;
const guest = 'guest-test-key-1';
async function api(method, url, body, headers = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', 'x-guest': guest, ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

(async () => {
  const server = app.listen(0);
  base = 'http://127.0.0.1:' + server.address().port;
  let n = 0;
  const ok = (name, cond) => { assert.ok(cond, name); console.log('  ok', ++n, name); };

  const cities = (await api('GET', '/api/cities')).data;
  ok('shaharlar bor', cities.length >= 10);
  const tosh = cities.find((c) => c.uz === 'Toshkent').id;
  const sam = cities.find((c) => c.uz === 'Samarqand').id;

  const trips = (await api('GET', `/api/trips?from=${tosh}&to=${sam}`)).data;
  ok('Toshkent-Samarqand reyslari bor', trips.length > 3);
  // Qaytarish qoidasi vaqtga bog'liq, shuning uchun ertangi yoki undan keyingi reysni olamiz
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(0, 10);
  const trip = trips.find((t) => t.departAt.slice(0, 10) > today);
  ok('reys kelajakda', !!trip);

  const map1 = (await api('GET', `/api/trips/${trip.id}`)).data;
  ok('o\'rinlar xaritasi', map1.seats.length === trip.total && map1.seats.every((s) => s.status === 'free'));

  // 1) o'rin ushlash
  let h = await api('POST', '/api/holds', { tripId: trip.id, seats: [3, 4] });
  ok('hold 200', h.status === 200 && h.data.holdToken);
  const token = h.data.holdToken;
  const other = await api('POST', '/api/holds', { tripId: trip.id, seats: [4] });
  ok('boshqa mijoz band o\'rinni ola olmaydi (409)', other.status === 409);
  const map2 = (await api('GET', `/api/trips/${trip.id}`)).data;
  ok('ushlangan o\'rin held ko\'rinadi', map2.seats[2].status === 'held');
  const map2me = (await api('GET', `/api/trips/${trip.id}?hold=${token}`)).data;
  ok('o\'zi uchun bo\'sh ko\'rinadi', map2me.seats[2].status === 'free');

  // 2) buyurtma
  let o = await api('POST', '/api/orders', {
    tripId: trip.id, holdToken: token, phone: '90 123 45 67',
    passengers: [{ seat: 3, fio: 'Ali Valiyev', gender: 'm' }, { seat: 4, fio: 'Madina Valiyeva', gender: 'f' }]
  });
  ok('buyurtma yaratildi', o.status === 200 && o.data.status === 'pending');
  ok('narx va yig\'im', o.data.amount === trip.price * 2 && o.data.fee === Math.round(trip.price * 2 * 0.02) && o.data.total === o.data.amount + o.data.fee);
  const orderId = o.data.id;
  ok('boshqa mehmon buyurtmani ko\'ra olmaydi', (await api('GET', `/api/orders/${orderId}`, null, { 'x-guest': 'someone-else-key' })).status === 403);

  // 3) to'lov
  ok('noto\'g\'ri karta rad etiladi', (await api('POST', `/api/orders/${orderId}/pay`, { number: '1234 5678 9012 3456', expiry: '12/30' })).status === 400);
  const pay = await api('POST', `/api/orders/${orderId}/pay`, { number: '4242 4242 4242 4242', expiry: '12/39' });
  ok('karta qabul qilindi, SMS so\'raladi', pay.status === 200 && pay.data.needSms);
  ok('noto\'g\'ri SMS kod rad etiladi', (await api('POST', `/api/orders/${orderId}/confirm`, { code: '000000' })).status === 400);
  const paid = await api('POST', `/api/orders/${orderId}/confirm`, { code: '123456' });
  ok('to\'lov tasdiqlandi', paid.status === 200 && paid.data.status === 'paid' && paid.data.tickets.every((t) => t.status === 'active'));
  ok('chipta raqami 10 xonali', /^\d{10}$/.test(paid.data.tickets[0].number));

  // 4) chiptalarim, QR
  const mine = (await api('GET', '/api/tickets?status=active')).data;
  ok('faol chiptalar 2 ta', mine.length === 2);
  const qr = await fetch(base + `/api/tickets/${mine[0].id}/qr.svg`);
  ok('QR svg', qr.status === 200 && (await qr.text()).includes('<svg'));
  ok('boshqa mehmonga chiptalar ko\'rinmaydi', (await api('GET', '/api/tickets?status=active', null, { 'x-guest': 'someone-else-key' })).data.length === 0);

  // 5) band o'rin endi sotilmaydi
  ok('sotilgan o\'rinni ushlab bo\'lmaydi', (await api('POST', '/api/holds', { tripId: trip.id, seats: [3] }, { 'x-guest': 'x-guest-2-key' })).status === 409);
  const map3 = (await api('GET', `/api/trips/${trip.id}`)).data;
  ok('jins bilan taken', map3.seats[2].status === 'taken' && map3.seats[2].gender === 'm' && map3.seats[3].gender === 'f');

  // 6) qaytarish
  const ret = await api('POST', `/api/tickets/${mine[0].id}/return`);
  ok('bitta chipta qaytarildi', ret.status === 200 && ret.data.refund === trip.price);
  ok('qaytarilganlar ro\'yxati', (await api('GET', '/api/tickets?status=returned')).data.length === 1);
  const retAll = await api('POST', `/api/orders/${orderId}/return`);
  ok('qolgani qaytarildi', retAll.status === 200 && retAll.data.returned === 1);
  ok('o\'rin yana bo\'sh', (await api('GET', `/api/trips/${trip.id}`)).data.seats[2].status === 'free');

  // 7) auth
  const reg = await api('POST', '/api/auth/register', { email: 'Test@Example.com', password: 'secret1' });
  ok('ro\'yxatdan o\'tish', reg.status === 200 && reg.data.token);
  ok('takroriy email rad etiladi', (await api('POST', '/api/auth/register', { email: 'test@example.com', password: 'secret1' })).status === 409);
  ok('noto\'g\'ri parol', (await api('POST', '/api/auth/login', { email: 'test@example.com', password: 'wrong' })).status === 401);
  const login = await api('POST', '/api/auth/login', { email: 'test@example.com', password: 'secret1' });
  const auth = { authorization: 'Bearer ' + login.data.token };
  ok('tizimga kirish', login.status === 200);
  ok('mehmon buyurtmalari akkauntga o\'tdi', (await api('GET', '/api/tickets?status=returned', null, { ...auth, 'x-guest': 'new-device-key-1' })).data.length === 2);
  const fg = await api('POST', '/api/auth/forgot', { email: 'test@example.com' });
  const rs = await api('POST', '/api/auth/reset', { email: 'test@example.com', code: fg.data.demoCode, password: 'newpass1' });
  ok('parolni tiklash', rs.status === 200);
  ok('yangi parol bilan kirish', (await api('POST', '/api/auth/login', { email: 'test@example.com', password: 'newpass1' })).status === 200);
  ok('eski token bekor', (await api('GET', '/api/me', null, auth)).status === 401);

  // 8) chiptalarni tiklash
  const rsend = await api('POST', '/api/restore/send', { phone: '901234567' });
  const rver = await api('POST', '/api/restore/verify', { phone: '901234567', code: rsend.data.demoCode }, { 'x-guest': 'restored-device-1' });
  ok('telefon bo\'yicha tiklash', rver.status === 200 && rver.data.restored === 2);

  // 9) validatsiya
  const h2 = await api('POST', '/api/holds', { tripId: trip.id, seats: [10] });
  ok('noto\'g\'ri ism rad etiladi', (await api('POST', '/api/orders', { tripId: trip.id, holdToken: h2.data.holdToken, phone: '901234567', passengers: [{ seat: 10, fio: '123', gender: 'm' }] })).status === 400);
  ok('noto\'g\'ri telefon rad etiladi', (await api('POST', '/api/orders', { tripId: trip.id, holdToken: h2.data.holdToken, phone: '12', passengers: [{ seat: 10, fio: 'Ali Vali', gender: 'm' }] })).status === 400);
  ok('hold orqali boshqa o\'rin sotib bo\'lmaydi', (await api('POST', '/api/orders', { tripId: trip.id, holdToken: h2.data.holdToken, phone: '901234567', passengers: [{ seat: 11, fio: 'Ali Vali', gender: 'm' }] })).status === 409);
  const foreign = (await api('GET', '/api/trips?scope=foreign')).data[0];
  const h3 = await api('POST', '/api/holds', { tripId: foreign.id, seats: [1] });
  ok('xalqaro reysda pasport majburiy', (await api('POST', '/api/orders', { tripId: foreign.id, holdToken: h3.data.holdToken, phone: '901234567', passengers: [{ seat: 1, fio: 'Ali Vali', gender: 'm' }] })).data.error === 'bad_passport');

  // 10) admin
  ok('admin tokensiz rad etiladi', (await api('GET', '/api/admin/stats')).status === 401);
  ok('admin noto\'g\'ri parol', (await api('POST', '/api/admin/login', { password: 'nope' })).status === 401);
  const al = await api('POST', '/api/admin/login', { password: 'test-admin' });
  const A = { 'x-admin': al.data.token };
  ok('admin kirdi', al.status === 200);
  ok('statistika', (await api('GET', '/api/admin/stats', null, A)).data.revenue > 0);
  ok('o\'rinni bloklash', (await api('POST', `/api/admin/trips/${trip.id}/block`, { seat: 20, reason: 'kassa' }, A)).status === 200);
  ok('bloklangan o\'rin mijozga band', (await api('GET', `/api/trips/${trip.id}`)).data.seats[19].status === 'blocked');
  ok('bloklangan o\'rinni ushlab bo\'lmaydi', (await api('POST', '/api/holds', { tripId: trip.id, seats: [20] })).status === 409);
  ok('blokni olib tashlash', (await api('DELETE', `/api/admin/trips/${trip.id}/block/20`, null, A)).status === 200);
  const newTrip = await api('POST', '/api/admin/trips', { from_id: tosh, to_id: sam, depart_at: '2099-01-01T10:00', duration_min: 240, price: 99000, bus_id: 1, platform: '9' }, A);
  ok('yangi reys qo\'shish', newTrip.status === 200);
  ok('chipta tekshirish', (await api('GET', `/api/admin/ticket/${paid.data.tickets[0].number}`, null, A)).data.valid === false);
  ok('admin buyurtmalar', (await api('GET', '/api/admin/orders', null, A)).data.length >= 1);

  server.close();
  console.log(`\nHammasi yaxshi: ${n} ta tekshiruv o'tdi.`);
  process.exit(0);
})().catch((e) => { console.error('\nXATO:', e.message); console.error(e.stack); process.exit(1); });
