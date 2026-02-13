@echo off
chcp 65001 > nul
echo.
echo 🚀 Инициализация Git репозитория для CRM School...
echo.

REM Инициализация Git
echo 📦 Инициализация Git...
git init

REM Проверка .gitignore
if not exist ".gitignore" (
    echo ❌ Ошибка: файл .gitignore не найден!
    pause
    exit /b 1
)

echo ✅ .gitignore найден

REM Добавляем все файлы
echo.
echo 📁 Добавление файлов в Git...
git add .

REM Удаляем node_modules если попал
echo.
echo 🔍 Удаление node_modules из индекса...
git rm -r --cached client_crm\node_modules 2>nul
git rm -r --cached node_modules 2>nul

REM Удаляем .env если попал
echo 🔍 Удаление .env файлов из индекса...
git rm --cached server\.env 2>nul
git rm --cached .env 2>nul

echo ✅ Ненужные файлы удалены из индекса

REM Пересоздаем индекс
echo.
echo 📁 Пересоздание индекса...
git add .

REM Показываем статус
echo.
echo 📊 Проверка файлов для коммита...
git status --short

REM Создаем коммит
echo.
echo 💾 Создание первого коммита...
git commit -m "Initial commit: CRM School project" -m "" -m "Features:" -m "- Backend: FastAPI + PostgreSQL" -m "- Frontend: React + TypeScript + Tailwind" -m "- Auth: JWT authentication with bcrypt" -m "- CRUD: Students, Groups, Employees, Settings" -m "- UI: Modern responsive design with shadcn/ui" -m "" -m "Documentation:" -m "- DEPLOYMENT.md - detailed deployment guide" -m "- QUICKSTART.md - quick start cheat sheet" -m "- README.md - project overview" -m "- GIT_SETUP.md - git workflow guide" -m "" -m "Security:" -m "- Environment variables properly configured" -m "- Passwords hashed with bcrypt" -m "- Protected routes on client and server" -m "" -m "Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo.
echo ✅ Git репозиторий успешно инициализирован!
echo.
echo 📝 Следующие шаги:
echo 1. Создайте репозиторий на GitHub/GitLab
echo 2. Подключите удаленный репозиторий:
echo    git remote add origin ^<URL^>
echo 3. Отправьте код:
echo    git branch -M main
echo    git push -u origin main
echo.
echo 📖 Подробнее: см. GIT_SETUP.md
echo.
pause
