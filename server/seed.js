// Ixtiyoriy demo ma'lumotlar. Server ishga tushganda avtomatik qo'shilmaydi.
const { db } = require('./db');

const CITIES = [
  ['Toshkent', 'Ташкент', 'Tashkent', 'UZ'], ['Samarqand', 'Самарканд', 'Samarkand', 'UZ'],
  ['Buxoro', 'Бухара', 'Bukhara', 'UZ'], ['Andijon', 'Андижан', 'Andijan', 'UZ'],
  ['Namangan', 'Наманган', 'Namangan', 'UZ'], ["Farg'ona", 'Фергана', 'Fergana', 'UZ'],
  ['Xiva', 'Хива', 'Khiva', 'UZ'], ['Nukus', 'Нукус', 'Nukus', 'UZ'],
  ['Qarshi', 'Карши', 'Karshi', 'UZ'], ['Termiz', 'Термез', 'Termez', 'UZ'],
  ['Shymkent', 'Шымкент', 'Shymkent', 'KZ'], ['Almaty', 'Алматы', 'Almaty', 'KZ'],
  ['Bishkek', 'Бишкек', 'Bishkek', 'KG'], ['Dushanbe', 'Душанбе', 'Dushanbe', 'TJ']
];

const BUSES = [
  ['Avtobus 1', '01 A 123 AA', 'Yutong ZK6122', 40, 'AC,USB,WiFi'],
  ['Avtobus 2', '01 B 456 BB', 'Mercedes Tourismo', 44, 'AC,USB'],
  ['Avtobus 3', '01 C 789 CC', 'Higer KLQ', 36, 'AC'],
  ['Mikroavtobus 4', '01 D 321 DD', 'Mercedes Sprinter', 20, 'AC,WiFi']
];

// [qayerdan, qayerga, davomiyligi (daq), narx, [jo'nash vaqtlari], platforma]
const ROUTES = [
  ['Toshkent', 'Samarqand', 270, 120000, ['07:30', '13:00', '20:00'], '3'],
  ['Toshkent', 'Buxoro', 450, 190000, ['09:00', '21:30'], '4'],
  ['Toshkent', 'Andijon', 360, 150000, ['06:00', '15:00'], '2'],
  ['Toshkent', 'Namangan', 300, 120000, ['08:00'], '2'],
  ["Toshkent", "Farg'ona", 330, 130000, ['07:00'], '2'],
  ['Toshkent', 'Xiva', 840, 280000, ['18:00'], '5'],
  ['Toshkent', 'Nukus', 1080, 320000, ['17:00'], '5'],
  ['Toshkent', 'Qarshi', 420, 170000, ['08:30'], '4'],
  ['Toshkent', 'Termiz', 660, 230000, ['19:00'], '6'],
  ['Samarqand', 'Buxoro', 180, 90000, ['10:00', '16:00'], '1'],
  ['Toshkent', 'Shymkent', 300, 160000, ['07:00'], '7'],
  ['Toshkent', 'Almaty', 1080, 420000, ['16:00'], '7'],
  ['Toshkent', 'Bishkek', 960, 380000, ['15:00'], '7'],
  ['Toshkent', 'Dushanbe', 900, 400000, ['14:00'], '7']
];

function seed() {
  if (db.prepare('SELECT COUNT(*) c FROM cities').get().c > 0) return false;
  const tx = db.transaction(() => {
    const cityIns = db.prepare('INSERT INTO cities (name_uz,name_ru,name_en,country) VALUES (?,?,?,?)');
    const ids = {};
    for (const c of CITIES) ids[c[0]] = cityIns.run(...c).lastInsertRowid;
    const busIns = db.prepare('INSERT INTO buses (name,plate,model,seats,amenities) VALUES (?,?,?,?,?)');
    const busIds = BUSES.map((b) => Number(busIns.run(...b).lastInsertRowid));
    const schIns = db.prepare(`INSERT INTO schedules
      (from_id,to_id,depart_time,duration_min,price,bus_id,platform) VALUES (?,?,?,?,?,?,?)`);
    let k = 0;
    for (const [a, b, dur, price, times, plat] of ROUTES) {
      for (const t of times) {
        schIns.run(ids[a], ids[b], t, dur, price, busIds[k++ % 3], plat);
        // qaytish reysi (taxminan 3 soat farq bilan)
        const [h, m] = t.split(':').map(Number);
        const back = String((h + 3) % 24).padStart(2, '0') + ':' + String(m).padStart(2, '0');
        schIns.run(ids[b], ids[a], back, dur, price, busIds[k++ % 3], plat);
      }
    }
  });
  tx();
  return true;
}

module.exports = { seed };

if (require.main === module) {
  console.log(seed() ? 'Namunaviy ma\'lumotlar qo\'shildi.' : 'Baza bo\'sh emas, o\'zgartirilmadi.');
}
