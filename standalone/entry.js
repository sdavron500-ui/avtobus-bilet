import QRCode from 'qrcode';
import { ticketNumberById } from './mock.js';
import '../public/js/app.js';

// <img src="/api/tickets/ID/qr.svg"> ni brauzerda yasalgan QR bilan almashtirish
function fixQr(img) {
  const m = (img.getAttribute('src') || '').match(/^\/api\/tickets\/([a-f0-9]+)\/qr\.svg$/);
  if (!m) return;
  const num = ticketNumberById(m[1]);
  if (!num) return;
  QRCode.toDataURL('TICKET:' + num, { margin: 1, width: 340, errorCorrectionLevel: 'M' }).then((url) => { img.src = url; });
}
new MutationObserver((list) => {
  for (const r of list) for (const n of r.addedNodes) {
    if (n.nodeType !== 1) continue;
    if (n.tagName === 'IMG') fixQr(n);
    else n.querySelectorAll && n.querySelectorAll('img').forEach(fixQr);
  }
}).observe(document.documentElement, { childList: true, subtree: true });
