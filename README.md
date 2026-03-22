# 🥛 SutFactory Pro — Sut Kombinati Boshqaruv Tizimi

**Premium Dairy Factory Management System** — O'zbekiston va Rossiya uchun to'liq ishlab chiqarish, sotuv va AI tahlil tizimi.

---

## 🗂️ Loyiha Strukturasi

```
dairy-factory/
├── backend/               # Node.js + Express + PostgreSQL
│   ├── server.js          # Asosiy server
│   ├── routes/            # API yo'naltiruvchi
│   │   ├── auth.js        # Autentifikatsiya (JWT)
│   │   ├── farmers.js     # Fermerlar boshqaruvi
│   │   ├── milk.js        # Sut qabuli
│   │   ├── production.js  # Ishlab chiqarish + QR kod
│   │   ├── inventory.js   # Ombor boshqaruvi
│   │   ├── sales.js       # Sotuvlar va mijozlar
│   │   ├── analytics.js   # AI tahlil va bashorat
│   │   ├── notifications.js # Bildirishnomalar
│   │   └── dashboard.js   # Umumiy ko'rsatkichlar
│   ├── config/            # DB va Redis konfiguratsiya
│   ├── middleware/        # Auth middleware
│   ├── utils/             # Socket.io, QR, Logger
│   └── database/          # PostgreSQL schema (init.sql)
│
├── frontend/              # React + Recharts + Socket.io
│   └── src/
│       ├── pages/         # Barcha sahifalar
│       │   ├── DashboardPage.js    # Bosh panel + AI tavsiyalar
│       │   ├── FarmersPage.js      # Fermerlar boshqaruvi
│       │   ├── MilkPage.js         # Sut qabuli + hisobot
│       │   ├── ProductionPage.js   # Partiyalar + QR
│       │   ├── InventoryPage.js    # Ombor monitoringi
│       │   ├── SalesPage.js        # Sotuvlar + mijozlar
│       │   ├── AnalyticsPage.js    # AI tahlil va grafik
│       │   └── NotificationsPage.js
│       ├── context/        # React Context (Auth, Socket)
│       └── services/api.js # Barcha API chaqiruvlar
│
├── ai-service/            # Python FastAPI AI xizmati
│   ├── app.py             # AI bashorat API
│   └── requirements.txt
│
├── docker-compose.yml     # Docker orkestratsiya
└── README.md
```

---

## ⚡ Tezkor Ishga Tushirish

### Docker bilan (Tavsiya etiladi)

```bash
# 1. Repozitoriyani klonlang
git clone <repo-url>
cd dairy-factory

# 2. .env faylini yarating
cp backend/.env.example backend/.env
# .env faylida parollarni o'zgartiring!

# 3. Ishga tushiring
docker-compose up -d

# 4. Brauzerda oching
open http://localhost:3000
```

### Qo'lda ishga tushirish

```bash
# PostgreSQL
psql -U postgres -c "CREATE DATABASE dairy_factory;"
psql -U dairy_admin dairy_factory < backend/database/init.sql

# Backend
cd backend
npm install
cp .env.example .env    # .env faylini to'ldiring
node server.js

# Frontend (yangi terminal)
cd frontend
npm install --legacy-peer-deps
npm start

# AI Service (yangi terminal)
cd ai-service
pip install -r requirements.txt
python app.py
```

---

## 🔐 Kirish Ma'lumotlari

| Rol | Email | Parol |
|-----|-------|-------|
| Admin | admin@dairy.uz | Admin2024! |

---

## 📡 API Endpoints

| Method | URL | Tavsif |
|--------|-----|--------|
| POST | /api/auth/login | Tizimga kirish |
| GET | /api/farmers | Fermerlar ro'yxati |
| POST | /api/milk | Sut qabuli |
| POST | /api/production | Yangi partiya + QR |
| GET | /api/inventory | Ombor holati |
| POST | /api/sales | Yangi sotuv |
| GET | /api/analytics/forecast | AI bashorat |
| GET | /api/analytics/optimize | Optimizatsiya |
| GET | /api/notifications | Bildirishnomalar |
| GET | /api/health | Tizim holati |

---

## 🤖 AI Xizmatlar

| Endpoint | Tavsif |
|----------|--------|
| POST /forecast | Sut talabi bashorati (7-30 kun) |
| POST /forecast/sales | Mahsulot sotuvlari prognozi |
| GET /insights/{factory_id} | AI maslahat va tavsiyalar |

---

## 🚀 Cloud Deployment

### Railway.app

```bash
railway login
railway init
railway add postgresql
railway add redis
railway deploy
```

### Render.com

1. GitHub ga push qiling
2. Render.com da "New Web Service" yarating
3. Docker → `backend/Dockerfile` tanlang
4. Environment variables qo'shing

### Vercel (Frontend)

```bash
cd frontend
npm install -g vercel
vercel --prod
```

---

## 📊 Mahsulot Hosildorligi

| Mahsulot | Hosildorlik | Muddat | Birlik |
|----------|-------------|--------|--------|
| Sut | 97% | 7 kun | litr |
| Yogurt | 85% | 14 kun | kg |
| Tvorog | 12% | 5 kun | kg |
| Smetana | 25% | 10 kun | kg |

---

## 🔔 Real-vaqt Bildirishnomalar (Socket.io)

- 📦 Kam zaxira ogohlantirishi
- ⏰ Muddati tugayotgan mahsulotlar
- ⚠️ Sifatsiz sut qabuli
- ✅ Yangi partiya yaratilganda
- 💰 Sotuv amalga oshganda

---

## 📄 Litsenziya

© 2024 SutFactory Pro — Premium Dairy Management System

