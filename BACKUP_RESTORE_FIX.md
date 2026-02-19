# 🔧 Решение проблемы "transaction_timeout" при восстановлении backup

## ❓ Проблема

При восстановлении backup появляется ошибка:

```
ERROR: unrecognized configuration parameter "transaction_timeout"
Command was: SET transaction_timeout = 0;
```

## ✅ Хорошая новость

**Эта ошибка НЕ критична!**

Если в конце вывода вы видите:
```
pg_restore: warning: errors ignored on restore: 1
```

Это означает, что восстановление **продолжилось и завершилось успешно** несмотря на ошибку.

## 🔍 Причина

Backup был создан на PostgreSQL 17+, которая поддерживает параметр `transaction_timeout`.
Восстановление происходит на PostgreSQL 15 или 16, которая не знает об этом параметре.

## 📊 Проверка успешности восстановления

### Вариант 1: Через psql

```bash
# Подключиться к базе
sudo -u postgres psql -d crm_school

# Проверить таблицы
\dt

# Проверить количество записей в таблицах
SELECT
    schemaname,
    tablename,
    n_live_tup as row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

# Проверить студентов
SELECT COUNT(*) FROM students;
SELECT * FROM students LIMIT 5;

# Проверить недельные репорты
SELECT COUNT(*) FROM weekly_reports;

# Выйти
\q
```

### Вариант 2: Через pgAdmin

1. Открыть pgAdmin
2. Подключиться к серверу
3. Раскрыть: Servers → CRM School → Databases → crm_school → Schemas → public → Tables
4. Проверить что все таблицы на месте
5. Кликнуть правой кнопкой на таблицу → View/Edit Data → First 100 Rows

## ✅ Если всё восстановлено корректно

Просто игнорируйте ошибку! Backup успешно восстановлен.

```bash
# Проверить логи backend
docker compose logs backend

# Если всё работает - отлично!
```

---

## 🛠️ Решения (если хотите избежать ошибки)

### Решение 1: Игнорировать ошибки при восстановлении (рекомендуется)

```bash
# Добавить флаг --no-owner при восстановлении
pg_restore -U postgres -d crm_school --no-owner backup.dump 2>&1 | grep -v "transaction_timeout"
```

### Решение 2: Отредактировать backup перед восстановлением

#### Для SQL backup (.sql файлов):

```bash
# Создать копию backup
cp backups/backup_20260219.sql backups/backup_20260219_fixed.sql

# Удалить строку с transaction_timeout
sed -i '/SET transaction_timeout/d' backups/backup_20260219_fixed.sql

# Или через nano
nano backups/backup_20260219_fixed.sql
# Найти и удалить строку: SET transaction_timeout = 0;

# Восстановить из исправленного backup
cat backups/backup_20260219_fixed.sql | psql -U postgres -d crm_school
```

#### Для сжатых backup (.sql.gz):

```bash
# Распаковать
gunzip backups/backup_20260219.sql.gz

# Удалить строку
sed -i '/SET transaction_timeout/d' backups/backup_20260219.sql

# Сжать обратно (опционально)
gzip backups/backup_20260219.sql

# Восстановить
cat backups/backup_20260219.sql | psql -U postgres -d crm_school
```

#### Для custom формата (.dump):

Custom формат нельзя легко редактировать, поэтому лучше использовать другие методы.

### Решение 3: Обновить PostgreSQL до версии 17+

```bash
# Узнать текущую версию
psql --version

# Если версия 15 или 16, обновить до 17
# (требует миграции - см. документацию PostgreSQL)
```

### Решение 4: Создавать backup без настроек сессии

При создании backup используйте флаги:

```bash
# Для SQL формата
pg_dump -U postgres crm_school --no-owner --no-privileges > backup.sql

# Для custom формата
pg_dump -U postgres -Fc crm_school --no-owner --no-privileges > backup.dump
```

---

## 🔄 Правильная процедура восстановления

### Полная процедура (избегает большинство проблем):

```bash
# 1. Остановить backend
docker compose stop backend

# 2. Создать backup текущей базы (на всякий случай)
docker compose exec postgres pg_dump -U postgres crm_school | gzip > backups/before_restore_$(date +%Y%m%d_%H%M%S).sql.gz

# 3. Пересоздать базу данных
docker compose exec postgres psql -U postgres << EOF
DROP DATABASE IF EXISTS crm_school;
CREATE DATABASE crm_school;
EOF

# 4. Восстановить из backup (игнорируя несущественные ошибки)
gunzip < backups/backup_20260219.sql.gz | docker compose exec -T postgres psql -U postgres -d crm_school 2>&1 | grep -v "transaction_timeout"

# ИЛИ для custom формата:
docker compose exec postgres pg_restore -U postgres -d crm_school --no-owner /backups/backup_20260219.dump 2>&1 | grep -v "transaction_timeout"

# 5. Проверить восстановление
docker compose exec postgres psql -U postgres -d crm_school -c "SELECT COUNT(*) FROM students;"

# 6. Запустить backend
docker compose start backend

# 7. Проверить логи
docker compose logs -f backend
```

