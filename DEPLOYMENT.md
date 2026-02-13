# Инструкция по переносу CRM системы на другое устройство

## Требования к системе

### Обязательное ПО:
- **Python** 3.12 или выше
- **Node.js** 18 или выше
- **PostgreSQL** 14 или выше
- **Git** (для клонирования репозитория)

---

## Шаг 1. Подготовка нового устройства

### Windows:
1. Установите Python с [python.org](https://www.python.org/downloads/)
   - ✅ При установке отметьте "Add Python to PATH"
2. Установите Node.js с [nodejs.org](https://nodejs.org/)
3. Установите PostgreSQL с [postgresql.org](https://www.postgresql.org/download/)

### Linux/MacOS:
```bash
# Python
sudo apt install python3.12 python3-pip  # Ubuntu/Debian
brew install python@3.12                  # MacOS

# Node.js
sudo apt install nodejs npm              # Ubuntu/Debian
brew install node                        # MacOS

# PostgreSQL
sudo apt install postgresql postgresql-contrib  # Ubuntu/Debian
brew install postgresql                         # MacOS
```

---

## Шаг 2. Копирование проекта

### Вариант A: Через Git (рекомендуется)
```bash
# Если проект на GitHub/GitLab
git clone <URL_репозитория>
cd crm_school_g
```

### Вариант Б: Копирование файлов
1. Скопируйте всю папку `crm_school_g` на новое устройство
2. Можно использовать USB, облако (Google Drive, Dropbox) или сеть

---

## Шаг 3. Настройка базы данных PostgreSQL

### 3.1. Запустите PostgreSQL
```bash
# Linux
sudo systemctl start postgresql
sudo systemctl enable postgresql

# MacOS
brew services start postgresql

# Windows
# PostgreSQL запускается автоматически как служба
```

### 3.2. Создайте базу данных и пользователя
```bash
# Подключитесь к PostgreSQL
sudo -u postgres psql     # Linux/MacOS
psql -U postgres          # Windows

# В консоли PostgreSQL выполните:
CREATE DATABASE crm_school;
CREATE USER crm_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE crm_school TO crm_user;
\q
```

---

## Шаг 4. Настройка серверной части (Backend)

### 4.1. Перейдите в папку сервера
```bash
cd server
```

### 4.2. Создайте виртуальное окружение Python
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/MacOS
python3 -m venv venv
source venv/bin/activate
```

### 4.3. Установите зависимости
```bash
pip install -r requirements.txt
```

### 4.4. Настройте переменные окружения

Создайте файл `.env` в папке `server/`:
```env
# Database
DATABASE_URL=postgresql+asyncpg://crm_user:your_secure_password@localhost:5432/crm_school

# Security
SECRET_KEY=your_very_long_secret_key_here_min_32_characters
ALGORITHM=HS256

# Tokens
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
```

**Важно:** Замените `your_secure_password` и `SECRET_KEY` на свои значения!

Для генерации SECRET_KEY:
```bash
# Python
python -c "import secrets; print(secrets.token_urlsafe(32))"

# или
openssl rand -base64 32
```

### 4.5. Примените миграции базы данных
```bash
alembic upgrade head
```

### 4.6. Создайте первого пользователя (admin)

Запустите Python консоль:
```bash
python
```

В консоли выполните:
```python
import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.employee import Employee, EmployeeRole
from app.auth.security import hash_password

# Настройки БД (используйте ваш DATABASE_URL)
DATABASE_URL = "postgresql+asyncpg://crm_user:your_secure_password@localhost:5432/crm_school"

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
        print("Admin created successfully!")

asyncio.run(create_admin())
exit()
```

---

## Шаг 5. Настройка клиентской части (Frontend)

### 5.1. Перейдите в папку клиента
```bash
cd ../client_crm
```

### 5.2. Установите зависимости
```bash
npm install
```

### 5.3. Настройте API URL (если нужно)

Если сервер будет на другом хосте, измените `API_URL` в файле:
`client_crm/src/app/lib/api.ts`

```typescript
const API_URL = "http://localhost:8000";  // Измените на нужный URL
```

---

## Шаг 6. Запуск приложения

### 6.1. Запустите сервер (Backend)

Откройте новый терминал:
```bash
cd server

# Активируйте виртуальное окружение
# Windows:
venv\Scripts\activate
# Linux/MacOS:
source venv/bin/activate

# Запустите сервер
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Сервер запустится на: `http://localhost:8000`

### 6.2. Запустите клиент (Frontend)

Откройте второй терминал:
```bash
cd client_crm
npm run dev
```

Клиент запустится на: `http://localhost:5173`

---

## Шаг 7. Вход в систему

1. Откройте браузер: `http://localhost:5173`
2. Введите данные для входа:
   - **Логин:** `admin`
   - **Пароль:** `admin`

---

## Решение типичных проблем

### Ошибка подключения к базе данных
```
SQLALCHEMY_DATABASE_URI is incorrect
```
**Решение:**
- Проверьте DATABASE_URL в файле `.env`
- Убедитесь, что PostgreSQL запущен
- Проверьте пароль и имя базы данных

### Ошибка миграций
```
alembic: command not found
```
**Решение:**
```bash
pip install alembic
```

### Ошибка импорта модулей Python
```
ModuleNotFoundError: No module named 'fastapi'
```
**Решение:**
```bash
# Убедитесь, что виртуальное окружение активировано
pip install -r requirements.txt
```

### Порт уже занят
```
Address already in use
```
**Решение:**
```bash
# Измените порт при запуске
uvicorn app.main:app --reload --port 8001

# Или найдите и остановите процесс:
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/MacOS:
lsof -i :8000
kill -9 <PID>
```

---

## Резервное копирование данных

### Экспорт базы данных
```bash
pg_dump -U crm_user crm_school > backup.sql
```

### Импорт базы данных
```bash
psql -U crm_user crm_school < backup.sql
```

---

## Производственное развертывание (Production)

Для production окружения рекомендуется:

1. **Использовать HTTPS**
2. **Настроить Nginx/Apache** как reverse proxy
3. **Использовать systemd/supervisor** для автозапуска
4. **Настроить резервное копирование БД**
5. **Использовать сильные пароли**
6. **Отключить режим разработки** (`--reload`)

### Пример запуска в production:
```bash
# Backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Frontend (собрать для production)
npm run build
# Затем настроить веб-сервер для раздачи статики из dist/
```

---

## Контрольный список переноса

- [ ] Установлен Python 3.12+
- [ ] Установлен Node.js 18+
- [ ] Установлен PostgreSQL 14+
- [ ] Скопированы файлы проекта
- [ ] Создана база данных PostgreSQL
- [ ] Создан файл `.env` с правильными настройками
- [ ] Установлены Python зависимости
- [ ] Установлены Node.js зависимости
- [ ] Применены миграции БД
- [ ] Создан admin пользователь
- [ ] Запущен сервер
- [ ] Запущен клиент
- [ ] Успешный вход в систему

---

## Полезные команды

```bash
# Проверка версий
python --version
node --version
psql --version

# Просмотр логов сервера
# В терминале где запущен uvicorn

# Просмотр таблиц в БД
psql -U crm_user -d crm_school -c "\dt"

# Очистка кэша Python
find . -type d -name __pycache__ -exec rm -r {} +

# Обновление зависимостей
pip install --upgrade -r requirements.txt
npm update
```

---

## Поддержка

При возникновении проблем:
1. Проверьте логи сервера и клиента
2. Убедитесь, что все зависимости установлены
3. Проверьте настройки `.env`
4. Убедитесь, что PostgreSQL запущен
