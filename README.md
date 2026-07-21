# notification_bot

Telegram-бот, который периодически проверяет доступные слоты на amurbooking.com и присылает уведомления в чат.

## Установка

```bash
yarn install
cp .env.example .env
```

Заполните `.env`:

```
BOT_TOKEN=токен_телеграм_бота
CHAT_ID=id_чата_для_уведомлений
```

## Управление через PM2

Конфигурация процесса описана в `ecosystem.config.js` (имя процесса — `notification-bot`).

### Запуск

```bash
pm2 start ecosystem.config.js
```

### Остановка

```bash
pm2 stop notification-bot
```

### Перезапуск

```bash
pm2 restart notification-bot
```

### Полное удаление процесса из PM2

```bash
pm2 delete notification-bot
```

### Просмотр статуса

```bash
pm2 status
```

### Просмотр логов

```bash
pm2 logs notification-bot
```

Только последние N строк без live-режима:

```bash
pm2 logs notification-bot --lines 100 --nostream
```

### Автозапуск при перезагрузке сервера

Один раз настроить автозапуск PM2 при старте системы:

```bash
pm2 startup
```

Выполнить команду, которую выведет `pm2 startup` (требует прав администратора/root).

Сохранить текущий список процессов, чтобы он поднимался после перезагрузки:

```bash
pm2 save
```

После этого при каждом изменении списка процессов (`pm2 start`/`pm2 delete` и т.д.) повторяйте `pm2 save`.
