import { S, LS, api, loadLang, applyStatic, render, renderHeader } from './core.js';
import './booking.js';
import { changeLang } from './account.js';

function pickLang() {
  const saved = LS.get('lang');
  if (['uz', 'ru', 'en'].includes(saved)) return saved;
  const n = (navigator.language || 'uz').slice(0, 2).toLowerCase();
  return n === 'ru' ? 'ru' : n === 'en' ? 'en' : 'uz';
}

async function init() {
  await loadLang(pickLang());
  try {
    [S.config, S.cities] = await Promise.all([api('GET', '/config'), api('GET', '/cities')]);
  } catch {
    document.getElementById('app').innerHTML = '<div class="wrap page"><div class="empty"><h3>Server bilan aloqa yo\'q</h3><p>Sahifani qayta yuklang.</p></div></div>';
    return;
  }
  if (LS.get('token')) {
    try { S.user = await api('GET', '/me'); } catch { S.user = null; }
  }
  const b = S.config.brand || 'Marshrut';
  document.getElementById('brandName').textContent = b;
  document.getElementById('footBrand').textContent = b;
  applyStatic();
  renderHeader();
  const sel = document.getElementById('langSel');
  sel.value = S.lang;
  sel.addEventListener('change', () => changeLang(sel.value));
  window.addEventListener('hashchange', render);
  render();
}
init();
