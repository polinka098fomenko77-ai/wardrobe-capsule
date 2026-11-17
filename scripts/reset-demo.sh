#!/usr/bin/env bash
# Повертає проєкт у стан "порожня база, нічого не завантажено".
# Видаляє ЛИШЕ базу цього проєкту (контейнер wardrobe-db і його дані).
# Інші ваші бази (course-postgres тощо) не зачіпаються.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "1/5  Зупиняємо і видаляємо базу проєкту разом з даними"
docker compose down -v

echo "2/5  Запускаємо нову порожню PostgreSQL"
docker compose up -d

echo "3/5  Чекаємо, поки база буде готова"
for i in $(seq 1 30); do
  if docker exec wardrobe-db pg_isready -U wardrobe -d wardrobe >/dev/null 2>&1; then break; fi
  sleep 1
done
sleep 3   # PostgreSQL при першому старті перезапускається один раз

echo "4/5  Створюємо таблиці з міграцій"
cd backend
[ -f .env ] || cp .env.example .env
npx prisma migrate deploy
cd ..

echo "5/5  Прибираємо раніше завантажені файли"
rm -rf backend/uploads

echo
echo "Готово. Таблиці в порожній базі:"
docker exec wardrobe-db psql -U wardrobe -d wardrobe -c '\dt'
echo "Користувачів у базі:"
docker exec wardrobe-db psql -U wardrobe -d wardrobe -t -c 'SELECT count(*) FROM "User";'
