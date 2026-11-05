# Примірочна: вебсервіс віртуальної примірки одягу

## Структура
- `backend/`: Node.js + Express + TypeScript + Prisma
- `frontend/`: React + Vite + TypeScript
- `docker-compose.yml`: PostgreSQL

## Перший запуск
1. `docker compose up -d` (з кореня проєкту), піднімає базу
2. `cd backend && npm install`
3. `npx prisma migrate dev --name init` створює таблиці
4. `npm run dev`, потім відкрийте http://localhost:4000/health
   Очікується: `{"status":"ok","db":"up"}`
5. В іншому терміналі: `cd frontend && npm install && npm run dev`

## Корисне
- `npx prisma studio`: перегляд таблиць у браузері
- Змінні середовища: `backend/.env` (шаблон у `.env.example`)
