// Tarjimalar tekshiruvi: kodda ishlatilgan kalitlar uchala tilda bormi va tillar bir xil kalitlarga egami
const fs = require('fs');
const path = require('path');
const pub = path.join(__dirname, '..', 'public');
const langs = ['uz', 'ru', 'en'];
const dict = Object.fromEntries(langs.map((l) => [l, JSON.parse(fs.readFileSync(path.join(pub, 'i18n', l + '.json'), 'utf8'))]));

let bad = 0;
const fail = (m) => { console.error('XATO:', m); bad++; };

// 1) tillar bir xil kalitlarga ega
const base = Object.keys(dict.uz);
for (const l of langs) {
  for (const k of base) if (!(k in dict[l])) fail(`${l}.json da yo'q: ${k}`);
  for (const k of Object.keys(dict[l])) if (!(k in dict.uz)) fail(`uz.json da yo'q (${l} da bor): ${k}`);
}

// 2) kodda ishlatilgan statik kalitlar
const files = ['core.js', 'booking.js', 'account.js', 'app.js'].map((f) => fs.readFileSync(path.join(pub, 'js', f), 'utf8'));
files.push(fs.readFileSync(path.join(pub, 'index.html'), 'utf8'));
const used = new Set();
for (const src of files) {
  for (const m of src.matchAll(/\bt\('([a-z0-9_.]+)'/g)) used.add(m[1]);
  for (const m of src.matchAll(/data-i18n="([a-z0-9_.]+)"/g)) used.add(m[1]);
}
for (const k of used) if (!k.endsWith('.') && !(k in dict.uz)) fail(`kodda ishlatilgan, lekin tarjimasi yo'q: ${k}`);

// 3) dinamik kalitlar
for (const c of ['active', 'history', 'returned']) for (const s of ['', '_none', '_hint']) if (!dict.uz['tickets.' + c + s] && s) fail('tickets.' + c + s);
for (const s of ['active', 'past', 'returned']) if (!dict.uz['ticket.st.' + s]) fail('ticket.st.' + s);

// 4) har bir serverdagi xato kodi uchun xabar bor
const srv = fs.readFileSync(path.join(__dirname, '..', 'server', 'routes', 'public.js'), 'utf8');
for (const m of srv.matchAll(/HttpError\(\d+, '([a-z_]+)'/g)) if (!dict.uz['err.' + m[1]]) fail('err.' + m[1] + ' (server xatosi) tarjimasiz');

// 5) {o'zgaruvchi}lar tillarda mos
for (const k of base) {
  const vars = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort().join(',');
  for (const l of ['ru', 'en']) if (dict[l][k] !== undefined && vars(dict[l][k]) !== vars(dict.uz[k])) fail(`${l}.json o'zgaruvchilari mos emas: ${k}`);
}

if (bad) { console.error(`\n${bad} ta muammo.`); process.exit(1); }
console.log(`Tarjimalar to'g'ri: ${base.length} kalit, ${used.size} tasi kodda ishlatilgan.`);
