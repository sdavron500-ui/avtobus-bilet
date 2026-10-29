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
const { db } = require('../server/db');
const { seed } = require('../server/seed');
const { nowLocal, addDays, addMinutes } = require('../server/util');
const cfg = require('../server/config');

assert.strictEqual(typeof require('node:sqlite').DatabaseSync, 'function', 'Node must provide built-in SQLite');
assert.strictEqual(require('../package.json').dependencies['better-sqlite3'], undefined, 'database must not require native addon compilation');
assert.strictEqual(cfg.HOST, '127.0.0.1', 'server should stay local unless LAN access is enabled');
assert.strictEqual(db.prepare('SELECT COUNT(*) c FROM cities').get().c, 0, 'server start must not add demo data');
seed();
const fixtureCities = db.prepare('SELECT id, name_uz, country FROM cities').all();
const fixtureFrom = fixtureCities.find((city) => city.name_uz === 'Toshkent').id;
const fixtureTo = fixtureCities.find((city) => city.name_uz === 'Samarqand').id;
const fixtureForeign = fixtureCities.find((city) => city.country !== 'UZ').id;
const fixtureSchedules = db.prepare('SELECT * FROM schedules WHERE from_id = ? AND to_id = ?').all(fixtureFrom, fixtureTo);
const allFixtureSchedules = db.prepare('SELECT * FROM schedules').all();
const addFixtureTrip = db.prepare(`INSERT INTO trips
  (schedule_id, from_id, to_id, depart_at, arrive_at, duration_min, price, bus_id, platform)
  VALUES (?,?,?,?,?,?,?,?,?)`);
for (let day = 1; day <= 2; day++) {
  for (const schedule of allFixtureSchedules) {
    const departAt = addDays(nowLocal().slice(0, 10), day) + ' ' + schedule.depart_time;
    addFixtureTrip.run(null, schedule.from_id, schedule.to_id, departAt,
      addMinutes(departAt, schedule.duration_min), schedule.duration_min, schedule.price,
      schedule.bus_id, schedule.platform);
  }
}
const localFixtureSchedules = allFixtureSchedules.filter((schedule) =>
  fixtureCities.find((city) => city.id === schedule.from_id).country === 'UZ' &&
  fixtureCities.find((city) => city.id === schedule.to_id).country === 'UZ');
