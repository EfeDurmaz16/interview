#!/bin/bash

# Jotform Interview Platform - Başlatma Scripti

echo "🚀 Jotform Interview Platform başlatılıyor..."

# Renkler
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Kontroller
echo -e "${YELLOW}Kontroller yapılıyor...${NC}"

# PHP kontrolü
if ! command -v php &> /dev/null; then
    echo -e "${RED}❌ PHP bulunamadı! PHP 8.1+ yükleyin.${NC}"
    exit 1
fi

# Composer kontrolü
if ! command -v composer &> /dev/null; then
    echo -e "${RED}❌ Composer bulunamadı! Composer yükleyin.${NC}"
    exit 1
fi

# Node.js kontrolü
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js bulunamadı! Node.js 18+ yükleyin.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Tüm gereksinimler mevcut${NC}"

# Backend bağımlılıkları kontrol et
if [ ! -d "packages/backend/vendor" ]; then
    echo -e "${YELLOW}Backend bağımlılıkları yükleniyor...${NC}"
    cd packages/backend
    composer install
    cd ../..
fi

# Frontend bağımlılıkları kontrol et
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Frontend bağımlılıkları yükleniyor...${NC}"
    npm install
fi

# Database'i başlat
echo -e "${YELLOW}Database başlatılıyor...${NC}"
cd packages/backend
php -r "require 'vendor/autoload.php'; require 'src/Config/Database.php'; Database::init();"
cd ../..

echo -e "${GREEN}✅ Database hazır${NC}"

# WS port seçimi (8080 dolu olabiliyor)
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
        echo -e "${YELLOW}⚠️  Port ${ORIGINAL_WS_PORT} dolu. WS_PORT=${WS_PORT} kullanılacak.${NC}"
    fi
fi

# 3 terminal penceresi aç
echo -e "${YELLOW}Servisler başlatılıyor...${NC}"
echo ""
echo -e "${GREEN}Terminal 1: PHP REST API (localhost:8000)${NC}"
echo -e "${GREEN}Terminal 2: PHP WebSocket (localhost:${WS_PORT})${NC}"
echo -e "${GREEN}Terminal 3: Frontend Dev Server (localhost:3000)${NC}"
echo ""

# macOS için
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Terminal 1: REST API
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/packages/backend/public\" && php -S localhost:8000"'
    
    # Terminal 2: WebSocket
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'/packages/backend\" && WS_PORT='${WS_PORT}' php bin/server.php"'
    
    # Terminal 3: Frontend
    # Not setting VITE_WS_URL on purpose: client will use ws://localhost:3000/ws (Vite proxy) first.
    osascript -e 'tell app "Terminal" to do script "cd \"'$(pwd)'\" && VITE_WS_PORT='${WS_PORT}' npm run frontend"'
    
    echo -e "${GREEN}✅ 3 terminal penceresi açıldı${NC}"
else
    echo -e "${YELLOW}Manuel olarak 3 terminal açın ve şu komutları çalıştırın:${NC}"
    echo ""
    echo "Terminal 1:"
    echo "  cd packages/backend/public"
    echo "  php -S localhost:8000"
    echo ""
    echo "Terminal 2:"
    echo "  cd packages/backend"
    echo "  WS_PORT=${WS_PORT} php bin/server.php"
    echo ""
    echo "Terminal 3:"
    echo "  VITE_WS_PORT=${WS_PORT} npm run frontend"
    echo ""
fi

echo ""
echo -e "${GREEN}🎉 Hazır! Frontend: http://localhost:3000${NC}"
