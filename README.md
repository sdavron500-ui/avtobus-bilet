# Marshrut: avtobus chiptalari veb-sayti

Shaharlararo va xalqaro avtobus reyslari uchun onlayn chipta sayti: reys qidirish, avtobus sxemasida o'rin tanlash,
yo'lovchi ma'lumotlari, to'lov, QR-kodli chipta, chiptani qaytarish va egasi uchun admin panel.
Interfeys uch tilda: o'zbekcha, ruscha, inglizcha. Telefonda ham, kompyuterda ham ishlaydi.

Bu mobil ilovadagi funksiyalarning veb-versiyasi, lekin **o'zining backend'i va boshqa dizayni** bilan yozilgan.
Hech qanday tashqi serverga ulanmaydi, boshqa kompaniyaning logotipi, nomi yoki kodi ishlatilmagan.

## Tez ishga tushirish

Kerak: Node.js 18 yoki yangiroq.

```bash
npm install
npm start
```

Brauzerda oching: <http://localhost:3000>
Admin panel: <http://localhost:3000/admin.html> (standart parol `admin123`, uni albatta o'zgartiring)

Birinchi ishga tushirishda namunaviy shaharlar, avtobuslar va reyslar avtomatik qo'shiladi.
Haqiqiy ma'lumotlarni admin paneldan kiriting (namunalarni o'chirib tashlash mumkin).

Sozlamalar uchun `.env.example` ni `.env` ga nusxalab, kerakli qiymatlarni o'zgartiring.

## Funksiyalar

**Yo'lovchi uchun**
- Reys qidirish: qayerdan, qayerga, sana; shaharlararo va xalqaro; mashhur reyslar; saralash (vaqt, narx, bo'sh o'rin)
- Avtobus sxemasida o'rin tanlash: bo'sh, band, tanlangan, erkak va ayol o'rinlari
- Tanlangan o'rin 10 daqiqa ushlab turiladi (taymer bilan), boshqa mijoz uni ola olmaydi
- Har bir yo'lovchi uchun ism, jins; xalqaro reysda pasport va tug'ilgan sana
- Karta bilan to'lov va SMS tasdiqlash (hozir DEMO rejimida, quyida qarang)
- QR-kodli chipta, PDF sifatida saqlash (brauzerning chop etish oynasi orqali)
- Chiptalarim: faol, tarix, qaytarilgan; bitta chiptani yoki butun buyurtmani qaytarish
- Mehmon rejimi (ro'yxatdan o'tmasdan), email bilan ro'yxatdan o'tish, parolni tiklash, profil, akkauntni o'chirish
- Chiptalarni telefon raqami bo'yicha tiklash
- Bildirishnomalar, savol-javob, aloqa sahifalari

