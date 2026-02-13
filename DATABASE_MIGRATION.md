# Перенос базы данных PostgreSQL

## Два способа переноса

### Способ 1: С данными (backup + restore)
Используйте этот способ если нужно перенести базу данных **с существующими данными** (студенты, группы, сотрудники).

### Способ 2: Без данных (только структура)
Используйте этот способ для **чистой установки** на новом устройстве (только структура таблиц, без данных).

---

## 📦 Способ 1: Перенос с данными

### Шаг 1: Создание backup на старом устройстве

#### Windows:
```cmd
cd "C:\Program Files\PostgreSQL\16\bin"

# Создать backup с данными
pg_dump -U postgres -d crm_school -F c -b -v -f "C:\backup\crm_school_backup.dump"

# Или в формате SQL (текстовый файл)
pg_dump -U postgres -d crm_school > "C:\backup\crm_school_backup.sql"
```

#### Linux/Mac:
```bash
# Создать backup с данными
pg_dump -U postgres -d crm_school -F c -b -v -f ~/backup/crm_school_backup.dump

# Или в формате SQL
pg_dump -U postgres -d crm_school > ~/backup/crm_school_backup.sql
```

**Параметры:**
- `-U postgres` - пользователь PostgreSQL
- `-d crm_school` - имя базы данных
- `-F c` - формат custom (сжатый)
- `-b` - включить большие объекты
- `-v` - verbose (показывать процесс)
- `-f` - путь к файлу backup

### Шаг 2: Перенос файла на новое устройство

Скопируйте файл backup на новое устройство:
- Через USB флешку
- Через облачное хранилище (Google Drive, Dropbox)
- Через сеть (scp, FTP)

### Шаг 3: Восстановление на новом устройстве

#### Предварительная подготовка:

1. Установите PostgreSQL (если еще не установлен)
2. Создайте пустую базу данных:

**Windows:**
```cmd
cd "C:\Program Files\PostgreSQL\16\bin"
psql -U postgres

# В psql:
CREATE DATABASE crm_school;
\q
```

**Linux/Mac:**
```bash
psql -U postgres

# В psql:
CREATE DATABASE crm_school;
\q
```

#### Восстановление из backup:

**Windows (формат .dump):**
```cmd
cd "C:\Program Files\PostgreSQL\16\bin"
pg_restore -U postgres -d crm_school -v "C:\backup\crm_school_backup.dump"
```

**Windows (формат .sql):**
```cmd
cd "C:\Program Files\PostgreSQL\16\bin"
psql -U postgres -d crm_school < "C:\backup\crm_school_backup.sql"
```

**Linux/Mac (формат .dump):**
```bash
pg_restore -U postgres -d crm_school -v ~/backup/crm_school_backup.dump
```

**Linux/Mac (формат .sql):**
```bash
psql -U postgres -d crm_school < ~/backup/crm_school_backup.sql
```

### Шаг 4: Проверка восстановления

```sql
# Подключитесь к базе
psql -U postgres -d crm_school

# Проверьте таблицы
\dt

# Проверьте количество записей
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM students;
SELECT COUNT(*) FROM groups;

# Выход
\q
```

---

## 🔧 Способ 2: Перенос без данных (только структура)

Используйте этот способ для чистой установки на новом устройстве.

### Шаг 1: На новом устройстве создайте базу

**Windows:**
```cmd
cd "C:\Program Files\PostgreSQL\16\bin"
psql -U postgres

# В psql:
CREATE DATABASE crm_school;
\q
```

**Linux/Mac:**
```bash
psql -U postgres

# В psql:
CREATE DATABASE crm_school;
\q
```

### Шаг 2: Настройте .env файл

Создайте файл `server/.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost/crm_school

# Security
SECRET_KEY=your-secret-key-min-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

### Шаг 3: Примените миграции Alembic

```bash
# Перейдите в папку server
cd server

# Активируйте виртуальное окружение (если есть)
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Примените миграции
alembic upgrade head
```

Это создаст все таблицы автоматически!

### Шаг 4: Создайте администратора

```bash
# Из корня проекта
cd server
python create_admin.py
```

Или вручную через SQL:

```sql
psql -U postgres -d crm_school

-- Создать пользователя admin (пароль: admin)
-- Хэш для пароля 'admin'
INSERT INTO users (email, hashed_password, full_name, is_active, role)
VALUES (
  'admin@crm-school.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5ND0dalmbmkzO',
  'Администратор',
  true,
  'admin'
);
```

---

## 📋 Сравнение способов

| Критерий | С данными (Способ 1) | Без данных (Способ 2) |
|----------|---------------------|----------------------|
| **Время** | Зависит от размера БД | Быстро (секунды) |
| **Данные** | Все данные переносятся | Чистая БД |
| **Сложность** | Средняя | Простая |
| **Использование** | Миграция на новый сервер | Новая установка/разработка |

---

## 🔄 Автоматический backup (рекомендуется)

### Windows (Task Scheduler)

Создайте файл `backup_db.bat`:

```batch
@echo off
set PGPASSWORD=your_postgres_password
set BACKUP_DIR=C:\backups\crm_school
set DATE=%date:~-4,4%%date:~-10,2%%date:~-7,2%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

