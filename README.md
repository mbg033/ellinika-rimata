# Ρήματα — тренажёр греческих глаголов

Сайт: https://ellinika-rimata.pages.dev/

Статический сайт без этапа сборки. HTML, CSS, JavaScript и данные 187 встроенных карточек находятся в корне репозитория.

## Локальный запуск

```sh
python3 -m http.server 8000
```

Откройте http://localhost:8000. ES-модули требуют HTTP-сервера.

## Публикация

Каждый push в `main` запускает `.github/workflows/deploy.yml`. Workflow копирует пять файлов сайта во временный каталог runner и отправляет их в существующий Cloudflare Pages проект `ellinika-rimata`. Папку `dist/` хранить не нужно.

Публикуемые файлы: `index.html`, `style.css`, `app.js`, `data.js`, `glossary.js`. Если добавляются новые ресурсы, включите их в команду копирования workflow.

GitHub Actions использует секреты `CLOUDFLARE_ACCOUNT_ID` и `CLOUDFLARE_API_TOKEN` (Account → Cloudflare Pages → Edit, только нужный аккаунт). Токены не хранятся в исходниках.

Адрес сайта остаётся прежним. Прогресс и пользовательские карточки хранятся в localStorage браузера по ключу `rimata-v1`; они не отправляются в GitHub или Cloudflare.

Первоначальный источник: ChatGPT Sites, версия 2, коммит `b2707dca5d853253c62504de4a0e78b8f300688d`. Старый сайт https://ellinika-rimata.nearbytoffee1.chatgpt.site остаётся доступным.