for (let i = 0; i < 50; i++) {
  const schedule = localFixtureSchedules[i % localFixtureSchedules.length];
  const departAt = addDays(nowLocal().slice(0, 10), 3) + ' ' + schedule.depart_time;
  addFixtureTrip.run(null, schedule.from_id, schedule.to_id, departAt,
    addMinutes(departAt, schedule.duration_min), schedule.duration_min, schedule.price,
    schedule.bus_id, schedule.platform);
}
const legacySchedule = fixtureSchedules[0];
const legacyDepartAt = addDays(nowLocal().slice(0, 10), 1) + ' ' + legacySchedule.depart_time;
addFixtureTrip.run(legacySchedule.id, legacySchedule.from_id, legacySchedule.to_id, legacyDepartAt,
  addMinutes(legacyDepartAt, legacySchedule.duration_min), legacySchedule.duration_min,
  legacySchedule.price, legacySchedule.bus_id, legacySchedule.platform);

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
  const qrScannerAsset = await fetch(base + '/vendor/zxing/zxing-browser.min.js');
  ok('admin kamera QR skaner kutubxonasi lokal serverdan yuklanadi',
    qrScannerAsset.status === 200 && (await qrScannerAsset.text()).includes('ZXingBrowser'));
  const tosh = cities.find((c) => c.uz === 'Toshkent').id;
  const sam = cities.find((c) => c.uz === 'Samarqand').id;

  const trips = (await api('GET', `/api/trips?from=${tosh}&to=${sam}`)).data;
  ok('Toshkent-Samarqand reyslari bor', trips.length > 3);
  const firstTripPage = (await api('GET', '/api/trips?scope=local&offset=0')).data;
  const secondTripPage = (await api('GET', '/api/trips?scope=local&offset=100')).data;
  ok('barcha reyslar ro\'yxati keyingi sahifalarni ham oladi',
    firstTripPage.length === 100 && secondTripPage.length > 0 &&
    !firstTripPage.some((item) => secondTripPage.some((next) => next.id === item.id)));
  ok('reyslar sahifasining noto\'g\'ri offset qiymati rad etiladi',
    (await api('GET', '/api/trips?offset=-1')).status === 400);
  // Qaytarish qoidasi vaqtga bog'liq, shuning uchun ertangi yoki undan keyingi reysni olamiz
  const today = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Tashkent' }).slice(0, 10);
  const trip = trips.find((t) => t.departAt.slice(0, 10) > today);
  ok('reys kelajakda', !!trip);

  const cashTrip = trips.find((candidate) => candidate.id !== trip.id);
  const cashHold = await api('POST', '/api/holds', { tripId: cashTrip.id, seats: [5] });
  const cashOrder = await api('POST', '/api/orders', {
    tripId: cashTrip.id, holdToken: cashHold.data.holdToken, phone: '90 123 45 67',
    passengers: [{ seat: 5, fio: 'Olim Valiyev', gender: 'm' }]
  });
  const cashSelected = await api('POST', `/api/orders/${cashOrder.data.id}/cash`);
  const cashOrderId = cashOrder.data.id;
  const paymentConfig = (await api('GET', '/api/config')).data;
  ok('mijoz naqd to\'lovni tanlaydi va buyurtma kassaga yoziladi',
    cashSelected.status === 200 && cashSelected.data.paymentMethod === 'cash' && cashSelected.data.status === 'pending');
  ok('naqd to\'lov tanlanganda chipta kassir tasdig\'igacha faol bo\'lmaydi',
    cashSelected.data.tickets.length === 1 && cashSelected.data.tickets[0].status === 'pending');
  db.prepare('UPDATE orders SET created_ms = ? WHERE id = ?').run(Date.now() - cfg.HOLD_MS - 1000, cashOrderId);
  const extendedCashOrder = await api('GET', `/api/orders/${cashOrderId}`);
  ok('naqd buyurtma 10 daqiqalik ushlashdan uzoq saqlanadi',
    paymentConfig.cashHoldCutoffMinutes === 60 && paymentConfig.noShowContactHours === 24 &&
    extendedCashOrder.status === 200 && extendedCashOrder.data.status === 'pending' &&
    extendedCashOrder.data.expiresAt > Date.now() + 10 * 60 * 1000);
  const pendingQr = await fetch(base + `/api/tickets/${cashSelected.data.tickets[0].id}/qr.svg`);
  ok('kassada kutayotgan naqd chipta uchun ID asosidagi QR kodi beriladi',
    pendingQr.status === 200 && (await pendingQr.text()).includes('<svg'));
  const pendingTicket = await api('GET', `/api/tickets/${cashSelected.data.tickets[0].id}`);
  ok('mijoz naqd chipta IDsi va to‘lov usulini ko‘radi',
    pendingTicket.status === 200 && pendingTicket.data.paymentMethod === 'cash');
  ok('naqd buyurtma uchun karta SMS tasdig\'i ishlamaydi',
    (await api('POST', `/api/orders/${cashOrderId}/confirm`, { code: '123456' })).status === 409);
  const cutoffTrip = trips.find((candidate) => candidate.id !== trip.id && candidate.id !== cashTrip.id);
  const cutoffHold = await api('POST', '/api/holds', { tripId: cutoffTrip.id, seats: [8] });
  const cutoffOrder = await api('POST', '/api/orders', {
    tripId: cutoffTrip.id, holdToken: cutoffHold.data.holdToken, phone: '90 123 45 67',
    passengers: [{ seat: 8, fio: 'Olim Valiyev', gender: 'm' }]
  });
  const cutoffDepartAt = db.prepare('SELECT depart_at FROM trips WHERE id = ?').get(cutoffTrip.id).depart_at;
  db.prepare('UPDATE trips SET depart_at = ? WHERE id = ?').run(
    addMinutes(nowLocal(), cfg.CASH_HOLD_CUTOFF_MINUTES - 1), cutoffTrip.id);
  const rejectedCash = await api('POST', `/api/orders/${cutoffOrder.data.id}/cash`);
  db.prepare('UPDATE trips SET depart_at = ? WHERE id = ?').run(cutoffDepartAt, cutoffTrip.id);
  ok('jo‘nashga bir soatdan kam qolganda naqd buyurtma qabul qilinmaydi',
    rejectedCash.status === 409 && rejectedCash.data.error === 'cash_cutoff');

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
  const pendingCardQr = await fetch(base + `/api/tickets/${o.data.tickets[0].id}/qr.svg`);
  ok('to‘lov hali yakunlanmagan chipta uchun ham skanerlash QR kodi beriladi',
    pendingCardQr.status === 200 && (await pendingCardQr.text()).includes('<svg'));
  ok('boshqa mehmon buyurtmani ko\'ra olmaydi', (await api('GET', `/api/orders/${orderId}`, null, { 'x-guest': 'someone-else-key' })).status === 403);

  // 3) to'lov
  ok('noto\'g\'ri karta rad etiladi', (await api('POST', `/api/orders/${orderId}/pay`, { number: '1234 5678 9012 3456', expiry: '12/30' })).status === 400);
  const pay = await api('POST', `/api/orders/${orderId}/pay`, { number: '4242 4242 4242 4242', expiry: '12/39' });
  ok('karta qabul qilindi, SMS so\'raladi', pay.status === 200 && pay.data.needSms);
  ok('karta to\'lovi boshlanganidan keyin naqd usulga almashtirib bo\'lmaydi',
    (await api('POST', `/api/orders/${orderId}/cash`)).status === 409);
  ok('noto\'g\'ri SMS kod rad etiladi', (await api('POST', `/api/orders/${orderId}/confirm`, { code: '000000' })).status === 400);
  const paid = await api('POST', `/api/orders/${orderId}/confirm`, { code: '123456' });
  ok('to\'lov tasdiqlandi', paid.status === 200 && paid.data.status === 'paid' && paid.data.tickets.every((t) => t.status === 'active'));
  ok('chipta raqami 10 xonali', /^\d{10}$/.test(paid.data.tickets[0].number));

  // 4) chiptalarim, QR
  const mine = (await api('GET', '/api/tickets?status=active')).data;
  ok('faol chiptalar 2 ta', mine.length === 2);
  const qr = await fetch(base + `/api/tickets/${mine[0].id}/qr.svg`);
  ok('QR svg', qr.status === 200 && (await qr.text()).includes('<svg'));
  const originalDepartAt = db.prepare('SELECT depart_at FROM trips WHERE id = ?').get(trip.id).depart_at;
  const ticketPath = `/api/tickets/${mine[0].id}`;
  db.prepare('UPDATE trips SET depart_at = ? WHERE id = ?').run(addMinutes(nowLocal(), 10), trip.id);
  const beforeDepartureTicket = await api('GET', ticketPath);
  db.prepare('UPDATE trips SET depart_at = ? WHERE id = ?').run(addMinutes(nowLocal(), -10), trip.id);
  const withinNoShowWindowTicket = await api('GET', ticketPath);
  db.prepare('UPDATE trips SET depart_at = ? WHERE id = ?').run(
    addMinutes(nowLocal(), -(cfg.NO_SHOW_CONTACT_HOURS * 60 + 1)), trip.id);
  const outsideNoShowWindowTicket = await api('GET', ticketPath);
  db.prepare('UPDATE trips SET depart_at = ? WHERE id = ?').run(originalDepartAt, trip.id);
  ok('no-show aloqa muddati jo‘nashdan keyingi 24 soat bilan cheklanadi',
    beforeDepartureTicket.data.noShowContactOpen === false &&
    withinNoShowWindowTicket.data.noShowContactOpen === true &&
    withinNoShowWindowTicket.data.noShowContactHours === 24 &&
    outsideNoShowWindowTicket.data.noShowContactOpen === false);
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
  ok('admin hisobotiga tokensiz kirib bo‘lmaydi', (await api('GET', '/api/admin/reports/buses')).status === 401);
  ok('admin kassadagi sotuviga tokensiz kirib bo‘lmaydi',
    (await api('POST', `/api/admin/trips/${trip.id}/sales`, {
      seat: 39, fio: 'Olim Valiyev', gender: 'm', phone: '901112299', paymentMethod: 'cash'
    })).status === 401);
  ok('naqd to\'lovni admin tasdig\'isiz qabul qilib bo\'lmaydi',
    (await api('POST', `/api/admin/orders/${cashOrderId}/cash/confirm`)).status === 401);
  ok('admin noto\'g\'ri parol', (await api('POST', '/api/admin/login', { password: 'nope' })).status === 401);
  const al = await api('POST', '/api/admin/login', { password: 'test-admin' });
  const A = { 'x-admin': al.data.token };
  ok('admin kirdi', al.status === 200);
  ok('chipta skaneridagi ID tekshiruvi adminsiz ishlamaydi',
    (await api('GET', `/api/admin/ticket/${cashSelected.data.tickets[0].id}`)).status === 401);
  const scannedCash = await api('GET', `/api/admin/ticket/TICKET:${cashSelected.data.tickets[0].id}`, null, A);
  ok('QR ID skanerlashda yo‘nalish, yo‘lovchi va naqd to‘lov ma’lumoti chiqadi',
    scannedCash.status === 200 && scannedCash.data.cashPending &&
    scannedCash.data.paymentMethod === 'cash' && scannedCash.data.fio === 'Olim Valiyev' &&
    scannedCash.data.seat === 5 && scannedCash.data.route.includes('Toshkent'));
  ok('skaner eski 10 xonali chipta raqamini ham qabul qiladi',
    (await api('GET', `/api/admin/ticket/${cashSelected.data.tickets[0].number}`, null, A)).data.id ===
      cashSelected.data.tickets[0].id);
  ok('skaner noto‘g‘ri chipta identifikatorini rad etadi',
    (await api('GET', '/api/admin/ticket/not-a-ticket', null, A)).status === 400);
  ok('buyurtma chiptalarining batafsil ma’lumoti adminsiz ochilmaydi',
    (await api('GET', `/api/admin/orders/${cashOrderId}`)).status === 401);
  const orderDetails = await api('GET', `/api/admin/orders/${cashOrderId}`, null, A);
  ok('admin buyurtmadan QR/chop etish uchun to‘liq chipta ma’lumotlarini oladi',
    orderDetails.status === 200 && orderDetails.data.tickets.length === 1 &&
    orderDetails.data.tickets[0].id === cashSelected.data.tickets[0].id &&
    orderDetails.data.tickets[0].number === cashSelected.data.tickets[0].number &&
    orderDetails.data.tickets[0].fio === 'Olim Valiyev' &&
    orderDetails.data.tickets[0].phone === '+998901234567');
  const groupedOrders = await api('GET', '/api/admin/orders', null, A);
  ok('buyurtmalar javobida reys bo‘yicha guruhlash va chipta raqami uchun kalitlar bor',
    groupedOrders.status === 200 && groupedOrders.data.some((order) =>
      order.id === cashOrderId && order.trip_id === cashTrip.id &&
      order.ticket_numbers.includes(cashSelected.data.tickets[0].number)));
  const searchedByPhone = await api('GET', '/api/admin/orders?q=901234567', null, A);
  const searchedByName = await api('GET', '/api/admin/orders?q=Olim%20Valiyev', null, A);
  const searchedByNumber = await api('GET',
    `/api/admin/orders?q=${cashSelected.data.tickets[0].number}`, null, A);
  ok('admin buyurtmalarni telefon, ism/familiya va chipta raqami bilan qidira oladi',
    [searchedByPhone, searchedByName, searchedByNumber].every((result) =>
      result.status === 200 && result.data.some((order) => order.id === cashOrderId)));
  const expiryHold = await api('POST', '/api/holds', { tripId: cutoffTrip.id, seats: [6] });
  const expiryOrder = await api('POST', '/api/orders', {
    tripId: cutoffTrip.id, holdToken: expiryHold.data.holdToken, phone: '90 123 45 67',
    passengers: [{ seat: 6, fio: 'Ali Valiyev', gender: 'm' }]
  });
  const expiryCash = await api('POST', `/api/orders/${expiryOrder.data.id}/cash`);
  const expiryTripDepartAt = db.prepare('SELECT depart_at FROM trips WHERE id = ?').get(cutoffTrip.id).depart_at;
  db.prepare('UPDATE trips SET depart_at = ? WHERE id = ?').run(
    addMinutes(nowLocal(), cfg.CASH_HOLD_CUTOFF_MINUTES - 1), cutoffTrip.id);
  const expiredCashOrder = await api('GET', `/api/orders/${expiryOrder.data.id}`);
  const expiredCashQr = await fetch(base + `/api/tickets/${expiryCash.data.tickets[0].id}/qr.svg`);
  db.prepare('UPDATE trips SET depart_at = ? WHERE id = ?').run(expiryTripDepartAt, cutoffTrip.id);
  ok('naqd joy jo‘nashdan bir soat oldin bo‘shaydi, QR esa holatni tekshirish uchun qoladi',
    expiryCash.status === 200 && expiredCashOrder.data.status === 'expired' &&
    expiredCashQr.status === 200 && (await expiredCashQr.text()).includes('<svg'));
  const saleConfig = await api('GET', '/api/admin/sales-config', null, A);
  ok('kassadagi sotuvning xizmat haqi va karta demo holati API orqali beriladi',
    saleConfig.status === 200 && saleConfig.data.feePercent === 2 && saleConfig.data.demoCardPayments === true);
  const outboundReportTrip = await api('POST', '/api/admin/trips', {
    from_id: tosh, to_id: sam, depart_at: '2099-03-01T10:00', duration_min: 240, price: 100000, bus_id: 1
  }, A);
  const returnReportTrip = await api('POST', '/api/admin/trips', {
    from_id: sam, to_id: tosh, depart_at: '2099-03-01T15:00', duration_min: 240, price: 120000, bus_id: 1
  }, A);
  const outboundSale = await api('POST', `/api/admin/trips/${outboundReportTrip.data.id}/sales`, {
    seat: 25, fio: 'Olim Valiyev', gender: 'm', phone: '901112233', paymentMethod: 'cash'
  }, A);
  const returnSale = await api('POST', `/api/admin/trips/${returnReportTrip.data.id}/sales`, {
    seat: 26, fio: 'Madina Valiyeva', gender: 'f', phone: '901112244', paymentMethod: 'card'
  }, A);
  ok('admin naqd to‘lov bilan mijozni reysga joylashtiradi',
    outboundSale.status === 200 && outboundSale.data.status === 'paid' && outboundSale.data.paymentMethod === 'cash' &&
    /^\d{10}$/.test(outboundSale.data.ticketNumber));
  ok('admin karta to‘lovini va chipta raqamini qayd etadi',
    returnSale.status === 200 && returnSale.data.status === 'paid' && returnSale.data.paymentMethod === 'card' &&
    /^\d{10}$/.test(returnSale.data.ticketNumber));
  ok('band o‘ringa ikkinchi yo‘lovchini joylashtirib bo‘lmaydi',
    (await api('POST', `/api/admin/trips/${outboundReportTrip.data.id}/sales`, {
      seat: 25, fio: 'Ali Valiyev', gender: 'm', phone: '901112255', paymentMethod: 'cash'
    }, A)).status === 409);
  const busReport = await api('GET', '/api/admin/reports/buses?from=2099-03-01&to=2099-03-01', null, A);
  const reportBus = busReport.data.buses.find((bus) => bus.id === 1);
  const outboundReport = reportBus && reportBus.trips.find((trip) => trip.id === outboundReportTrip.data.id);
  const returnReport = reportBus && reportBus.trips.find((trip) => trip.id === returnReportTrip.data.id);
  ok('hisobotda bir avtobusning teskari yo‘nalishdagi reyslari borib-qaytish sifatida bog‘lanadi',
    busReport.status === 200 && reportBus.roundTrips === 1 && reportBus.averageOccupancy === 2.5 &&
    outboundReport.pairedTripId === returnReportTrip.data.id &&
    returnReport.isReturn && returnReport.pairedTripId === outboundReportTrip.data.id);
  const outboundPassengers = await api('GET',
    `/api/admin/reports/trips/${outboundReportTrip.data.id}/passengers`, null, A);
  ok('hisobotdagi yo‘lovchi/o‘rin soni bosilganda ism, telefon, jins va o‘rni beriladi',
    outboundPassengers.status === 200 && outboundPassengers.data.passengers.length === 1 &&
    outboundPassengers.data.passengers[0].seat === 25 &&
    outboundPassengers.data.passengers[0].fio === 'Olim Valiyev' &&
    outboundPassengers.data.passengers[0].gender === 'm' &&
    outboundPassengers.data.passengers[0].phone ===
      db.prepare('SELECT phone FROM orders WHERE id = ?').get(outboundSale.data.orderId).phone);
  ok('yo‘lovchi tafsilotlari avtorizatsiyasiz berilmaydi',
    (await api('GET', `/api/admin/reports/trips/${outboundReportTrip.data.id}/passengers`)).status === 401);
  ok('mavjud bo‘lmagan reys yo‘lovchilari so‘rovi rad etiladi',
    (await api('GET', '/api/admin/reports/trips/999999/passengers', null, A)).status === 404);
  ok('hisobot javobida eng ko‘p va eng kam qatnovlar ro‘yxati yo‘q',
    !Object.prototype.hasOwnProperty.call(busReport.data, 'rankings'));
  ok('reys hisoboti yo‘lovchi, bo‘sh o‘rin va tasdiqlangan tushumni ko‘rsatadi',
    outboundReport.passengers === 1 && outboundReport.freeSeats === 39 && outboundReport.revenue === 102000 &&
    outboundReport.cashRevenue === 102000 && returnReport.cardRevenue === 122400);
  ok('hisobotdagi noto‘g‘ri sana oralig‘i rad etiladi',
    (await api('GET', '/api/admin/reports/buses?from=2099-03-02&to=2099-03-01', null, A)).status === 400);
  ok('hisobotdagi mavjud bo‘lmagan sana rad etiladi',
    (await api('GET', '/api/admin/reports/buses?from=2099-02-31', null, A)).status === 400);
  const foreignSaleTrip = await api('POST', '/api/admin/trips', {
    from_id: tosh, to_id: fixtureForeign, depart_at: '2099-03-03T10:00', duration_min: 300, price: 100000, bus_id: 1
  }, A);
  const foreignSaleInput = { seat: 27, fio: 'Olim Valiyev', gender: 'm', phone: '901112266', paymentMethod: 'cash' };
  ok('xalqaro kassadagi sotuv pasportsiz rad etiladi',
    (await api('POST', `/api/admin/trips/${foreignSaleTrip.data.id}/sales`, foreignSaleInput, A)).status === 400);
  const foreignSale = await api('POST', `/api/admin/trips/${foreignSaleTrip.data.id}/sales`, {
    ...foreignSaleInput, passport: 'AA1234567', birth: '2000-01-01'
  }, A);
  ok('xalqaro kassadagi sotuv pasport va tug‘ilgan sanani saqlaydi',
    foreignSale.status === 200 && db.prepare('SELECT passport, birth FROM tickets WHERE number = ?')
      .get(foreignSale.data.ticketNumber).passport === 'AA1234567');
  const cashAdminOrders = (await api('GET', '/api/admin/orders', null, A)).data;
  const cashRow = cashAdminOrders.find((order) => order.id === cashOrderId);
  ok('admin buyurtmalarida kassada kutayotgan naqd buyurtma ko\'rinadi',
    !!cashRow && cashRow.payment_method === 'cash' && cashRow.status === 'pending');
  const cashPaid = await api('POST', `/api/admin/orders/${cashOrderId}/cash/confirm`, null, A);
  ok('kassir naqd pulni admin paneldan tasdiqlaydi',
    cashPaid.status === 200 && cashPaid.data.status === 'paid' && cashPaid.data.paymentMethod === 'cash');
  ok('naqd to\'lov tasdiqlangach chiptalar faollashadi',
    cashPaid.data.tickets.length === 1 && cashPaid.data.tickets[0].status === 'active');
  ok('naqd to\'lov tasdiqlangach yo\'lovchiga bildirishnoma bor',
    (await api('GET', '/api/notifications')).data.some((n) => n.kind === 'paid'));
  ok('naqd buyurtmani ikki marta to\'lab bo\'lmaydi',
    (await api('POST', `/api/admin/orders/${cashOrderId}/cash/confirm`, null, A)).status === 409);
  const stats = (await api('GET', '/api/admin/stats', null, A)).data;
  ok('statistika', stats.revenue > 0);
  ok('admin reyslar ro\'yxatida bo\'sh avtomatik andozalar ko\'rinmaydi',
    !(await api('GET', '/api/admin/trips', null, A)).data.some((t) => t.id === db.prepare("SELECT id FROM trips WHERE schedule_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM tickets WHERE trip_id = trips.id) LIMIT 1").get().id));
  ok('o\'rinni bloklash', (await api('POST', `/api/admin/trips/${trip.id}/block`, { seat: 20, reason: 'kassa' }, A)).status === 200);
  ok('bloklangan o\'rin mijozga band', (await api('GET', `/api/trips/${trip.id}`)).data.seats[19].status === 'blocked');
  ok('bloklangan o\'rinni ushlab bo\'lmaydi', (await api('POST', '/api/holds', { tripId: trip.id, seats: [20] })).status === 409);
  ok('blokni olib tashlash', (await api('DELETE', `/api/admin/trips/${trip.id}/block/20`, null, A)).status === 200);
  const newTrip = await api('POST', '/api/admin/trips', { from_id: tosh, to_id: sam, depart_at: '2099-01-01T10:00', duration_min: 240, price: 99000, bus_id: 1, platform: '9' }, A);
  ok('yangi reys qo\'shish', newTrip.status === 200);
  const newSchedule = await api('POST', '/api/admin/schedules', { from_id: tosh, to_id: sam, depart_time: '23:59', duration_min: 240, price: 99000, bus_id: 1 }, A);
  const scheduleId = newSchedule.data.id;
  const linkedTrips = db.prepare('SELECT COUNT(*) c FROM trips WHERE schedule_id = ?').get(scheduleId).c;
  ok('yangi andoza avtomatik reys yaratmaydi', newSchedule.status === 200 && linkedTrips === 0);
  const deletedSchedule = await api('DELETE', `/api/admin/schedules/${scheduleId}`, null, A);
  ok('jadval butunlay o\'chirildi', deletedSchedule.status === 200 && deletedSchedule.data.deletedTrips === linkedTrips);
  ok('jadval reyslari ham o\'chirildi', db.prepare('SELECT COUNT(*) c FROM trips WHERE schedule_id = ?').get(scheduleId).c === 0);
  ok('o\'chirilgan jadval ro\'yxatda yo\'q', !(await api('GET', '/api/admin/schedules', null, A)).data.some((s) => s.id === scheduleId));
  const todayTrip = await api('POST', '/api/admin/trips', { from_id: tosh, to_id: sam, depart_at: today + 'T00:01', duration_min: 240, price: 99000, bus_id: 1 }, A);
  const tomorrowTrip = await api('POST', '/api/admin/trips', { from_id: tosh, to_id: sam, depart_at: addDays(today, 1) + 'T10:00', duration_min: 240, price: 99000, bus_id: 1 }, A);
  const todayRows = (await api('GET', `/api/admin/trips?date=${today}&manual=1`, null, A)).data;
  const tomorrowRows = (await api('GET', `/api/admin/trips?date=${addDays(today, 1)}&manual=1`, null, A)).data;
  const allTomorrowTrips = (await api('GET', `/api/trips?date=${addDays(today, 1)}&scope=local`)).data;
  const scheduledTomorrow = db.prepare("SELECT id FROM trips WHERE schedule_id IS NOT NULL AND depart_at LIKE ? LIMIT 1").get(addDays(today, 1) + '%');
  ok('bugungi qo\'lda kiritilgan, o\'tgan vaqtli reys ham jadvalda ko\'rinadi', todayRows.some((t) => t.id === todayTrip.data.id));
  ok('ertangi qo\'lda kiritilgan reys jadvalda ko\'rinadi', tomorrowRows.some((t) => t.id === tomorrowTrip.data.id));
  ok('sana bo\'yicha qidiruvda turli yo\'nalishlardagi mahalliy reyslar ko\'rinadi',
    allTomorrowTrips.length > 1 && allTomorrowTrips.some((t) => t.to.id !== sam) &&
    allTomorrowTrips.every((t) => t.departAt.slice(0, 10) === addDays(today, 1)));
  ok('eski avtomatik andoza reyslari qo\'lda kiritilganlar ro\'yxatiga qo\'shilmaydi', !tomorrowRows.some((t) => scheduledTomorrow && t.id === scheduledTomorrow.id));
  ok('eski andoza reyslari mijoz qidiruvida ko\'rinmaydi', !(await api('GET', `/api/trips?from=${tosh}&to=${sam}&date=${addDays(today, 1)}`)).data.some((t) => t.id === scheduledTomorrow.id));
  ok('eski andoza reysini bevosita ochib bo\'lmaydi', (await api('GET', `/api/trips/${scheduledTomorrow.id}`)).status === 404);
  const sourceTrip = await api('POST', '/api/admin/trips', { from_id: tosh, to_id: sam, depart_at: '2099-02-01T10:00', duration_min: 240, price: 100000, bus_id: 1 }, A);
  const targetTrip = await api('POST', '/api/admin/trips', { from_id: tosh, to_id: sam, depart_at: '2099-02-02T10:00', duration_min: 240, price: 120000, bus_id: 1 }, A);
  const archiveTrip = await api('POST', '/api/admin/trips', { from_id: tosh, to_id: sam, depart_at: '2099-02-03T10:00', duration_min: 240, price: 100000, bus_id: 1 }, A);
  ok('bo\'sh reysni arxivlash', (await api('DELETE', `/api/admin/trips/${archiveTrip.data.id}`, null, A)).status === 200);
  ok('arxiv reysi mijoz qidiruvida yo\'q', !(await api('GET', `/api/trips?from=${tosh}&to=${sam}&date=2099-02-03`)).data.some((t) => t.id === archiveTrip.data.id));
  ok('arxiv reysi admin tarixida saqlanadi', (await api('GET', '/api/admin/trips?archive=1', null, A)).data.some((t) => t.id === archiveTrip.data.id));
  const transferHold = await api('POST', '/api/holds', { tripId: sourceTrip.data.id, seats: [1, 2] });
  const transferOrder = await api('POST', '/api/orders', {
    tripId: sourceTrip.data.id, holdToken: transferHold.data.holdToken, phone: '90 123 45 67',
    passengers: [{ seat: 1, fio: 'Ali Valiyev', gender: 'm' }, { seat: 2, fio: 'Madina Valiyeva', gender: 'f' }]
  });
  await api('POST', `/api/orders/${transferOrder.data.id}/pay`, { number: '4242 4242 4242 4242', expiry: '12/39' });
  await api('POST', `/api/orders/${transferOrder.data.id}/confirm`, { code: '123456' });
  const rescheduled = await api('PUT', `/api/admin/trips/${sourceTrip.data.id}/reschedule`, {
    depart_at: '2099-02-01T11:30', reason: 'Avtobus ta\'miri'
  }, A);
  ok('reys sanasi o\'zgartirildi', rescheduled.status === 200 && rescheduled.data.departAt === '2099-02-01 11:30');
  const changedTickets = (await api('GET', '/api/tickets?status=active')).data.filter((t) => t.orderId === transferOrder.data.id);
  ok('ko\'chgan vaqt chiptalarda yangilandi', changedTickets.length === 2 && changedTickets.every((t) => t.departAt === '2099-02-01 11:30' && t.noticeReason === 'Avtobus ta\'miri'));
  ok('sana o\'zgarishi bildirishnomaga yozildi', (await api('GET', '/api/notifications')).data.some((n) => n.kind === 'trip_rescheduled'));
  const moved = await api('POST', `/api/admin/orders/${transferOrder.data.id}/move`, { toTripId: targetTrip.data.id }, A);
  ok('buyurtma boshqa reysga ko\'chirildi', moved.status === 200 && moved.data.moved === 2 && moved.data.seats.length === 2);
  const movedTickets = (await api('GET', '/api/tickets?status=active')).data.filter((t) => t.orderId === transferOrder.data.id);
  ok('ko\'chirilgan chiptalar faol va narxi saqlangan', movedTickets.length === 2 && movedTickets.every((t) => t.departAt === '2099-02-02 10:00' && t.status === 'active' && t.price === 100000));
  ok('chipta ko\'chirish bildirishnomasi yuborildi', (await api('GET', '/api/notifications')).data.some((n) => n.kind === 'trip_moved'));
  ok('chipta bor reys o\'chirilmaydi', (await api('DELETE', `/api/admin/trips/${targetTrip.data.id}`, null, A)).status === 409);
  const cancelTrip = await api('POST', '/api/admin/trips', { from_id: tosh, to_id: sam, depart_at: '2099-02-04T10:00', duration_min: 240, price: 100000, bus_id: 1 }, A);
  const cancelHold = await api('POST', '/api/holds', { tripId: cancelTrip.data.id, seats: [5] });
  const cancelOrder = await api('POST', '/api/orders', {
    tripId: cancelTrip.data.id, holdToken: cancelHold.data.holdToken, phone: '90 123 45 67',
    passengers: [{ seat: 5, fio: 'Olim Valiyev', gender: 'm' }]
  });
  await api('POST', `/api/orders/${cancelOrder.data.id}/pay`, { number: '4242 4242 4242 4242', expiry: '12/39' });
  await api('POST', `/api/orders/${cancelOrder.data.id}/confirm`, { code: '123456' });
  ok('bekor qilish sababi majburiy', (await api('POST', `/api/admin/trips/${cancelTrip.data.id}/cancel`, { reason: '' }, A)).status === 400);
  ok('reys sabab bilan bekor qilindi', (await api('POST', `/api/admin/trips/${cancelTrip.data.id}/cancel`, { reason: 'Avtobus nosozligi' }, A)).status === 200);
  const cancelledTickets = (await api('GET', '/api/tickets?status=cancelled')).data.filter((t) => t.departAt === '2099-02-04 10:00');
  ok('bekor qilingan chipta va sabab yo\'lovchiga ko\'rinadi', cancelledTickets.length === 1 && cancelledTickets[0].status === 'cancelled' && cancelledTickets[0].noticeReason === 'Avtobus nosozligi');
  ok('bekor qilingan reys mijoz qidiruvida yo\'q', !(await api('GET', `/api/trips?from=${tosh}&to=${sam}&date=2099-02-04`)).data.some((t) => t.id === cancelTrip.data.id));
  ok('bekor qilish bildirishnomasi yuborildi', (await api('GET', '/api/notifications')).data.some((n) => n.kind === 'trip_cancelled'));
  ok('chipta tekshirish', (await api('GET', `/api/admin/ticket/${paid.data.tickets[0].number}`, null, A)).data.valid === false);
  ok('admin buyurtmalar', (await api('GET', '/api/admin/orders', null, A)).data.length >= 1);

  server.close();
  console.log(`\nHammasi yaxshi: ${n} ta tekshiruv o'tdi.`);
  process.exit(0);
})().catch((e) => { console.error('\nXATO:', e.message); console.error(e.stack); process.exit(1); });
