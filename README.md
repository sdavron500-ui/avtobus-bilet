# Marshrut: avtobus chiptalari veb-sayti

Shaharlararo va xalqaro avtobus reyslari uchun onlayn chipta sayti: reys qidirish, avtobus sxemasida o'rin tanlash,
yo'lovchi ma'lumotlari, to'lov, QR-kodli chipta, chiptani qaytarish va egasi uchun admin panel.
Interfeys uch tilda: o'zbekcha, ruscha, inglizcha. Telefonda ham, kompyuterda ham ishlaydi.

Bu mobil ilovadagi funksiyalarning veb-versiyasi, lekin **o'zining backend'i va boshqa dizayni** bilan yozilgan.
Hech qanday tashqi serverga ulanmaydi, boshqa kompaniyaning logotipi, nomi yoki kodi ishlatilmagan.

## Tez ishga tushirish

Kerak: Node.js 20 yoki yangiroq.

```bash
npm install
npm start
```

Brauzerda oching: <http://localhost:3000>
Admin panel: <http://localhost:3000/admin.html> (standart parol `admin123`, uni albatta o'zgartiring)

Server ishga tushganda namunaviy yoki avtomatik reyslar yaratilmaydi. Avval admin panelda shahar va avtobuslarni,
so'ng "Reyslar" bo'limida jo'nash sanasi/vaqtini ko'rsatib har bir reysni qo'lda kiriting. "Jadvallar" bo'limida
bugungi va ertangi qo'lda kiritilgan reyslar ko'rinadi; chiptasi bor eski reyslar ham ro'yxatda qoladi. Eski takroriy andozalar yo'lovchi qidiruvida chiqmaydi;
ularni "Jadvallar" ichidagi eski andozalar bo'limidan o'chirish mumkin. Ixtiyoriy demo ma'lumotlar uchun `npm run seed` ishlatiladi.

Sozlamalar uchun `.env.example` ni `.env` ga nusxalab, kerakli qiymatlarni o'zgartiring.

## Funksiyalar

**Yo'lovchi uchun**
- Reys qidirish: qayerdan, qayerga va sana bo'yicha; "Barcha reyslar" tablosida kelgusi mahalliy yoki xalqaro reyslarni oy va kun bo'yicha guruhlab ko'rish; mashhur reyslar; saralash (vaqt, narx, bo'sh o'rin)
- Avtobus sxemasida o'rin tanlash: bo'sh, band, tanlangan, erkak va ayol o'rinlari
- Tanlangan o'rin 10 daqiqa ushlab turiladi (taymer bilan), boshqa mijoz uni ola olmaydi
- Har bir yo'lovchi uchun ism, jins; xalqaro reysda pasport va tug'ilgan sana
- To'lov usulini tanlash: karta orqali to'lov yoki kassada naqd pul; kassir/admin naqd pul olinganini tasdiqlagach chipta faollashadi
- Karta bilan to'lov va SMS tasdiqlash (hozir DEMO rejimida, quyida qarang)
- QR-kodli chipta, PDF sifatida saqlash (brauzerning chop etish oynasi orqali)
- Naqd buyurtma jo'nashdan 60 daqiqa oldingacha saqlanadi; mijoz kassaga chipta IDsi/QR bilan kelib to'laydi
- Reysga kelmagan mijoz pulni qaytarish masalasini jo'nashdan keyingi 24 soat ichida aloqa orqali so'rashi kerak; muddatdan so'ng qaytarilmaydi
- Chiptalarim: faol, tarix, qaytarilgan; bitta chiptani yoki butun buyurtmani qaytarish
- Mehmon rejimi (ro'yxatdan o'tmasdan), email bilan ro'yxatdan o'tish, parolni tiklash, profil, akkauntni o'chirish
- Chiptalarni telefon raqami bo'yicha tiklash
- Bildirishnomalar, savol-javob, aloqa sahifalari

