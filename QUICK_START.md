# ⚡ Быстрый старт - CRM School

## 🚀 Развертывание за 10 минут

### Шаг 1: Подготовка сервера (2 минуты)

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Установить Git
sudo apt install -y git
```

### Шаг 2: Клонировать проект (1 минута)

```bash
cd ~
git clone <your-repo-url> crm_school
cd crm_school
```

### Шаг 3: Настроить переменные (2 минуты)

```bash
# Скопировать шаблон
cp .env.production .env

# Редактировать
nano .env
```

Заполните:
```bash
POSTGRES_PASSWORD=your_secure_password_here
SECRET_KEY=$(openssl rand -hex 32)
OPENROUTER_API_KEY=your_api_key_here
```

### Шаг 4: Настроить DNS (сделать заранее!)

В панели DNS провайдера:
```
Тип: A
Имя: crm
Значение: [IP вашего сервера]
```

Проверить: `dig crm.garryschool.ru`

### Шаг 5: Запустить приложение (2 минуты)

```bash
# Создать директории
mkdir -p nginx/logs certbot/conf certbot/www backups

# Запустить
docker compose up -d

# Проверить
docker compose ps
```

### Шаг 6: Получить SSL (3 минуты)

```bash
# Запустить скрипт
chmod +x init-letsencrypt.sh
./init-letsencrypt.sh
```

### Шаг 7: Проверить работу

Откройте в браузере:
- https://crm.garryschool.ru - фронтенд
- https://crm.garryschool.ru/api/docs - API документация

Логин по умолчанию: `admin` / `admin`

---

## 📋 Основные команды

```bash
# Запустить
docker compose up -d

# Остановить
docker compose down

# Логи
docker compose logs -f

# Перезапустить
docker compose restart

# Обновить
git pull
docker compose up -d --build

# Backup базы
docker compose exec postgres pg_dump -U postgres crm_school | gzip > backups/backup_$(date +%Y%m%d).sql.gz

# Восстановить базу
gunzip < backups/backup_20260219.sql.gz | docker compose exec -T postgres psql -U postgres -d crm_school
```

---

## 🆘 Проблемы?

**SSL не работает:**
```bash
./init-letsencrypt.sh
```

**Backend не запускается:**
```bash
docker compose logs backend
docker compose restart backend
```

**База не подключается:**
```bash
docker compose logs postgres
docker compose restart postgres
```

**Полная перезагрузка:**
```bash
docker compose down
docker compose up -d
```

---

## 📚 Полная документация

- `DEPLOYMENT.md` - Полное руководство по развертыванию
- `POSTGRESQL_GUIDE.md` - Работа с PostgreSQL
- `docker-compose.yml` - Конфигурация контейнеров

---

**Готово! Ваша CRM работает на https://crm.garryschool.ru** 🎉
