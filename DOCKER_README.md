# 🐳 Docker Deployment для CRM School

## 📦 Созданные файлы

### Основные файлы конфигурации:

```
crm_school_g/
├── docker-compose.yml              # Главная конфигурация Docker
├── .env.production                 # Шаблон переменных окружения
├── init-letsencrypt.sh            # Скрипт получения SSL сертификата
│
├── server/
│   ├── Dockerfile                  # Образ для Backend (FastAPI)
│   └── .dockerignore              # Исключения для Docker
│
├── client_crm/
│   ├── Dockerfile                  # Образ для Frontend (React/Vite)
│   ├── nginx.conf                  # Конфигурация Nginx для SPA
│   └── .dockerignore              # Исключения для Docker
│
├── nginx/
│   ├── nginx.conf                  # Главная конфигурация Nginx
│   └── conf.d/
│       ├── crm.conf               # Конфигурация с SSL
│       └── crm.conf.initial       # Начальная конфигурация (без SSL)
│
└── docs/
    ├── DEPLOYMENT.md               # 📘 Полное руководство по развертыванию
    ├── POSTGRESQL_GUIDE.md         # 🐘 Руководство по PostgreSQL
    ├── QUICK_START.md              # ⚡ Быстрый старт
    └── DOCKER_README.md            # 📖 Этот файл
```

---

## 🏗️ Архитектура

```
                    Internet
                       |
                   [Cloudflare]
                       |
                   Port 80/443
                       |
               ┌───────┴────────┐
               │  Nginx Proxy   │  (SSL Termination)
               └───────┬────────┘
                       |
        ┌──────────────┼──────────────┐
        |              |              |
    /api/*         /           /.well-known/
        |              |              |
   ┌────▼────┐    ┌────▼────┐   ┌────▼────┐
   │ Backend │    │Frontend │   │ Certbot │
   │ FastAPI │    │  React  │   │  SSL    │
   │  :8000  │    │   :80   │   └─────────┘
   └────┬────┘    └─────────┘
        |
   ┌────▼─────┐
   │PostgreSQL│
   │  :5432   │
   └──────────┘
```

---

## 🚀 Быстрый старт

### 1. Подготовка

```bash
# Клонировать проект
git clone <your-repo> crm_school && cd crm_school

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh
```

### 2. Настройка

```bash
# Создать .env файл
cp .env.production .env
nano .env  # Заполнить переменные
```

**Обязательно заполните:**
- `POSTGRES_PASSWORD` - пароль для PostgreSQL
- `SECRET_KEY` - секретный ключ для JWT (сгенерируйте: `openssl rand -hex 32`)
- `OPENROUTER_API_KEY` - ключ для OpenRouter API

### 3. Настроить DNS

```
A запись: crm.garryschool.ru → [IP сервера]
```

### 4. Запуск

```bash
# Создать директории
mkdir -p nginx/logs certbot/conf certbot/www backups

# Запустить контейнеры
docker compose up -d

# Получить SSL сертификат
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh

# Проверить
docker compose ps
```

### 5. Доступ

- **Frontend**: https://crm.garryschool.ru
- **API Docs**: https://crm.garryschool.ru/api/docs
- **Логин**: admin / admin

---

## 🔧 Управление

### Основные команды

```bash
# Запустить все контейнеры
docker compose up -d

# Остановить все контейнеры
docker compose down

# Перезапустить
docker compose restart

# Обновить после git pull
docker compose up -d --build

# Логи всех сервисов
docker compose logs -f

# Логи конкретного сервиса
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f nginx

# Статус контейнеров
docker compose ps

# Использование ресурсов
docker stats
```

### Работа с PostgreSQL

```bash
# Войти в psql
docker compose exec postgres psql -U postgres -d crm_school

# Backup базы данных
docker compose exec postgres pg_dump -U postgres crm_school | gzip > backups/backup_$(date +%Y%m%d).sql.gz

# Восстановить базу
gunzip < backups/backup_20260219.sql.gz | docker compose exec -T postgres psql -U postgres -d crm_school

# Применить миграции
docker compose exec backend alembic upgrade head
```

### SSL сертификаты

```bash
# Получить сертификат (первый раз)
./init-letsencrypt.sh

# Обновить сертификат вручную
docker compose run --rm certbot renew

# Проверить сертификат
docker compose exec nginx ls -la /etc/letsencrypt/live/crm.garryschool.ru/
```

---

## 🔒 Безопасность

### Переменные окружения

Не коммитьте `.env` файл! Используйте `.env.production` как шаблон.

**Обязательно измените:**
1. `POSTGRES_PASSWORD` - сильный пароль (минимум 16 символов)
2. `SECRET_KEY` - сгенерируйте новый ключ
3. Пароль администратора после первого входа

### Firewall

```bash
# Разрешить только нужные порты
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### Обновления

```bash
# Регулярно обновляйте Docker образы
docker compose pull
docker compose up -d

# Обновляйте систему
sudo apt update && sudo apt upgrade -y
```

---

## 📊 Мониторинг

### Проверка здоровья

```bash
# Все ли контейнеры запущены?
docker compose ps