---

## 🎯 Автоматизация (скрипт восстановления)

Создайте скрипт для автоматического восстановления:

```bash
# Создать файл
nano restore_backup.sh
```

```bash
#!/bin/bash

# Проверка аргументов
if [ $# -eq 0 ]; then
    echo "Usage: ./restore_backup.sh <backup_file>"
    echo "Example: ./restore_backup.sh backups/backup_20260219.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "🔄 Starting restore from: $BACKUP_FILE"

# Остановить backend
echo "⏸️  Stopping backend..."
docker compose stop backend

# Создать backup текущей базы
echo "💾 Creating safety backup..."
docker compose exec postgres pg_dump -U postgres crm_school | gzip > backups/safety_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Пересоздать базу
echo "🗑️  Dropping and recreating database..."
docker compose exec postgres psql -U postgres << EOF
DROP DATABASE IF EXISTS crm_school;
CREATE DATABASE crm_school;
EOF

# Восстановить из backup
echo "📥 Restoring from backup..."
if [[ $BACKUP_FILE == *.gz ]]; then
    # Сжатый файл
    gunzip < "$BACKUP_FILE" | docker compose exec -T postgres psql -U postgres -d crm_school 2>&1 | grep -vE "(transaction_timeout|^$)"
elif [[ $BACKUP_FILE == *.dump ]]; then
    # Custom формат
    docker compose exec postgres pg_restore -U postgres -d crm_school --no-owner "/backups/$(basename $BACKUP_FILE)" 2>&1 | grep -vE "(transaction_timeout|^$)"
else
    # Обычный SQL
    cat "$BACKUP_FILE" | docker compose exec -T postgres psql -U postgres -d crm_school 2>&1 | grep -vE "(transaction_timeout|^$)"
fi

# Проверить восстановление
echo "✅ Verifying restore..."
STUDENT_COUNT=$(docker compose exec postgres psql -U postgres -d crm_school -t -c "SELECT COUNT(*) FROM students;")
echo "   Students in database: $STUDENT_COUNT"

# Запустить backend
echo "▶️  Starting backend..."
docker compose start backend

# Подождать 5 секунд
sleep 5

# Проверить логи
echo "📋 Checking backend logs..."
docker compose logs --tail=20 backend

echo ""
echo "✅ Restore completed!"
echo "   Check logs above for any errors"
echo "   If everything looks good, the restore was successful!"
```

```bash
# Сделать исполняемым
chmod +x restore_backup.sh

# Использовать
./restore_backup.sh backups/backup_20260219.sql.gz
```

---

## 📝 Создание совместимых backup

Для создания backup, совместимых с разными версиями PostgreSQL:

```bash
# Вариант 1: Только данные и структура, без настроек
pg_dump -U postgres crm_school \
  --no-owner \
  --no-privileges \
  --format=custom \
  > backup_compatible.dump

# Вариант 2: SQL формат с явным исключением настроек
pg_dump -U postgres crm_school \
  --no-owner \
  --no-privileges \
  --column-inserts \
  > backup_compatible.sql

# Сжать
gzip backup_compatible.sql
```

---

## ⚠️ Важные замечания

1. **Ошибка `transaction_timeout` не критична** - данные восстанавливаются корректно
2. **Всегда создавайте safety backup** перед восстановлением
3. **Проверяйте данные после восстановления** через psql или pgAdmin
4. **Используйте флаги `--no-owner --no-privileges`** при создании backup для лучшей совместимости

---

## ✅ Чек-лист после восстановления

- [ ] Таблицы созданы (проверить через `\dt` в psql)
- [ ] Данные восстановлены (проверить COUNT(*) в основных таблицах)
- [ ] Constraints созданы (проверить foreign keys)
- [ ] Backend запущен без ошибок
- [ ] Можно залогиниться в приложение
- [ ] Данные отображаются корректно

---

## 🆘 Если что-то пошло не так

### Откатиться к safety backup:

```bash
# Использовать safety backup, созданный перед восстановлением
./restore_backup.sh backups/safety_backup_20260219_143000.sql.gz
```

### Запросить помощь:

1. Сохраните полный вывод команды восстановления
2. Проверьте логи: `docker compose logs postgres`
3. Проверьте таблицы: `psql -U postgres -d crm_school -c "\dt"`

---

## 🎉 Резюме

**Проблема:** Параметр `transaction_timeout` не поддерживается в PostgreSQL 15/16

**Решение:** Игнорировать - восстановление проходит успешно несмотря на ошибку

**Проверка:**
```bash
psql -U postgres -d crm_school -c "SELECT COUNT(*) FROM students;"
```

**Если данные на месте - всё в порядке!** ✅

---

**Ваш backup успешно восстановлен!** 🎊