**Egasi uchun admin panel** (`/admin.html`)
- Boshqaruv: kelgusi reyslar, faol chiptalar, tushum, foydalanuvchilar
- Reyslar: narx va peronni o'zgartirish, jo'nash sanasi/vaqtini sabab bilan ko'chirish, reysni sabab ko'rsatib bekor qilish yoki chiptasiz reysni arxivlash
- Chiptali reys bekor qilinsa, chiptalar bekor holatga o'tadi; yo'lovchi sabab va aloqa raqamini chiptasi hamda ilova ichidagi bildirishnomada ko'radi. To'lov hozir DEMO, pul qaytarish admin bilan alohida kelishiladi
- Yo'lovchilarni ayni yo'nalishdagi boshqa faol reysga ko'chirish; narx farqi admin va yo'lovchi o'rtasida alohida hal qilinadi
- Bajarilgan, bekor qilingan va arxivlangan reyslar mijozlarga ko'rinmaydi, adminning "Tarix / arxiv" bo'limida saqlanadi. "Jadvallar" bugungi va ertangi qo'lda kiritilgan reyslarni ko'rsatadi; takroriy andozalar reys yaratmaydi
- O'rinlar xaritasi: kim qaysi o'rinda o'tirgani; kassada sotilgan o'rinni bloklash (saytda band ko'rinadi)
- Reyslar: reyslar avtomatik yaratilmaydi; admin har bir jo'nashni alohida kiritadi. "Jadvallar" ertangi tayyor avtobuslar va bugungi reyslar ro'yxatini ko'rsatadi
- Avtobuslar (o'rinlar soni, qulayliklar), shaharlar, buyurtmalar
- Buyurtmalar bo'limida telefon, ism/familiya yoki chipta raqami bo'yicha qidirish; buyurtmalarni reyslar kesimida guruhlash; chiptani ko'rish va QR bilan chop etish; naqd to'lovni tasdiqlash
- Chipta tekshirish bo'limida kamerani yoqib QR-kodni bevosita skanerlash yoki USB/klaviatura skaneridan foydalanish; chipta IDsi yoki raqamini qo'lda ham kiritish mumkin. Yo'nalish, jo'nash vaqti, yo'lovchi, o'rin va to'lov holatini ko'rish, naqd buyurtmani tasdiqlash va chiptani chop etish
- "Sotuv" bo'limida reys/o'rin tanlab, yo'lovchi ma'lumotini kiritish va terminalda yoki kassada qabul qilingan to'lovni karta/naqd deb qayd etib chiptani chiqarish. Xalqaro reysda pasport va tug'ilgan sana talab qilinadi.
- "Hisobot" bo'limida har bir avtobus uchun reys, yo'lovchi, bo'sh o'rin, bandlik va qayd etilgan tushumni ko'rish; yo'lovchi/jami o'rin sonini bosib, joy raqami, ism-familiya, telefon va jinsni ochish mumkin. Borib-qaytish bir xil avtobus teskari yo'nalishda qaytishi va borish reysi yetib kelgandan keyin jo'nashiga qarab bog'lanadi. Hisobotni Excel ochadigan CSV sifatida yuklab olish yoki chop etish mumkin. Karta to'lovi DEMO paytida hisobot ogohlantiradi.
- Admin sahifasidagi tanlov orqali o'zbek, rus va ingliz tillarini almashtirish
- Chipta QR kodi faqat chipta ID sini saqlaydi; admin tekshiruv oynasida kamera orqali yoki USB/klaviatura skaneri bilan o'qiladi. Kamera uchun brauzer ruxsati va `localhost` yoki HTTPS ulanishi kerak.

## Android APK va hotspot orqali sinash

`admin` va `client` uchun alohida Android ilovalari GitHub Actions orqali yig'iladi. `main` ga Android fayllari o'zgargan pushdan so'ng GitHub'dagi **Actions → Build Android APKs** ishini ochib, `marshrut-android-apks` artefaktini yuklab oling. APKlar release kaliti bilan imzolanmagan debug buildlar bo'lib, Android o'rnatishda tasdiq so'rashi mumkin.

Admin telefonining o'zida Node.js serverini ishga tushirish uchun Android'da Termux kerak: server Node.js/SQLite backend bo'lgani sabab APKning o'zi server jarayonini ishga tushirmaydi. Termux'ni ishonchli manbadan o'rnating va Android sozlamalarida Termux uchun batareya cheklovini o'chiring.

1. Admin telefonida hotspotni yoqing va Termux'ni oching:

   ```sh
   pkg update
   pkg install nodejs-lts git clang make python pkg-config
   git clone https://github.com/sdavron500-ui/avtobus-bilet.git
   cd avtobus-bilet
   bash mobile/termux-run.sh
   ```

   Birinchi ishga tushishda SQLite moduli telefonda yig'ilishi mumkin va vaqt oladi. Skript kuchli admin parolini yaratib ko'rsatadi; uni saqlang. Server `0.0.0.0:3000` da ishga tushadi, bazasi Termux loyihasining `data` papkasida saqlanadi. Server ishlashi uchun Termux seansini ochiq qoldiring.

2. Admin APK'ni admin telefoniga o'rnating. U serverga `http://127.0.0.1:3000/admin.html` orqali ulanadi.
3. Mijoz telefonini admin telefoni hotspot'iga ulang va client APK'ni o'rnating. APK Wi-Fi gateway manzilini avtomatik tanlaydi. Ulanmasa, **Server** tugmasida server telefon IP manzilini `http://IP:3000` shaklida kiriting; bu IP Termux server logida ko'rsatiladi.
4. Admin panelda shahar, avtobus va reys yarating. Client ilovasida reysni topib buyurtma bering, so'ng admin APK'dagi **Buyurtmalar** bo'limida ayni buyurtma va chipta QR'ini tekshiring. Kamera orqali chipta tekshirish uchun admin APK'ga kamera ruxsatini bering.

Serverni hotspotda ochish tarmoqdagi qurilmalarga ulanish imkonini beradi. Hotspot parolini himoyalang va yaratilgan admin parolini hech kimga bermang. Ilova hozir `DEMO=1`: karta/SMS sinov rejimida. Telefon Termux'ni to'xtatsa server ham to'xtaydi; qayta yoqilgandan keyin Termux'da `bash mobile/termux-run.sh` buyrug'ini yana bajaring.

## Bitta HTML fayl (demo)

`standalone/marshrut-demo.html` — butun sayt bitta faylda, serversiz ochiladi (ikki marta bosish yetadi).
Backend o'rniga brauzer ichidagi soxta nusxa ishlaydi, ma'lumot `localStorage`da turadi. Faqat ko'rsatish uchun:
haqiqiy sotuv va admin panel yo'q. Qayta yig'ish: `node standalone/build.js`.

## Haqiqiy ishga tushirishdan oldin (muhim)

1. **To'lov.** Karta uchun hozir `DEMO=1`: pul yechilmaydi, SMS kodi doim `123456`. Naqd buyurtma jo'nashdan 60 daqiqa oldingacha saqlanadi (`CASH_HOLD_CUTOFF_MINUTES`); mijoz QR/IDni kassirga ko'rsatadi va kassir chipta tekshirish oynasida naqd pulni tasdiqlaydi. Boshqa o'rinlar odatda 10 daqiqaga band qilinadi. Reysga kelmagan mijoz qaytarish masalasini jo'nashdan keyingi 24 soat ichida aloqa orqali ko'tarishi kerak (`NO_SHOW_CONTACT_HOURS`); muddatdan keyin qaytarilmaydi. Haqiqiy karta to'lovi uchun `server/payment.js`
   ichidagi `start()` va `confirm()` ni to'lov provayderi (Payme, Click, Uzum va boshqalar) API'siga ulang va
   `.env` da `DEMO=0` qiling. Karta raqamini o'z serveringizda saqlamang, provayderning to'lov sahifasi yoki tokenidan foydalaning.
   `DEMO=0` bo'lib, provayder ulanmagan bo'lsa, to'lov xato bilan to'xtaydi (soxta to'lov o'tmaydi).
2. **SMS va email.** Reys bekor bo'lishi, vaqt o'zgarishi va boshqa reysga ko'chirish haqidagi xabarlar hozir saytning ilova ichidagi bildirishnomalari va chiptada ko'rsatiladi; SMS yuborilmaydi. `CONTACT_PHONE` raqamini `.env` da sozlang. Telefonni tiklash va parolni tiklash kodlari hozir demo rejimida javobda ko'rsatiladi.
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
  db.js             SQLite sxemasi va migratsiyalar
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
  smoke.js          backend to'liq oqim va regressiya sinovlari
  i18n.js           tarjimalar to'liqligi tekshiruvi
data/               SQLite bazasi shu yerda yaratiladi (git'ga kirmaydi)
```

## Sinov

```bash
npm test
```

Vaqtinchalik baza bilan butun oqimni tekshiradi: qidirish, o'rin ushlash, buyurtma, to'lov, qaytarish,
ro'yxatdan o'tish, parolni tiklash, admin va xavfsizlik holatlari; shuningdek QR/ID tekshiruvi, naqd tasdiqlash,
naqd buyurtmaning tugash muddati va kelmagan yo'lovchi uchun aloqa muddati.

## Texnik eslatmalar

- Stek: Node.js, Express, SQLite (`better-sqlite3`), `qrcode`. Frontend: oddiy JavaScript (ES modullar), yig'ish (build) bosqichi yo'q.
- Ikki kishi bir o'rinni sota olmaydi: ma'lumotlar bazasida faol va kutilayotgan chiptalar uchun o'rin bo'yicha noyoblik cheklovi bor.
- Parollar `scrypt` bilan saqlanadi. Barcha SQL so'rovlar parametrlangan, frontend matnlarni xavfsiz chiqaradi.
- Vaqt Toshkent vaqti (UTC+5) bo'yicha saqlanadi va solishtiriladi.
- Mehmon buyurtmalari qurilmadagi tasodifiy kalit bilan bog'lanadi; akkauntga kirganda yoki telefon bo'yicha tiklaganda akkauntga o'tadi.
