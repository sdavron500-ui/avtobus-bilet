#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js topilmadi. Termux'da: pkg install nodejs-lts git clang make python"
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

if ! node -e "require('better-sqlite3')" >/dev/null 2>&1; then
  npm ci
fi

if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
fi

npm start
