# ⚡ Быстрое подключение pgAdmin к PostgreSQL

## 🔐 Шаг 1: Установить пароль (на сервере Ubuntu)

```bash
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'ваш_пароль';
\q
```

## 🌐 Шаг 2: Разрешить удаленное подключение (если pgAdmin на другом ПК)

```bash
# Редактировать postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf

# Найти и изменить:
listen_addresses = '*'

# Редактировать pg_hba.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Добавить в конец:
host    all    all    0.0.0.0/0    md5

# Перезапустить
sudo systemctl restart postgresql

# Открыть порт
sudo ufw allow 5432/tcp
```

## 💻 Шаг 3: Настроить pgAdmin

### Открыть pgAdmin → Правый клик на "Servers" → Register → Server

**Вкладка General:**
```
Name: CRM School
```

**Вкладка Connection:**

Для **локального** подключения:
```
Host: localhost
Port: 5432
Database: crm_school
Username: postgres
Password: ваш_пароль
☑ Save password
```

Для **удаленного** подключения:
```
Host: IP_сервера или crm.garryschool.ru
Port: 5432
Database: crm_school
Username: postgres
Password: ваш_пароль
☑ Save password
```

Для **Docker** контейнера:
```
Host: localhost (или IP сервера)
Port: 5432
Database: crm_school
Username: postgres
Password: (из .env файла)
☑ Save password
```

### Нажать Save → Готово! ✅

---

## 🔍 Проверка

```bash
# На сервере проверить что PostgreSQL слушает
sudo netstat -plnt | grep 5432

# Должно быть:
tcp  0.0.0.0:5432  LISTEN
```

---

## 🆘 Не работает?

**1. Проверить пароль:**
```bash
psql -U postgres -d crm_school
# Если не работает, сбросить пароль (см. Шаг 1)
```

**2. Проверить firewall:**
```bash
sudo ufw status
# Должен быть: 5432/tcp ALLOW
```

**3. Проверить pg_hba.conf:**
```bash
sudo tail /etc/postgresql/15/main/pg_hba.conf
# Должна быть строка: host all all 0.0.0.0/0 md5
```

**4. Перезапустить:**
```bash
sudo systemctl restart postgresql
```

---

## 📚 Полная документация

См. `PGADMIN_CONNECTION.md` для подробной инструкции со всеми деталями.

---

**Готово! Теперь можно работать с базой через pgAdmin!** 🎉
