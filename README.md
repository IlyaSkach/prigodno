Prigodno CRM (promo-codes)

Простой ЛК для генерации, импорта, списка и активации промо-кодов. Данные хранятся как JSON в Netlify Blobs.

Локальный запуск:

- npm install
- npx netlify dev

API:

- GET /api/codes — список
- POST /api/generate — { count, prefix, tag }
- POST /api/import — { entries: [{ code, tag }] }
- POST /api/redeem — { code, usedBy }