"C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -U postgres -d crm_school -F c -f "%BACKUP_DIR%\crm_school_%DATE%.dump"

echo Backup created: crm_school_%DATE%.dump

# Удалить backup старше 7 дней
forfiles /p "%BACKUP_DIR%" /m *.dump /d -7 /c "cmd /c del @path"
```

Настройте запуск через Task Scheduler (ежедневно в 2:00 ночи).

### Linux/Mac (cron)

Создайте файл `backup_db.sh`:

```bash
#!/bin/bash

BACKUP_DIR=~/backups/crm_school
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

export PGPASSWORD='your_postgres_password'
pg_dump -U postgres -d crm_school -F c -f "$BACKUP_DIR/crm_school_$DATE.dump"

echo "Backup created: crm_school_$DATE.dump"

# Удалить backup старше 7 дней
find $BACKUP_DIR -name "*.dump" -mtime +7 -delete
```

Дайте права и добавьте в cron:

```bash
chmod +x backup_db.sh

# Открыть crontab
crontab -e

# Добавить строку (каждый день в 2:00)
0 2 * * * /path/to/backup_db.sh >> /var/log/crm_backup.log 2>&1
```

---

## 🔍 Проверка целостности backup

```bash
# Проверить размер backup
ls -lh crm_school_backup.dump

# Проверить содержимое (список таблиц)
pg_restore --list crm_school_backup.dump | grep "TABLE DATA"

# Тестовое восстановление в отдельную БД
createdb test_restore
pg_restore -U postgres -d test_restore crm_school_backup.dump
psql -U postgres -d test_restore -c "SELECT COUNT(*) FROM users;"
dropdb test_restore
```

---

## ⚠️ Важные замечания

### 1. Пароли PostgreSQL
Если не хотите вводить пароль каждый раз:

**Windows:**
Создайте файл `%APPDATA%\postgresql\pgpass.conf`:
```
localhost:5432:*:postgres:your_password
```

**Linux/Mac:**
Создайте файл `~/.pgpass`:
```
localhost:5432:*:postgres:your_password
```

Дайте права:
```bash
chmod 600 ~/.pgpass
```

### 2. Версии PostgreSQL
Убедитесь что версии PostgreSQL совместимы:
- Лучше использовать одинаковые версии
- Новая версия обычно может восстановить backup из старой
- Старая версия НЕ может восстановить backup из новой

Проверить версию:
```bash
psql --version
```

### 3. Размер backup
Если база данных большая (>100 MB):
- Используйте формат custom (-F c) - он сжатый
- Или сжимайте SQL файл: `gzip crm_school_backup.sql`

### 4. Безопасность
⚠️ **НИКОГДА не загружайте backup в публичные места!**
- Backup содержит все данные (пользователи, пароли, личную информацию)
- Храните backup в безопасном месте
- Используйте шифрование для передачи

---

## 🎯 Быстрая памятка

### Создать backup:
```bash
pg_dump -U postgres -d crm_school > backup.sql
```

### Восстановить backup:
```bash
# Создать БД
createdb crm_school

# Восстановить
psql -U postgres -d crm_school < backup.sql
```

### Только структура (без данных):
```bash
# На новом устройстве
cd server
alembic upgrade head
python create_admin.py
```

---

## 📚 Дополнительные ресурсы

- [PostgreSQL Documentation - pg_dump](https://www.postgresql.org/docs/current/app-pgdump.html)
- [PostgreSQL Documentation - pg_restore](https://www.postgresql.org/docs/current/app-pgrestore.html)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)

---

## ❓ Проблемы и решения

### Ошибка: "database does not exist"
```bash
# Создайте базу данных сначала
createdb -U postgres crm_school
```

### Ошибка: "role does not exist"
```bash
# Создайте роль postgres (если нужно)
createuser -U postgres -s postgres
```

### Ошибка: "permission denied"
```bash
# Проверьте права на файл backup
chmod 644 backup.sql
```

### Backup занимает много места
```bash
# Используйте сжатие
pg_dump -U postgres -d crm_school | gzip > backup.sql.gz

# Восстановление
gunzip -c backup.sql.gz | psql -U postgres -d crm_school
```

---

Готово! Теперь вы можете безопасно переносить базу данных между устройствами! 🎉
