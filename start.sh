#!/bin/bash

# Jotform Interview Platform - Startup Script

echo "Jotform Interview Platform baslatiliyor..."

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Kontroller
echo -e "${YELLOW}Kontroller yapiliyor...${NC}"

# PHP kontrolu
if ! command -v php &> /dev/null; then
    echo -e "${RED}PHP bulunamadi! PHP 8.1+ yukleyin.${NC}"
    exit 1
fi

# Composer kontrolu
if ! command -v composer &> /dev/null; then
    echo -e "${RED}Composer bulunamadi! Composer yukleyin.${NC}"
    exit 1
fi

# Node.js kontrolu
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js bulunamadi! Node.js 18+ yukleyin.${NC}"
    exit 1
fi

# lsp-ws-proxy kontrolu (opsiyonel)
if ! command -v lsp-ws-proxy &> /dev/null; then
    echo -e "${YELLOW}lsp-ws-proxy bulunamadi. LSP IntelliSense devre disi.${NC}"
    echo -e "${YELLOW}  Kurmak icin: cargo install lsp-ws-proxy${NC}"
    LSP_AVAILABLE=0
else
    LSP_AVAILABLE=1
fi

# intelephense kontrolu (opsiyonel)
if ! command -v intelephense &> /dev/null; then
    echo -e "${YELLOW}intelephense bulunamadi. LSP IntelliSense devre disi.${NC}"
    echo -e "${YELLOW}  Kurmak icin: npm install -g intelephense${NC}"
    LSP_AVAILABLE=0
fi

echo -e "${GREEN}Tum gereksinimler mevcut${NC}"

# Backend bagimliliklari kontrol et
if [ ! -d "packages/backend/vendor" ]; then
    echo -e "${YELLOW}Backend bagimliliklari yukleniyor...${NC}"
    cd packages/backend
    composer install
    cd ../..
fi

# Frontend bagimliliklari kontrol et
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Frontend bagimliliklari yukleniyor...${NC}"
    npm install
fi

# Database'i baslat
echo -e "${YELLOW}Database baslatiliyor...${NC}"
cd packages/backend
php -r "require 'vendor/autoload.php'; require 'src/Config/Database.php'; Database::init();"
cd ../..

echo -e "${GREEN}Database hazir${NC}"

# Question seed (varsayilan: acik)
# Kapatmak icin: AUTO_SEED=0 ./start.sh
AUTO_SEED=${AUTO_SEED:-1}
if [ "${AUTO_SEED}" = "1" ]; then
    echo -e "${YELLOW}Question seed uygulaniyor...${NC}"
    cd packages/backend
    if [ -f "bin/seed.php" ] && [ -f "seeds/questions.json" ]; then
        SEED_OUTPUT=$(php bin/seed.php 2>&1)
        SEED_EXIT_CODE=$?
        if [ ${SEED_EXIT_CODE} -ne 0 ]; then
            echo -e "${RED}Seed islemi basarisiz:${NC}"
            echo "${SEED_OUTPUT}"
            exit 1
        fi
        echo -e "${GREEN}${SEED_OUTPUT}${NC}"
    else
        echo -e "${YELLOW}Seed dosyalari bulunamadi, seed atlandi.${NC}"
    fi
    cd ../..
fi

# WS port secimi (8080 dolu olabiliyor)
WS_PORT=${WS_PORT:-8080}
if command -v lsof &> /dev/null; then
    ORIGINAL_WS_PORT=${WS_PORT}
    for i in {0..10}; do
        if lsof -iTCP:${WS_PORT} -sTCP:LISTEN &> /dev/null; then
            WS_PORT=$((WS_PORT + 1))
        else
            break
        fi
    done
    if [ "${WS_PORT}" != "${ORIGINAL_WS_PORT}" ]; then
        echo -e "${YELLOW}Port ${ORIGINAL_WS_PORT} dolu. WS_PORT=${WS_PORT} kullanilacak.${NC}"
    fi
fi

ROOT_DIR=$(pwd)
PIDS=()

# Ctrl+C ile tum process'leri temiz kapat
cleanup() {
    echo ""
    echo -e "${YELLOW}Servisler durduruluyor...${NC}"
    for pid in "${PIDS[@]}"; do
        kill "$pid" 2>/dev/null
    done
    wait 2>/dev/null
    echo -e "${GREEN}Tum servisler durduruldu.${NC}"
    exit 0
}
trap cleanup SIGINT SIGTERM

echo ""
echo -e "${YELLOW}Servisler baslatiliyor...${NC}"
echo ""

# 1) PHP REST API
(cd "${ROOT_DIR}/packages/backend/public" && php -S localhost:8000) 2>&1 | while IFS= read -r line; do
    echo -e "${CYAN}[API]${NC} $line"
done &
PIDS+=($!)

# 2) PHP WebSocket
(cd "${ROOT_DIR}/packages/backend" && WS_PORT=${WS_PORT} php bin/server.php) 2>&1 | while IFS= read -r line; do
    echo -e "${MAGENTA}[WS]${NC}  $line"
done &
PIDS+=($!)

# 3) Frontend (Vite)
(cd "${ROOT_DIR}" && VITE_WS_PORT=${WS_PORT} npm run frontend) 2>&1 | while IFS= read -r line; do
    echo -e "${GREEN}[FE]${NC}  $line"
done &
PIDS+=($!)

# 4) LSP Gateway (opsiyonel)
if [ "${LSP_AVAILABLE}" = "1" ]; then
    (lsp-ws-proxy --listen 9999 --sync --remap -- intelephense --stdio) 2>&1 | while IFS= read -r line; do
        echo -e "${BLUE}[LSP]${NC} $line"
    done &
    PIDS+=($!)
fi

sleep 1
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Tum servisler calisyor!${NC}"
echo -e "${GREEN}  Frontend: http://localhost:3000${NC}"
echo -e "${CYAN}  API:      http://localhost:8000${NC}"
echo -e "${MAGENTA}  WS:       ws://localhost:${WS_PORT}${NC}"
if [ "${LSP_AVAILABLE}" = "1" ]; then
    echo -e "${BLUE}  LSP:      ws://localhost:9999${NC}"
fi
echo -e "${GREEN}================================================${NC}"
echo -e "${YELLOW}  Ctrl+C ile tum servisleri durdurabilirsiniz${NC}"
echo ""

# Tum child process'leri bekle
wait
