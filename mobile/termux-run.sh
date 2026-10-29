#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js topilmadi. Termux'da: pkg install nodejs-lts git"
  exit 1
fi

if ! node -e "const [major, minor] = process.versions.node.split('.').map(Number); if (major < 22 || (major === 22 && minor < 13)) process.exit(1)"; then
  echo "Node.js 22.13 yoki yangiroq kerak. Termux'da: pkg update && pkg upgrade"
  exit 1
fi

if [ ! -f .env ]; then
  password="$(node -e "process.stdout.write(require('crypto').randomBytes(18).toString('base64url'))")"
  cat > .env <<EOF
PORT=3000
HOST=0.0.0.0
BRAND_NAME=Marshrut
ADMIN_PASSWORD=$password
DEMO=1
DATA_DIR=./data
EOF
  echo "Yangi admin paroli: $password"
  echo "Parolni saqlab qo'ying. Uni keyin .env faylida almashtirishingiz mumkin."
fi

if ! npm ls --depth=0 >/dev/null 2>&1 ||
  ! node -e "require('node:sqlite'); require('express'); require('qrcode'); require('@zxing/browser')" >/dev/null 2>&1; then
  npm ci
fi

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
fi

npm start
