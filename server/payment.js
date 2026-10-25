// To'lov provayderi interfeysi.
//
// Hozir faqat DEMO provayder ishlaydi: karta ma'lumotlari saqlanmaydi, SMS kodi doim 123456.
// Haqiqiy to'lov (Payme, Click, Uzum, Paynet va h.k.) ulash uchun shu faylda
// start() va confirm() funksiyalarini provayder API'siga yozing va .env da DEMO=0 qiling.
// Karta raqamini hech qachon o'z serveringizda saqlamang, provayderning to'lov sahifasi yoki
// tokenizatsiyasidan foydalaning.
const cfg = require('./config');

module.exports = {
  // Karta bo'yicha to'lovni boshlaydi. SMS tasdiqlash kerak bo'lsa { needSms: true } qaytaradi.
  async start(order, card) {
    if (!cfg.DEMO) {
      throw new Error("Haqiqiy to'lov provayderi ulanmagan: server/payment.js ni to'ldiring");
    }
    return { needSms: true, code: cfg.DEMO_CODE, last4: String(card.number).replace(/\s/g, '').slice(-4) };
  },
  // SMS kodini tekshiradi
  async confirm(order, code) {
    return String(code) === String(order.sms_code);
  }
};
