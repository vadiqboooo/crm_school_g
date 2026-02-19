# 🐘 PostgreSQL - Полное руководство

## 📋 Содержание

1. [Установка PostgreSQL](#установка-postgresql)
2. [Создание базы данных](#создание-базы-данных)
3. [Создание таблиц](#создание-таблиц)
4. [Резервное копирование](#резервное-копирование)
5. [Восстановление из backup](#восстановление-из-backup)
6. [Управление пользователями](#управление-пользователями)
7. [Полезные команды](#полезные-команды)

---

## 🔧 Установка PostgreSQL

### Вариант 1: Через Docker (Рекомендуется)

PostgreSQL уже настроен в `docker-compose.yml`. Просто запустите:

```bash
docker compose up -d postgres
```

### Вариант 2: Нативная установка на Ubuntu

```bash
# Обновить пакеты
sudo apt update

# Установить PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-contrib-15

# Проверить статус
sudo systemctl status postgresql

# Запустить при загрузке
sudo systemctl enable postgresql

# Проверить версию
psql --version
```

### Первичная настройка

```bash
# Переключиться на пользователя postgres
sudo -i -u postgres

# Войти в PostgreSQL
psql

# Установить пароль для пользователя postgres
ALTER USER postgres WITH PASSWORD 'Cvdfer34';

# Выйти
\q
exit
```

---

## 🗄️ Создание базы данных

### Через Docker

```bash
# Войти в контейнер PostgreSQL
docker compose exec postgres psql -U postgres

# Создать базу данных
CREATE DATABASE crm_school;

# Проверить создание
\l

# Подключиться к базе
\c crm_school

# Выйти
\q
```

### Через нативную установку

```bash
# Войти в PostgreSQL
sudo -u postgres psql

# Создать базу данных
CREATE DATABASE crm_school;

# Создать пользователя (если нужен отдельный)
CREATE USER crm_user WITH PASSWORD 'secure_password';

# Дать права на базу данных
GRANT ALL PRIVILEGES ON DATABASE crm_school TO crm_user;

# Выйти
\q
```

### Настройка кодировки

```sql
-- Создать базу с определенной кодировкой
CREATE DATABASE crm_school
    WITH
    ENCODING = 'UTF8'
    LC_COLLATE = 'ru_RU.UTF-8'
    LC_CTYPE = 'ru_RU.UTF-8'
    TEMPLATE = template0;
```

---

## 📊 Создание таблиц

### Автоматически через Alembic (Рекомендуется)

Таблицы создаются автоматически через миграции Alembic при запуске backend:

```bash
# Войти в backend контейнер
docker compose exec backend bash

# Применить все миграции
alembic upgrade head

# Посмотреть текущую версию
alembic current

# Посмотреть историю миграций
alembic history

# Выйти
exit
```

### Проверка созданных таблиц

```bash
# Войти в PostgreSQL
docker compose exec postgres psql -U postgres -d crm_school

# Посмотреть список таблиц
\dt

# Посмотреть структуру таблицы
\d students

# Посмотреть все таблицы с описаниями
\dt+

# Выйти
\q
```

**Список основных таблиц:**

```
students              - Студенты
parent_contacts       - Контакты родителей
student_history       - История событий студента
groups                - Группы
group_students        - Связь студентов и групп
subjects              - Предметы
lessons               - Уроки
lesson_attendances    - Посещаемость уроков
exams                 - Экзамены
exam_results          - Результаты экзаменов
employees             - Сотрудники
payments              - Платежи
employee_salaries     - Зарплаты сотрудников
daily_reports         - Ежедневные отчеты
weekly_reports        - Недельные репорты
tasks                 - Задачи
school_locations      - Местоположения школ
schedules             - Расписание
settings              - Настройки
alembic_version       - Версия миграций
```

### Ручное создание таблицы (пример)

```sql
-- Войти в базу
docker compose exec postgres psql -U postgres -d crm_school

-- Создать таблицу (пример)
CREATE TABLE IF NOT EXISTS test_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Вставить данные
INSERT INTO test_table (name, email) VALUES ('Test User', 'test@example.com');

-- Проверить данные
SELECT * FROM test_table;

-- Удалить таблицу
DROP TABLE IF EXISTS test_table;
```

---

## 💾 Резервное копирование

### Полный backup базы данных

#### Простой backup (SQL)

```bash
# Создать backup
docker compose exec postgres pg_dump -U postgres crm_school > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Проверить backup
ls -lh backups/

# Посмотреть содержимое
head -n 20 backups/backup_20260219_143000.sql
```

#### Backup с сжатием (gzip)

```bash
# Создать сжатый backup
docker compose exec postgres pg_dump -U postgres crm_school | gzip > backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Проверить размер
ls -lh backups/

# Сжатие может уменьшить размер в 10-20 раз!
```

#### Backup в custom формате (рекомендуется)

```bash
# Custom формат (сжатый, быстрее восстанавливается)
docker compose exec postgres pg_dump -U postgres -Fc crm_school > backups/backup_$(date +%Y%m%d_%H%M%S).dump

# Преимущества custom формата:
# - Автоматически сжимается
# - Быстрое восстановление
# - Можно восстанавливать выборочно
# - Поддержка параллельного восстановления
```

### Backup отдельных таблиц

```bash
# Backup одной таблицы
docker compose exec postgres pg_dump -U postgres -t students crm_school > backups/students_$(date +%Y%m%d_%H%M%S).sql

# Backup нескольких таблиц
docker compose exec postgres pg_dump -U postgres -t students -t parent_contacts -t groups crm_school > backups/partial_$(date +%Y%m%d_%H%M%S).sql
```

### Backup только схемы (без данных)

```bash
# Только структура таблиц
docker compose exec postgres pg_dump -U postgres --schema-only crm_school > backups/schema_$(date +%Y%m%d_%H%M%S).sql
```

### Backup только данных (без схемы)

```bash
# Только данные
docker compose exec postgres pg_dump -U postgres --data-only crm_school > backups/data_$(date +%Y%m%d_%H%M%S).sql
```

---

## 🔄 Восстановление из backup

### ⚠️ ВАЖНО: Перед восстановлением

```bash
# 1. Остановить backend (чтобы не было активных подключений)
docker compose stop backend

# 2. Создать backup текущей базы (на всякий случай!)
docker compose exec postgres pg_dump -U postgres crm_school | gzip > backups/before_restore_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Восстановление из SQL backup

#### Метод 1: Полная перезапись базы

```bash
# Пересоздать базу данных
docker compose exec postgres psql -U postgres << EOF
DROP DATABASE IF EXISTS crm_school;
CREATE DATABASE crm_school;
EOF

# Восстановить данные
cat backups/backup_20260219_143000.sql | docker compose exec -T postgres psql -U postgres -d crm_school

# Запустить backend
docker compose start backend
```

#### Метод 2: Через psql

```bash
# Войти в контейнер
docker compose exec postgres bash

# Восстановить
psql -U postgres -d crm_school < /backups/backup_20260219_143000.sql

# Выйти
exit

# Запустить backend
docker compose start backend
```

### Восстановление из сжатого backup

```bash
# Пересоздать базу
docker compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS crm_school;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE crm_school;"

# Восстановить из .gz архива
gunzip < backups/backup_20260219_143000.sql.gz | docker compose exec -T postgres psql -U postgres -d crm_school

# Запустить backend
docker compose start backend
```

### Восстановление из custom формата

```bash
# Пересоздать базу
docker compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS crm_school;"
docker compose exec postgres psql -U postgres -c "CREATE DATABASE crm_school;"

# Восстановить через pg_restore
docker compose exec postgres pg_restore -U postgres -d crm_school /backups/backup_20260219_143000.dump

# Запустить backend
docker compose start backend
```

### Восстановление отдельных таблиц

```bash
# Восстановить только одну таблицу
cat backups/students_20260219_143000.sql | docker compose exec -T postgres psql -U postgres -d crm_school

# Из custom формата
docker compose exec postgres pg_restore -U postgres -d crm_school -t students /backups/backup_20260219_143000.dump
```

### Проверка после восстановления

```bash
# Войти в базу
docker compose exec postgres psql -U postgres -d crm_school

# Проверить таблицы
\dt

# Проверить количество записей
SELECT 'students' as table_name, COUNT(*) FROM students
UNION ALL
SELECT 'groups', COUNT(*) FROM groups
UNION ALL
SELECT 'lessons', COUNT(*) FROM lessons;

# Проверить последние записи
SELECT * FROM students ORDER BY created_at DESC LIMIT 5;

# Выйти
\q

# Запустить backend и проверить логи
docker compose start backend
docker compose logs -f backend
```

---

## 👥 Управление пользователями

### Создание нового пользователя

```bash
# Войти в PostgreSQL
docker compose exec postgres psql -U postgres

# Создать пользователя
CREATE USER readonly_user WITH PASSWORD 'secure_password';

# Дать права на чтение
GRANT CONNECT ON DATABASE crm_school TO readonly_user;
GRANT USAGE ON SCHEMA public TO readonly_user;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

# Права на будущие таблицы
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO readonly_user;
```

### Создание администратора приложения

```bash
# Войти в backend контейнер
docker compose exec backend python

# В Python консоли:
```

```python
from app.database import AsyncSessionLocal
from app.models.employee import Employee
from app.auth.password import get_password_hash
import asyncio
import uuid

async def create_admin():
    async with AsyncSessionLocal() as db:
        # Проверить, существует ли уже админ
        from sqlalchemy import select
        result = await db.execute(
            select(Employee).where(Employee.email == "admin@crm-school.com")
        )
        existing = result.scalar_one_or_none()

        if existing:
            print("Admin already exists!")
            return

        # Создать нового админа
        admin = Employee(
            id=uuid.uuid4(),
            email="admin@crm-school.com",
            hashed_password=get_password_hash("admin123"),
            first_name="Администратор",
            last_name="Главный",
            phone="+7 900 123-45-67",
            role="admin",
            is_active=True
        )
        db.add(admin)
        await db.commit()
        print(f"Admin created successfully!")
        print(f"Email: admin@crm-school.com")
        print(f"Password: admin123")
        print("CHANGE PASSWORD AFTER FIRST LOGIN!")

asyncio.run(create_admin())
exit()
```

### Изменение пароля пользователя

```sql
-- Изменить пароль PostgreSQL пользователя
ALTER USER postgres WITH PASSWORD 'new_secure_password';

-- Посмотреть всех пользователей
\du

-- Удалить пользователя
DROP USER IF EXISTS readonly_user;
```

---

## 🔍 Полезные команды

### Основные psql команды

```bash
# Войти в PostgreSQL
docker compose exec postgres psql -U postgres -d crm_school

# Команды внутри psql:

\l                          # Список всех баз данных
\c crm_school               # Подключиться к базе
\dt                         # Список таблиц
\dt+                        # Список таблиц с размерами
\d students                 # Структура таблицы students
\du                         # Список пользователей
\dn                         # Список схем
\df                         # Список функций
\dv                         # Список представлений (views)
\x                          # Включить расширенный вывод
\timing                     # Показывать время выполнения
\?                          # Справка по командам
\h SELECT                   # Справка по SQL команде
\q                          # Выйти
```

### SQL запросы для мониторинга

```sql
-- Размер базы данных
SELECT pg_size_pretty(pg_database_size('crm_school'));

-- Размер всех таблиц
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Количество записей в таблицах
SELECT
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- Активные подключения
SELECT
    datname,
    count(*) as connections
FROM pg_stat_activity
GROUP BY datname
ORDER BY connections DESC;

-- Текущие запросы
SELECT
    pid,
    usename,
    application_name,
    client_addr,
    state,
    query
FROM pg_stat_activity
WHERE state != 'idle';

-- Заблокированные запросы
SELECT
    pid,
    usename,
    pg_blocking_pids(pid) as blocked_by,
    query
FROM pg_stat_activity
WHERE cardinality(pg_blocking_pids(pid)) > 0;

-- Убить долгий запрос
SELECT pg_cancel_backend(pid);  -- Мягко
SELECT pg_terminate_backend(pid);  -- Жестко
```

### Проверка целостности данных

```sql
-- Проверить внешние ключи
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Проверить индексы
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Найти дубликаты (пример для email)
SELECT email, COUNT(*)
FROM employees
GROUP BY email
HAVING COUNT(*) > 1;
```

### Оптимизация и обслуживание

```sql
-- Анализ таблицы (обновление статистики)
ANALYZE students;

-- Очистка и анализ
VACUUM ANALYZE students;

-- Полная очистка (освобождает место на диске)
VACUUM FULL students;

-- Пересобрать индексы
REINDEX TABLE students;

-- Пересобрать все индексы в базе
REINDEX DATABASE crm_school;
```

---

## 📊 Мониторинг производительности

### Проверка производительности

```bash
# Статистика использования индексов
docker compose exec postgres psql -U postgres -d crm_school -c "
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
"

# Самые медленные запросы (требует pg_stat_statements)
docker compose exec postgres psql -U postgres -d crm_school -c "
SELECT
    calls,
    total_time,
    mean_time,
    query
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"

# Кэш-память
docker compose exec postgres psql -U postgres -d crm_school -c "
SELECT
    heap_blks_read as disk_reads,
    heap_blks_hit as cache_hits,
    heap_blks_hit::float / (heap_blks_hit + heap_blks_read) as cache_hit_ratio
FROM pg_statio_user_tables;
"
```

---

## 🆘 Troubleshooting

### База данных не запускается

```bash
# Проверить логи
docker compose logs postgres

# Проверить права на volume
ls -la postgres_data/

# Проверить конфигурацию
docker compose config postgres
```

### Ошибка подключения

```bash
# Проверить, что контейнер запущен
docker compose ps postgres

# Проверить, что порт открыт
docker compose exec postgres pg_isready -U postgres

# Проверить подключение
docker compose exec postgres psql -U postgres -c "SELECT 1;"
```

### База данных повреждена

```bash
# Проверить целостность
docker compose exec postgres pg_checksums --check

# Восстановить из backup
# См. раздел "Восстановление из backup"
```

### Недостаточно места на диске

```bash
# Проверить размер базы
docker compose exec postgres psql -U postgres -d crm_school -c "SELECT pg_size_pretty(pg_database_size('crm_school'));"

# Очистить старые данные
docker compose exec postgres psql -U postgres -d crm_school -c "VACUUM FULL;"

# Удалить старые backup
find backups/ -name "backup_*.sql.gz" -mtime +30 -delete
```

---

## ✅ Чек-лист проверки

После работы с PostgreSQL проверьте:

- ✅ База данных создана и доступна
- ✅ Таблицы созданы через миграции Alembic
- ✅ Backup создается регулярно
- ✅ Восстановление из backup работает
- ✅ Первый администратор создан
- ✅ Логи не содержат ошибок
- ✅ Размер базы данных в норме
- ✅ Индексы работают эффективно

---

**PostgreSQL настроен и готов к работе!** 🎉
