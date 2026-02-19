# 🚀 Инструкция по развертыванию CRM School на сервере

## 📋 Оглавление

1. [Требования](#требования)
2. [Подготовка сервера](#подготовка-сервера)
3. [Установка Docker](#установка-docker)
4. [Настройка DNS](#настройка-dns)
5. [Развертывание приложения](#развертывание-приложения)
6. [Получение SSL сертификата](#получение-ssl-сертификата)
7. [Работа с PostgreSQL](#работа-с-postgresql)
8. [Резервное копирование](#резервное-копирование)
9. [Управление контейнерами](#управление-контейнерами)

---

## 📌 Требования

### Минимальные требования сервера:
- **OS**: Ubuntu 20.04/22.04 LTS или Debian 11/12
- **CPU**: 2 ядра
- **RAM**: 4GB
- **Disk**: 20GB SSD
- **Network**: Статический IP адрес

### Необходимое ПО:
- Docker 20.10+
- Docker Compose 2.0+
- Git

---

## 🔧 Подготовка сервера

### 1. Обновление системы

```bash
# Обновить пакеты
sudo apt update && sudo apt upgrade -y

# Установить необходимые пакеты
sudo apt install -y curl wget git vim ufw
```

### 2. Настройка firewall

```bash
# Разрешить SSH
sudo ufw allow 22/tcp

# Разрешить HTTP и HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Включить firewall
sudo ufw enable

# Проверить статус
sudo ufw status
```

### 3. Создание пользователя для деплоя (опционально)

```bash
# Создать пользователя
sudo adduser deploy

# Добавить в группу sudo
sudo usermod -aG sudo deploy

# Добавить в группу docker (после установки Docker)
sudo usermod -aG docker deploy
```

---

## 🐳 Установка Docker

### Установка Docker Engine

```bash
# Удалить старые версии (если есть)
sudo apt remove docker docker-engine docker.io containerd runc

# Установить зависимости
sudo apt install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Добавить официальный GPG ключ Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Добавить репозиторий Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Обновить список пакетов
sudo apt update

# Установить Docker
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Проверить установку
docker --version
docker compose version
```

### Настройка Docker

```bash
# Запустить Docker при загрузке
sudo systemctl enable docker
sudo systemctl start docker

# Проверить статус
sudo systemctl status docker

# Добавить текущего пользователя в группу docker
sudo usermod -aG docker $USER

# Применить изменения (или перелогиниться)
newgrp docker

# Проверить работу без sudo
docker ps
```

---

## 🌐 Настройка DNS

### Добавить A-запись для домена

В панели управления вашего DNS провайдера:

```
Тип: A
Имя: crm
Значение: [IP адрес вашего сервера]
TTL: 3600
```

Результат: `crm.garryschool.ru` → IP сервера

### Проверить DNS

```bash
# Проверить разрешение домена
dig crm.garryschool.ru

# или
nslookup crm.garryschool.ru

# Дождаться распространения DNS (может занять до 24 часов)
```

---

## 🚀 Развертывание приложения

### 1. Клонировать репозиторий

```bash
# Перейти в домашнюю директорию
cd ~

# Клонировать проект
git clone <your-repo-url> crm_school
cd crm_school
```

### 2. Настроить переменные окружения

```bash
# Скопировать шаблон
cp .env.production .env

# Редактировать файл
nano .env
```

**Заполните следующие переменные:**

```bash
# PostgreSQL
POSTGRES_PASSWORD=ваш_очень_сложный_пароль_для_postgres

# Backend
SECRET_KEY=ваш_секретный_ключ_для_jwt_токенов
OPENROUTER_API_KEY=ваш_ключ_openrouter_api

# Domain
DOMAIN=crm.garryschool.ru
EMAIL=vadiqbozhko@gmail.com
```

**Генерация SECRET_KEY:**

```bash
# Сгенерировать случайный ключ
openssl rand -hex 32
```

### 3. Создать необходимые директории

```bash
# Создать директории для логов и сертификатов
mkdir -p nginx/logs
mkdir -p certbot/conf
mkdir -p certbot/www
mkdir -p backups

# Установить права
chmod -R 755 nginx certbot backups
```

### 4. Собрать и запустить контейнеры

```bash
# Собрать образы
docker compose build

# Запустить в фоновом режиме
docker compose up -d

# Проверить статус
docker compose ps

# Посмотреть логи
docker compose logs -f
```

**Ожидаемый результат:**

```
NAME                IMAGE                   STATUS
crm_postgres        postgres:15-alpine      Up
crm_backend         crm_school-backend      Up
crm_frontend        crm_school-frontend     Up
crm_nginx           nginx:alpine            Up
crm_certbot         certbot/certbot         Up
```

### 5. Проверить работу без SSL

```bash
# Проверить доступность через HTTP
curl http://crm.garryschool.ru

# Проверить API
curl http://crm.garryschool.ru/api/docs
```

---

## 🔒 Получение SSL сертификата

### Метод 1: Автоматический (рекомендуется)

```bash
# Сделать скрипт исполняемым
chmod +x init-letsencrypt.sh

# Запустить скрипт
./init-letsencrypt.sh
```

Скрипт автоматически:
1. Использует временную конфигурацию nginx (без SSL)
2. Запрашивает сертификат через Certbot
3. Переключает на production конфигурацию (с SSL)
4. Перезагружает nginx

### Метод 2: Ручной

**Шаг 1: Использовать начальную конфигурацию**

```bash
# Скопировать временную конфигурацию
cp nginx/conf.d/crm.conf.initial nginx/conf.d/crm.conf

# Перезапустить nginx
docker compose restart nginx
```

**Шаг 2: Получить сертификат**

```bash
# Запросить сертификат
docker compose run --rm certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  --email vadiqbozhko@gmail.com \
  --agree-tos \
  --no-eff-email \
  -d crm.garryschool.ru

# Проверить получение сертификата
ls -la certbot/conf/live/crm.garryschool.ru/
```

**Шаг 3: Переключить на production конфигурацию**

```bash
# Восстановить production конфигурацию с SSL
cp nginx/conf.d/crm.conf.initial nginx/conf.d/crm.conf.backup
# Затем вручную отредактировать crm.conf или использовать готовую версию

# Перезапустить nginx
docker compose restart nginx
```

### Проверка SSL

```bash
# Проверить сертификат
curl https://crm.garryschool.ru

# Проверить оценку SSL
# Зайдите на: https://www.ssllabs.com/ssltest/
```

### Автоматическое обновление сертификатов

Certbot автоматически обновляет сертификаты каждые 12 часов (настроено в docker-compose.yml).

**Проверка обновления вручную:**

```bash
# Проверить обновление
docker compose run --rm certbot renew --dry-run

# Принудительно обновить
docker compose run --rm certbot renew --force-renewal

# Перезагрузить nginx после обновления
docker compose exec nginx nginx -s reload
```

---

## 🗄️ Работа с PostgreSQL

### Установка PostgreSQL (если используете отдельный сервер)

```bash
# Установить PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Запустить сервис
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Проверить статус
sudo systemctl status postgresql
```

### Создание базы данных

#### Через Docker (рекомендуется)

База создается автоматически при запуске контейнера.

**Подключение к PostgreSQL:**

```bash
# Войти в контейнер
docker compose exec postgres psql -U postgres -d crm_school

# или напрямую выполнить команду
docker compose exec postgres psql -U postgres -d crm_school -c "SELECT version();"
```

#### Вручную (если нужно пересоздать)

```bash
# Войти в PostgreSQL
docker compose exec postgres psql -U postgres

# Удалить существующую базу (осторожно!)
DROP DATABASE IF EXISTS crm_school;

# Создать новую базу
CREATE DATABASE crm_school;

# Дать права пользователю
GRANT ALL PRIVILEGES ON DATABASE crm_school TO postgres;

# Выйти
\q
```

### Применение миграций

```bash
# Миграции применяются автоматически при запуске backend
# Если нужно применить вручную:

# Войти в контейнер backend
docker compose exec backend bash

# Применить миграции
alembic upgrade head

# Посмотреть текущую версию
alembic current

# Выйти
exit
```

### Создание первого администратора

```bash
# Войти в backend контейнер
docker compose exec backend python

# В Python консоли:
from app.database import AsyncSessionLocal
from app.models.employee import Employee
from app.auth.password import get_password_hash
import asyncio

async def create_admin():
    async with AsyncSessionLocal() as db:
        admin = Employee(
            email="admin@crm-school.com",
            hashed_password=get_password_hash("admin"),
            first_name="Администратор",
            last_name="Системы",
            role="admin",
            is_active=True
        )
        db.add(admin)
        await db.commit()
        print("Admin created!")

asyncio.run(create_admin())
exit()
```

---

## 💾 Резервное копирование

### Создание backup

```bash
# Создать backup базы данных
docker compose exec postgres pg_dump -U postgres crm_school > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# С сжатием
docker compose exec postgres pg_dump -U postgres crm_school | gzip > backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Проверить размер backup
ls -lh backups/
```

### Восстановление из backup

#### Восстановление обычного backup (.sql)

```bash
# Остановить backend (чтобы не было активных подключений)
docker compose stop backend

# Войти в PostgreSQL и пересоздать базу
docker compose exec postgres psql -U postgres << EOF
DROP DATABASE IF EXISTS crm_school;
CREATE DATABASE crm_school;
EOF

# Восстановить данные
cat backups/backup_20260219_143000.sql | docker compose exec -T postgres psql -U postgres -d crm_school

# Запустить backend
docker compose start backend
```

#### Восстановление сжатого backup (.sql.gz)

```bash
# Остановить backend
docker compose stop backend

# Пересоздать базу
docker compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS crm_school;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE crm_school;"

# Восстановить из сжатого архива
gunzip < backups/backup_20260219_143000.sql.gz | docker compose exec -T postgres psql -U postgres -d crm_school

# Запустить backend
docker compose start backend
```

### Автоматическое резервное копирование

**Создать скрипт backup:**

```bash
# Создать файл
nano /home/deploy/backup_crm.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/home/deploy/crm_school/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql.gz"

# Создать backup
cd /home/deploy/crm_school
docker compose exec -T postgres pg_dump -U postgres crm_school | gzip > "$BACKUP_FILE"

# Удалить старые backup (старше 30 дней)
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup created: $BACKUP_FILE"
```

```bash
# Сделать исполняемым
chmod +x /home/deploy/backup_crm.sh
```

**Настроить cron:**

```bash
# Открыть crontab
crontab -e

# Добавить строку (backup каждый день в 2:00 ночи)
0 2 * * * /home/deploy/backup_crm.sh >> /home/deploy/backup_crm.log 2>&1
```

---

## 🔧 Управление контейнерами

### Основные команды

```bash
# Запустить все контейнеры
docker compose up -d

# Остановить все контейнеры
docker compose down

# Перезапустить все контейнеры
docker compose restart

# Пересобрать образы и запустить
docker compose up -d --build

# Просмотр логов
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

### Обновление приложения

```bash
# Остановить контейнеры
docker compose down

# Получить последние изменения из git
git pull origin main

# Пересобрать образы
docker compose build

# Запустить контейнеры
docker compose up -d

# Проверить логи
docker compose logs -f
```

### Очистка Docker

```bash
# Удалить неиспользуемые образы
docker image prune -a

# Удалить неиспользуемые volumes
docker volume prune

# Удалить неиспользуемые контейнеры
docker container prune

# Полная очистка (осторожно!)
docker system prune -a --volumes
```

### Мониторинг

```bash
# Посмотреть использование ресурсов
docker stats

# Посмотреть логи nginx
tail -f nginx/logs/access.log
tail -f nginx/logs/error.log

# Посмотреть размер volumes
docker system df -v
```

---

## 🔍 Troubleshooting

### Backend не запускается

```bash
# Проверить логи
docker compose logs backend

# Проверить подключение к БД
docker compose exec backend python -c "from app.database import engine; print('DB OK')"

# Проверить миграции
docker compose exec backend alembic current
```

### Frontend не доступен

```bash
# Проверить логи
docker compose logs frontend

# Проверить nginx конфиг
docker compose exec nginx nginx -t

# Перезапустить nginx
docker compose restart nginx
```

### PostgreSQL проблемы

```bash
# Проверить логи
docker compose logs postgres

# Проверить подключение
docker compose exec postgres pg_isready -U postgres

# Войти в psql
docker compose exec postgres psql -U postgres -d crm_school
```

### SSL не работает

```bash
# Проверить сертификаты
ls -la certbot/conf/live/crm.garryschool.ru/

# Проверить nginx конфиг
docker compose exec nginx nginx -t

# Проверить логи certbot
docker compose logs certbot

# Запросить сертификат заново
docker compose run --rm certbot certonly --webroot --webroot-path=/var/www/certbot --email vadiqbozhko@gmail.com --agree-tos --no-eff-email -d crm.garryschool.ru
```

---

## ✅ Проверка успешного развертывания

После завершения всех шагов проверьте:

- ✅ Сайт доступен по адресу: https://crm.garryschool.ru
- ✅ SSL сертификат валиден (зеленый замок в браузере)
- ✅ API доступен: https://crm.garryschool.ru/api/docs
- ✅ Авторизация работает
- ✅ База данных отвечает
- ✅ Логи не содержат критических ошибок

**Тестовая команда:**

```bash
# Проверить все компоненты
curl -I https://crm.garryschool.ru && \
curl -I https://crm.garryschool.ru/api/docs && \
docker compose ps && \
echo "✅ Все работает!"
```

---

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `docker compose logs -f`
2. Проверьте статус: `docker compose ps`
3. Проверьте ресурсы: `docker stats`
4. Проверьте документацию выше

---

**Готово! Ваша CRM система развернута и готова к работе!** 🎉
