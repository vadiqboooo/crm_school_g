#!/bin/bash

echo "🚀 Инициализация Git репозитория для CRM School..."
echo ""

# Инициализация Git
echo "📦 Инициализация Git..."
git init

# Убедимся что .gitignore на месте
if [ ! -f ".gitignore" ]; then
    echo "❌ Ошибка: файл .gitignore не найден!"
    exit 1
fi

echo "✅ .gitignore найден"

# Проверяем что node_modules в gitignore
if grep -q "node_modules/" ".gitignore"; then
    echo "✅ node_modules уже в .gitignore"
else
    echo "⚠️  Добавляем node_modules в .gitignore..."
    echo "node_modules/" >> .gitignore
fi

# Проверяем что .env в gitignore
if grep -q ".env" ".gitignore"; then
    echo "✅ .env уже в .gitignore"
else
    echo "⚠️  Добавляем .env в .gitignore..."
    echo ".env" >> .gitignore
fi

# Добавляем все файлы (node_modules автоматически исключится)
echo ""
echo "📁 Добавление файлов в Git..."
git add .

# Проверяем что node_modules НЕ добавлен
echo ""
echo "🔍 Проверка файлов для коммита..."

if git ls-files | grep -q "node_modules"; then
    echo "❌ ВНИМАНИЕ: node_modules все еще в Git!"
    echo "Удаляем из индекса..."
    git rm -r --cached client_crm/node_modules 2>/dev/null || true
    git rm -r --cached node_modules 2>/dev/null || true
else
    echo "✅ node_modules не попадет в коммит"
fi

# Проверяем что .env НЕ добавлен
if git ls-files | grep -q "\.env$"; then
    echo "⚠️  ВНИМАНИЕ: .env файл обнаружен в Git!"
    echo "Удаляем из индекса..."
    git rm -r --cached server/.env 2>/dev/null || true
    git rm -r --cached .env 2>/dev/null || true
    echo "✅ .env удален из индекса"
else
    echo "✅ .env не попадет в коммит"
fi

# Показываем статистику
echo ""
echo "📊 Статистика файлов:"
echo "Всего файлов для коммита: $(git diff --cached --name-only | wc -l)"
echo ""

# Создаем коммит
echo "💾 Создание первого коммита..."
git commit -m "Initial commit: CRM School project

✨ Features:
- Backend: FastAPI + PostgreSQL
- Frontend: React + TypeScript + Tailwind
- Auth: JWT authentication with bcrypt
- CRUD: Students, Groups, Employees, Settings
- UI: Modern responsive design with shadcn/ui

📚 Documentation:
- DEPLOYMENT.md - detailed deployment guide
- QUICKSTART.md - quick start cheat sheet
- README.md - project overview
- GIT_SETUP.md - git workflow guide

🔐 Security:
- Environment variables properly configured
- Passwords hashed with bcrypt
- Protected routes on client and server

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

echo ""
echo "✅ Git репозиторий успешно инициализирован!"
echo ""
echo "📝 Следующие шаги:"
echo "1. Создайте репозиторий на GitHub/GitLab"
echo "2. Подключите удаленный репозиторий:"
echo "   git remote add origin <URL>"
echo "3. Отправьте код:"
echo "   git push -u origin main"
echo ""
echo "📖 Подробнее: см. GIT_SETUP.md"