# Нет ли ошибок в логах?
docker compose logs --tail=50

# Достаточно ли ресурсов?
docker stats

# Работает ли сайт?
curl -I https://crm.garryschool.ru
```

### Логи

```bash
# Логи Nginx
tail -f nginx/logs/access.log
tail -f nginx/logs/error.log

# Логи Backend
docker compose logs -f backend

# Логи PostgreSQL
docker compose logs -f postgres
```

### Размер данных

```bash
# Размер базы данных
docker compose exec postgres psql -U postgres -d crm_school -c "SELECT pg_size_pretty(pg_database_size('crm_school'));"

# Размер Docker volumes
docker system df -v

# Список backups
ls -lh backups/
```

---

## 🔄 Backup & Restore

### Автоматический backup

Создайте cron задачу:

```bash
# Редактировать crontab
crontab -e

# Добавить строку (backup каждый день в 2:00)
0 2 * * * cd /home/deploy/crm_school && docker compose exec -T postgres pg_dump -U postgres crm_school | gzip > backups/backup_$(date +\%Y\%m\%d).sql.gz
```

### Ручной backup

```bash
# Полный backup
docker compose exec postgres pg_dump -U postgres crm_school | gzip > backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Восстановление

```bash
# 1. Остановить backend
docker compose stop backend

# 2. Пересоздать базу
docker compose exec postgres psql -U postgres << EOF
DROP DATABASE IF EXISTS crm_school;
CREATE DATABASE crm_school;
EOF

# 3. Восстановить данные
gunzip < backups/backup_20260219_143000.sql.gz | docker compose exec -T postgres psql -U postgres -d crm_school

# 4. Запустить backend
docker compose start backend
```

---

## 🆘 Troubleshooting

### Backend не запускается

```bash
# Проверить логи
docker compose logs backend

# Проверить подключение к БД
docker compose exec backend python -c "from app.database import engine; print('OK')"

# Перезапустить
docker compose restart backend
```

### Frontend не отображается

```bash
# Проверить логи
docker compose logs frontend
docker compose logs nginx

# Проверить конфигурацию nginx
docker compose exec nginx nginx -t

# Перезапустить
docker compose restart frontend nginx
```

### SSL не работает

```bash
# Проверить сертификаты
ls -la certbot/conf/live/crm.garryschool.ru/

# Перезапустить скрипт
./init-letsencrypt.sh

# Проверить DNS
dig crm.garryschool.ru
```

### PostgreSQL проблемы

```bash
# Проверить логи
docker compose logs postgres

# Проверить статус
docker compose exec postgres pg_isready -U postgres

# Войти в базу
docker compose exec postgres psql -U postgres -d crm_school
```

### Полный перезапуск

```bash
# Остановить все
docker compose down

# Очистить логи
rm -f nginx/logs/*

# Запустить заново
docker compose up -d

# Проверить
docker compose ps
docker compose logs -f
```

---

## 📚 Документация

### Основные руководства:

1. **[QUICK_START.md](./QUICK_START.md)** ⚡
   - Быстрое развертывание за 10 минут
   - Основные команды

2. **[DEPLOYMENT.md](./DEPLOYMENT.md)** 📘
   - Полное руководство по развертыванию
   - Настройка сервера
   - Установка Docker
   - Получение SSL
   - Мониторинг

3. **[POSTGRESQL_GUIDE.md](./POSTGRESQL_GUIDE.md)** 🐘
   - Установка PostgreSQL
   - Создание базы данных
   - Резервное копирование
   - Восстановление
   - Полезные команды

### Конфигурационные файлы:

- `docker-compose.yml` - Конфигурация контейнеров
- `.env.production` - Шаблон переменных окружения
- `nginx/nginx.conf` - Главная конфигурация Nginx
- `nginx/conf.d/crm.conf` - Конфигурация домена
- `init-letsencrypt.sh` - Скрипт получения SSL

---

## 🎯 Чек-лист успешного развертывания

- ✅ Docker установлен и работает
- ✅ DNS настроен (crm.garryschool.ru → IP сервера)
- ✅ `.env` файл создан и заполнен
- ✅ Контейнеры запущены (`docker compose ps`)
- ✅ SSL сертификат получен
- ✅ Сайт доступен: https://crm.garryschool.ru
- ✅ API работает: https://crm.garryschool.ru/api/docs
- ✅ База данных подключена
- ✅ Можно залогиниться (admin/admin)
- ✅ Настроен автоматический backup

---

## 📞 Поддержка

**Email**: vadiqbozhko@gmail.com
**Домен**: crm.garryschool.ru

---

## 🔄 Обновления

### Получение обновлений

```bash
# Получить изменения из git
git pull origin main

# Пересобрать и перезапустить
docker compose up -d --build

# Проверить логи
docker compose logs -f
```

### Откат к предыдущей версии

```bash
# Остановить контейнеры
docker compose down

# Откатиться в git
git checkout <previous-commit-hash>

# Запустить
docker compose up -d --build
```

---

**Готово! Ваша CRM School развернута и работает!** 🎉

Используйте документацию выше для настройки и управления системой.