**Egasi uchun admin panel** (`/admin.html`)
- Boshqaruv: kelgusi reyslar, faol chiptalar, tushum, foydalanuvchilar
- Reyslar: narx va peronni o'zgartirish, reysni bekor qilish, yagona reys qo'shish
- O'rinlar xaritasi: kim qaysi o'rinda o'tirgani; kassada sotilgan o'rinni bloklash (saytda band ko'rinadi)
- Jadvallar: har kuni takrorlanadigan reyslar, tizim 3 hafta oldindan reys yaratib boradi
- Avtobuslar (o'rinlar soni, qulayliklar), shaharlar, buyurtmalar
- Chipta tekshirish: nazoratchi chipta raqamini kiritib, chipta yaroqli ekanini ko'radi

## Bitta HTML fayl (demo)

`standalone/marshrut-demo.html` — butun sayt bitta faylda, serversiz ochiladi (ikki marta bosish yetadi).
Backend o'rniga brauzer ichidagi soxta nusxa ishlaydi, ma'lumot `localStorage`da turadi. Faqat ko'rsatish uchun:
haqiqiy sotuv va admin panel yo'q. Qayta yig'ish: `node standalone/build.js`.

## Haqiqiy ishga tushirishdan oldin (muhim)

1. **To'lov.** Hozir `DEMO=1`: pul yechilmaydi, SMS kodi doim `123456`. Haqiqiy to'lov uchun `server/payment.js`
   ichidagi `start()` va `confirm()` ni to'lov provayderi (Payme, Click, Uzum va boshqalar) API'siga ulang va
   `.env` da `DEMO=0` qiling. Karta raqamini o'z serveringizda saqlamang, provayderning to'lov sahifasi yoki tokenidan foydalaning.
   `DEMO=0` bo'lib, provayder ulanmagan bo'lsa, to'lov xato bilan to'xtaydi (soxta to'lov o'tmaydi).
2. **SMS va email.** Telefonni tiklash va parolni tiklash kodlari hozir demo rejimida javobda ko'rsatiladi.
   `DEMO=0` da kod faqat server logiga yoziladi: `server/routes/public.js` ichidagi `/auth/forgot` va
   `/restore/send` ga SMS gateway (Eskiz, Playmobile) va email yuborishni ulang.
3. **Admin paroli.** `.env` da `ADMIN_PASSWORD` ni kuchli parolga almashtiring. Admin panelni qo'shimcha himoya (VPN yoki IP cheklovi) ortiga olish tavsiya etiladi.
4. **HTTPS.** Saytni internetga chiqarganda nginx, Caddy yoki Cloudflare orqali HTTPS qo'ying. Ilova o'zi HTTPS bermaydi.
5. **Shartlar.** Savol-javob matnlari (`public/i18n/*.json`, `faq.*`) umumiy. Qaytarish, bolalar chiptasi va yuk qoidalarini o'z kompaniyangiz shartlariga moslab yozing, kerak bo'lsa yuridik maslahat oling.
6. **Zaxira nusxa.** Barcha ma'lumot `data/app.db` faylida (SQLite). Uni muntazam nusxalab turing.
7. **Aloqa va nom.** `.env` da `BRAND_NAME` va `CONTACT_*` ni to'ldiring.

## Tuzilma

```
server/
  index.js          Express serveri
  config.js         .env va sozlamalar
  db.js             SQLite sxemasi, jadvaldan reys yaratish
  seed.js           namunaviy ma'lumotlar
  payment.js        to'lov provayderi interfeysi (hozir DEMO)
  routes/public.js  yo'lovchi API'si (reys, o'rin, buyurtma, to'lov, chipta, akkaunt)
  routes/admin.js   admin API'si
public/
  index.html        yo'lovchi sayti (bitta sahifali ilova)
  admin.html        admin panel
  css/              dizayn
  js/               core (umumiy), booking (xarid oqimi), account (profil va h.k.), admin
  i18n/             uz.json, ru.json, en.json
test/
  smoke.js          backend to'liq oqim sinovi (49 tekshiruv)
  i18n.js           tarjimalar to'liqligi tekshiruvi
data/               SQLite bazasi shu yerda yaratiladi (git'ga kirmaydi)
```

## Sinov

```bash
npm test
```

Vaqtinchalik baza bilan butun oqimni tekshiradi: qidirish, o'rin ushlash, buyurtma, to'lov, qaytarish,
ro'yxatdan o'tish, parolni tiklash, admin va xavfsizlik holatlari (boshqa mijoz buyurtmasini ko'ra olmasligi, band o'rinni sota olmasligi).

## Texnik eslatmalar

- Stek: Node.js, Express, SQLite (`better-sqlite3`), `qrcode`. Frontend: oddiy JavaScript (ES modullar), yig'ish (build) bosqichi yo'q.
- Ikki kishi bir o'rinni sota olmaydi: ma'lumotlar bazasida faol va kutilayotgan chiptalar uchun o'rin bo'yicha noyoblik cheklovi bor.
- Parollar `scrypt` bilan saqlanadi. Barcha SQL so'rovlar parametrlangan, frontend matnlarni xavfsiz chiqaradi.
- Vaqt Toshkent vaqti (UTC+5) bo'yicha saqlanadi va solishtiriladi.
- Mehmon buyurtmalari qurilmadagi tasodifiy kalit bilan bog'lanadi; akkauntga kirganda yoki telefon bo'yicha tiklaganda akkauntga o'tadi.
