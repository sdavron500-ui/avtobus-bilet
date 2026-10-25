// Bitta HTML fayl yig'ish: node standalone/build.js  ->  standalone/marshrut-demo.html
// Kerak: npm install, va esbuild (npx avtomatik yuklaydi).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const outJs = path.join(__dirname, 'bundle.tmp.js');
execFileSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--yes', 'esbuild', 'standalone/entry.js', '--bundle', '--minify', '--format=iife', '--platform=browser', '--outfile=' + outJs, '--log-level=warning'], { cwd: root, stdio: 'inherit' });

let html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/app.css'), 'utf8');
const js = fs.readFileSync(outJs, 'utf8').replace(/<\/script/gi, '<\\/script');
html = html.replace('<link rel="stylesheet" href="/css/app.css">', () => '<style>\n' + css + '\n</style>');
html = html.replace('<script type="module" src="/js/app.js"></script>', () => '<script>\n' + js + '\n</script>');
html = html.replace('<main id="app" tabindex="-1"></main>', '<div class="demo" style="border-radius:0;text-align:center">DEMO versiya: ma\'lumotlar faqat shu brauzerda saqlanadi, to\'lov soxta (SMS kodi 123456).</div>\n<main id="app" tabindex="-1"></main>');
fs.writeFileSync(path.join(__dirname, 'marshrut-demo.html'), html);
fs.unlinkSync(outJs);
console.log('Tayyor: standalone/marshrut-demo.html (' + Math.round(html.length / 1024) + ' KB)');
