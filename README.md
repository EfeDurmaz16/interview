# Jotform Interview Platform

Interview platformu için monorepo yapısında React frontend ve PHP backend.

## 🚀 Hızlı Başlatma

### Gereksinimler
- **Node.js** 18+ ve npm
- **PHP** 8.1+ ve Composer
- **SQLite3** (genellikle PHP ile birlikte gelir)

### Kurulum

1. **Bağımlılıkları yükle:**
```bash
# Root seviyesinde
npm install

# Backend PHP bağımlılıkları
cd packages/backend
composer install
cd ../..
```

2. **Database'i başlat:**
```bash
cd packages/backend
php -r "require 'vendor/autoload.php'; require 'src/Config/Database.php'; Database::init();"
cd ../..
```

3. **Seed data (opsiyonel):**
```bash
cd packages/backend
php bin/seed.php
cd ../..
```

### Çalıştırma

**3 terminal penceresi açın:**

#### Terminal 1: PHP REST API Server
```bash
cd packages/backend/public
php -S localhost:8000
```

#### Terminal 2: PHP WebSocket Server
```bash
cd packages/backend
php bin/server.php
```

#### Terminal 3: Frontend Dev Server
```bash
npm run frontend
# veya root'tan:
npm run dev
```

### Erişim

- **Frontend**: http://localhost:3000
- **REST API**: http://localhost:8000/api
- **WebSocket**: ws://localhost:8080

## 📁 Proje Yapısı

```
interview/
├── packages/
│   ├── frontend/          # React + Vite + Monaco Editor
│   ├── backend/            # PHP Backend (REST + WebSocket)
│   └── shared/             # Shared TypeScript types
```

## 🔧 Geliştirme

### Backend

- **REST API**: `packages/backend/public/index.php`
- **WebSocket**: `packages/backend/bin/server.php`
- **Database**: SQLite (`packages/backend/database/interview.sqlite`)

### Frontend

- **Dev Server**: `npm run frontend` (port 3000)
- **API Proxy**: Vite config'de `/api` → `localhost:8000`
- **WebSocket**: Doğrudan `ws://localhost:8080` bağlanıyor

## 📝 API Endpoints

- `POST /api/sessions` - Yeni session oluştur
- `GET /api/resolve/:token` - Token'dan role çözümle
- `GET /api/sessions/:id` - Session detayları
- `GET /api/sessions/:id/questions` - Session soruları
- `PUT /api/sessions/:sid/questions/:qid/evaluation` - Değerlendirme kaydet

## 🐛 Sorun Giderme

### WebSocket bağlanmıyor
- `php bin/server.php` çalışıyor mu kontrol et
- Port 8080'in kullanılabilir olduğundan emin ol

### Database hatası
- `packages/backend/database/` klasörünün yazılabilir olduğundan emin ol
- `Database::init()` çalıştırıldı mı kontrol et

### CORS hatası
- Backend'de CORS header'ları `public/index.php` içinde tanımlı
- Frontend proxy ayarları `vite.config.ts` içinde kontrol et
