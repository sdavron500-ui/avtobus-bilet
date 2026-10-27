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

assert.strictEqual(db.prepare('SELECT COUNT(*) c FROM cities').get().c, 0, 'server start must not add demo data');
seed();
const fixtureCities = db.prepare('SELECT id, name_uz, country FROM cities').all();
const fixtureFrom = fixtureCities.find((city) => city.name_uz === 'Toshkent').id;
const fixtureTo = fixtureCities.find((city) => city.name_uz === 'Samarqand').id;
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
  ok('mijoz naqd to\'lovni tanlaydi va buyurtma kassaga yoziladi',
    cashSelected.status === 200 && cashSelected.data.paymentMethod === 'cash' && cashSelected.data.status === 'pending');
  ok('naqd to\'lov tanlanganda chipta kassir tasdig\'igacha faol bo\'lmaydi',
    cashSelected.data.tickets.length === 1 && cashSelected.data.tickets[0].status === 'pending');
  ok('naqd buyurtma uchun karta SMS tasdig\'i ishlamaydi',
    (await api('POST', `/api/orders/${cashOrderId}/confirm`, { code: '123456' })).status === 409);

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
  ok('naqd to\'lovni admin tasdig\'isiz qabul qilib bo\'lmaydi',
    (await api('POST', `/api/admin/orders/${cashOrderId}/cash/confirm`)).status === 401);
  ok('admin noto\'g\'ri parol', (await api('POST', '/api/admin/login', { password: 'nope' })).status === 401);
  const al = await api('POST', '/api/admin/login', { password: 'test-admin' });
  const A = { 'x-admin': al.data.token };
  ok('admin kirdi', al.status === 200);
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
