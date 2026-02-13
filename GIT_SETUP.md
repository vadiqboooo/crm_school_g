# Настройка Git репозитория

## Инициализация локального репозитория

```bash
# Перейдите в корневую папку проекта
cd crm_school_g

# Инициализируйте Git
git init

# Добавьте все файлы (gitignore уже настроен)
git add .

# Создайте первый коммит
git commit -m "Initial commit: CRM School project"
```

## Подключение к удаленному репозиторию

### GitHub

```bash
# Создайте репозиторий на GitHub, затем:
git remote add origin https://github.com/ваш-username/crm-school.git
git branch -M main
git push -u origin main
```

### GitLab

```bash
# Создайте репозиторий на GitLab, затем:
git remote add origin https://gitlab.com/ваш-username/crm-school.git
git branch -M main
git push -u origin main
```

### Bitbucket

```bash
# Создайте репозиторий на Bitbucket, затем:
git remote add origin https://bitbucket.org/ваш-username/crm-school.git
git branch -M main
git push -u origin main
```

## Важно перед первым коммитом!

### 1. Убедитесь, что .env файл в gitignore
```bash
# Проверьте, что .env НЕ добавлен в Git
git status

# Если .env показывается, удалите его из Git:
git rm --cached server/.env
```

### 2. Проверьте, что секретные файлы не добавлены
```bash
# Файлы которые НЕ должны быть в Git:
# - server/.env
# - любые файлы с паролями
# - приватные ключи (.pem, .key)
# - backup.sql (если содержит реальные данные)
```

## Полезные Git команды

### Проверка статуса
```bash
git status
```

### Добавление изменений
```bash
# Добавить все изменения
git add .

# Добавить конкретный файл
git add path/to/file.py
```

### Создание коммита
```bash
git commit -m "Описание изменений"
```

### Отправка на сервер
```bash
git push
```

### Получение изменений
```bash
git pull
```

### Просмотр истории
```bash
git log
git log --oneline --graph
```

### Создание ветки
```bash
# Создать и переключиться
git checkout -b feature/new-feature

# Переключиться на существующую
git checkout main
```

### Слияние веток
```bash
# Переключиться на main
git checkout main

# Слить ветку
git merge feature/new-feature
```

## Рекомендуемая структура коммитов

```bash
# Новая функция
git commit -m "feat: добавлена форма создания студента"

# Исправление бага
git commit -m "fix: исправлена ошибка валидации email"

# Обновление документации
git commit -m "docs: обновлена инструкция по установке"

# Рефакторинг
git commit -m "refactor: улучшена структура API клиента"

# Стили
git commit -m "style: исправлено форматирование кода"
```

## Игнорирование файлов (уже настроено)

Файл `.gitignore` уже содержит все необходимые исключения:
- ✅ venv/ (виртуальное окружение Python)
- ✅ node_modules/ (зависимости Node.js)
- ✅ .env (секретные переменные)
- ✅ __pycache__/ (кэш Python)
- ✅ dist/, build/ (сборки)
- ✅ *.log (логи)
- ✅ .DS_Store, Thumbs.db (системные файлы)

## Клонирование репозитория на другом устройстве

```bash
# Клонировать репозиторий
git clone https://github.com/ваш-username/crm-school.git
cd crm-school

# Затем следуйте инструкциям из QUICKSTART.md
```

## Работа в команде

### Получение изменений перед работой
```bash
git pull
```

### Разрешение конфликтов
```bash
# Если возник конфликт при pull или merge:
# 1. Откройте конфликтующие файлы
# 2. Найдите маркеры <<<<<<<, =======, >>>>>>>
# 3. Исправьте конфликт
# 4. Добавьте файл: git add file.py
# 5. Завершите merge: git commit
```

### Создание Pull Request (GitHub)
```bash
# 1. Создайте ветку
git checkout -b feature/my-feature

# 2. Сделайте изменения и коммит
git add .
git commit -m "feat: добавлена новая функция"

# 3. Отправьте ветку
git push -u origin feature/my-feature

# 4. Откройте GitHub и создайте Pull Request
```

## .gitignore уже настроен

Проект уже содержит настроенный `.gitignore` файл, который:
- Исключает секретные данные (.env файлы)
- Исключает временные файлы (кэш, логи)
- Исключает зависимости (venv, node_modules)
- Исключает IDE файлы (.vscode, .idea)
- Исключает системные файлы (DS_Store)

## Важно!

⚠️ **Никогда не коммитьте:**
- Файлы .env с паролями
- Приватные ключи
- Базы данных с реальными данными
- Персональную информацию

✅ **Можно коммитить:**
- .env.example (шаблон без реальных данных)
- Исходный код
- Документацию
- Конфигурационные файлы
- Тесты
