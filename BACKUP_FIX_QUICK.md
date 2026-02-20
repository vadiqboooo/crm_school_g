# ⚡ Быстрое решение ошибки "transaction_timeout"

## ✅ Хорошая новость

**Эта ошибка НЕ критична!** Ваш backup успешно восстановлен.

```
ERROR: unrecognized configuration parameter "transaction_timeout"
```

Это просто предупреждение о несовместимости версий PostgreSQL.

---

## 🔍 Проверьте что всё работает

```bash
# Проверить таблицы
sudo -u postgres psql -d crm_school -c "\dt"

# Проверить студентов
sudo -u postgres psql -d crm_school -c "SELECT COUNT(*) FROM students;"

# Проверить репорты
sudo -u postgres psql -d crm_school -c "SELECT COUNT(*) FROM weekly_reports;"

# Если видите данные - всё отлично! ✅
```

---

## 🛠️ Если хотите избежать ошибки

### Вариант 1: Игнорировать при восстановлении

```bash
# Просто добавьте фильтр
gunzip < backup.sql.gz | psql -U postgres -d crm_school 2>&1 | grep -v "transaction_timeout"
```

### Вариант 2: Удалить из backup

```bash
# Для .sql файлов
sed -i '/SET transaction_timeout/d' backup.sql

# Восстановить
cat backup.sql | psql -U postgres -d crm_school
```

---

## 📝 Для будущих backup

Создавайте совместимые backup:

```bash
pg_dump -U postgres crm_school --no-owner --no-privileges | gzip > backup.sql.gz
```

---

## ✅ Итог

Если вы видите в конце:
```
pg_restore: warning: errors ignored on restore: 1
```

И все таблицы создались - **всё хорошо!** Можно работать.

---

📚 Полная документация: `BACKUP_RESTORE_FIX.md`
