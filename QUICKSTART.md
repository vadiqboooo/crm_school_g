# Быстрый старт - Шпаргалка

## Перенос на новое устройство - кратко

### 1️⃣ Установите ПО
```bash
# Установите:
- Python 3.12+
- Node.js 18+
- PostgreSQL 14+
```

### 2️⃣ Скопируйте проект
Перенесите папку `crm_school_g` на новое устройство

### 3️⃣ Создайте базу данных
```bash
# Откройте PostgreSQL консоль
psql -U postgres

# Создайте БД и пользователя
CREATE DATABASE crm_school;
CREATE USER crm_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE crm_school TO crm_user;
\q
```

### 4️⃣ Настройте сервер
```bash
cd server

# Создайте .env файл
cp .env.example .env
# Отредактируйте .env - укажите пароль БД и SECRET_KEY

# Создайте виртуальное окружение
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac

# Установите зависимости
pip install -r requirements.txt

# Примените миграции
alembic upgrade head
```

### 5️⃣ Создайте admin
```bash
python
```
```python
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.employee import Employee, EmployeeRole
from app.auth.security import hash_password

DATABASE_URL = "postgresql+asyncpg://crm_user:your_password@localhost:5432/crm_school"

async def create_admin():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        admin = Employee(
            email="admin@crm-school.com",
            hashed_password=hash_password("admin"),
            first_name="Admin",
            last_name="User",
            role=EmployeeRole.admin,
            is_active=True
        )
        session.add(admin)
        await session.commit()
        print("✅ Admin created!")

asyncio.run(create_admin())
exit()
```

### 6️⃣ Настройте клиент
```bash
cd ../client_crm
npm install
```

### 7️⃣ Запустите приложение

**Терминал 1 - Сервер:**
```bash
cd server
venv\Scripts\activate          # Windows
source venv/bin/activate       # Linux/Mac
uvicorn app.main:app --reload
```

**Терминал 2 - Клиент:**
```bash
cd client_crm
npm run dev
```

### 8️⃣ Войдите в систему
- Откройте: http://localhost:5173
- Логин: `admin`
- Пароль: `admin`

---

## Полезные команды

### Остановить процессы
```bash
# Ctrl+C в терминале

# Или найти и убить процесс:
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :8000
kill -9 <PID>
```

### Резервная копия БД
```bash
# Экспорт
pg_dump -U crm_user crm_school > backup.sql

# Импорт
psql -U crm_user crm_school < backup.sql
```

### Обновить зависимости
```bash
# Python
pip install --upgrade -r requirements.txt

# Node.js
npm update
```

### Сбросить БД (осторожно!)
```bash
# В PostgreSQL консоли
DROP DATABASE crm_school;
CREATE DATABASE crm_school;
GRANT ALL PRIVILEGES ON DATABASE crm_school TO crm_user;

# Затем примените миграции заново
cd server
alembic upgrade head
```

---

## Решение проблем

### ❌ Ошибка подключения к БД
→ Проверьте DATABASE_URL в .env
→ Убедитесь что PostgreSQL запущен

### ❌ Порт занят
→ Измените порт: `uvicorn app.main:app --reload --port 8001`

### ❌ Модуль не найден
→ Активируйте venv: `venv\Scripts\activate`
→ Установите зависимости: `pip install -r requirements.txt`

### ❌ npm ошибки
→ Удалите node_modules: `rm -rf node_modules`
→ Переустановите: `npm install`

---

## 📚 Подробная документация

Полная инструкция: [DEPLOYMENT.md](DEPLOYMENT.md)
