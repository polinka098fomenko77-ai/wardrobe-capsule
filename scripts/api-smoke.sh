#!/usr/bin/env bash
# Перевірка API: реєстрація, фото, каталог, гардероб, примірка.
# Запуск: ./scripts/api-smoke.sh /шлях/до/photo.png   (бекенд має працювати)
BASE="${BASE:-http://localhost:4000}"
PHOTO="$1"
[ -f "$PHOTO" ] || { echo "Використання: $0 /шлях/до/photo.png"; exit 1; }

FAILED=0
ok()   { echo "  ✔ $1"; }
fail() { echo "  ✘ $1"; FAILED=1; }
jget() { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{let v=JSON.parse(s);for(const k of process.argv[1].split(".")){v=v==null?undefined:v[k]}console.log(v==null?"":v)}catch(e){console.log("")}})' "$1"; }

STAMP=$(date +%s)
EMAIL="tester${STAMP}@example.com"
NICK="tester$(echo "$STAMP" | tail -c 7)"
PASS="TestPass123"

echo "1. Реєстрація"
REG=$(curl -s -X POST "$BASE/auth/register" -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"firstName\":\"Тест\",\"lastName\":\"Користувач\",\"nickname\":\"$NICK\",\"heightCm\":168,\"chestCm\":90,\"waistCm\":70,\"hipsCm\":96}")
TOKEN=$(echo "$REG" | jget token)
[ -z "$TOKEN" ] && TOKEN=$(echo "$REG" | jget accessToken)
if [ -n "$TOKEN" ]; then ok "користувача створено, токен отримано"; else fail "реєстрація не вдалася: $REG"; exit 1; fi
AUTH="Authorization: Bearer $TOKEN"

echo "2. Доступ без токена має бути заборонений"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/me")
[ "$CODE" = "401" ] && ok "без токена: 401" || fail "очікувався 401, отримано $CODE"

echo "3. Профіль"
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/me" -H "$AUTH")
[ "$CODE" = "200" ] && ok "профіль: 200" || fail "профіль: $CODE"

echo "4. Завантаження фото"
UP=$(curl -s -X POST "$BASE/photos" -H "$AUTH" -F "file=@$PHOTO")
PHOTO_ID=$(echo "$UP" | jget id)
if [ -n "$PHOTO_ID" ]; then ok "фото завантажено, id=$PHOTO_ID"; else fail "фото не завантажено: $UP"; exit 1; fi

echo "5. Каталог"
ITEMS=$(curl -s "$BASE/items?limit=1" -H "$AUTH")
ITEM_ID=$(echo "$ITEMS" | jget items.0.id)
[ -z "$ITEM_ID" ] && ITEM_ID=$(echo "$ITEMS" | jget 0.id)
if [ -n "$ITEM_ID" ]; then ok "річ із каталогу, id=$ITEM_ID"; else fail "каталог порожній: $ITEMS"; exit 1; fi

echo "6. Гардероб"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/wardrobe" -H "$AUTH" -H "Content-Type: application/json" -d "{\"itemId\":$ITEM_ID}")
[ "$CODE" = "201" ] && ok "річ додано: 201" || fail "додавання в гардероб: $CODE"

echo "7. Примірка (через ШІ, може тривати до кількох хвилин)"
TRY=$(curl -s -X POST "$BASE/tryons" -H "$AUTH" -H "Content-Type: application/json" -d "{\"photoId\":$PHOTO_ID,\"itemId\":$ITEM_ID}")
TRY_ID=$(echo "$TRY" | jget id)
if [ -n "$TRY_ID" ]; then ok "примірку створено, id=$TRY_ID, статус $(echo "$TRY" | jget status)"; else fail "примірку не створено: $TRY"; exit 1; fi

ST=""
for i in $(seq 1 60); do
  ST=$(curl -s "$BASE/tryons/$TRY_ID" -H "$AUTH" | jget status)
  echo "   статус: $ST"
  [ "$ST" = "DONE" ] || [ "$ST" = "FAILED" ] && break
  sleep 5
done

if [ "$ST" = "DONE" ]; then
  OUT="$HOME/Desktop/tryon-result.png"
  CODE=$(curl -s -o "$OUT" -w "%{http_code}" "$BASE/tryons/$TRY_ID/result" -H "$AUTH")
  [ "$CODE" = "200" ] && ok "примірку виконано, результат збережено: $OUT" || fail "результат: HTTP $CODE"
elif [ "$ST" = "FAILED" ]; then
  fail "примірка завершилась помилкою (дивіться лог бекенду)"
else
  fail "примірка не завершилась за 5 хвилин (статус: $ST)"
fi

echo
[ "$FAILED" = "0" ] && echo "ГОТОВО: усі перевірки пройдено" || echo "Є помилки, див. вище"
exit $FAILED
