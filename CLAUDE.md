# CRM School — Project Guide for Claude

## Overview

CRM система для управления учебным центром (школой). Позволяет вести учёт учеников, групп, уроков, лидов, финансов и создавать AI-отчёты для родителей. Домен: `crm.garryschool.ru`.

**Стек:**
- Backend: FastAPI + SQLAlchemy async + PostgreSQL + Alembic
- Frontend: React 18 + TypeScript + Vite + shadcn/ui (Radix UI) + Tailwind CSS v4
- Auth: JWT (access 60 мин + refresh 7 дней) + bcrypt
- Деплой: Docker + Nginx + Let's Encrypt

---

## Project Structure

```
crm_school_g/
├── server/app/
│   ├── main.py               # FastAPI app + все роутеры
│   ├── database.py           # Async SQLAlchemy engine + session
│   ├── config.py             # Settings (DATABASE_URL, JWT, OPENROUTER_API_KEY)
│   ├── models/               # ORM модели
│   ├── routers/              # Эндпоинты API
│   ├── schemas/              # Pydantic схемы
│   └── auth/
│       ├── security.py       # JWT + bcrypt
│       └── dependencies.py   # get_current_user, require_role, get_manager_location_id
├── client_crm/src/app/
│   ├── App.tsx               # Root: AuthProvider + RouterProvider
│   ├── routes.tsx            # React Router v7 маршруты
│   ├── contexts/AuthContext.tsx
│   ├── lib/api.ts            # Единственный ApiClient — все запросы к API
│   ├── types/api.ts          # TypeScript интерфейсы (839 строк)
│   ├── pages/                # Страницы
│   └── components/           # Компоненты
├── nginx/                    # Nginx конфиг
├── docker-compose.yml
└── alembic/                  # Миграции БД (15+)
```

---

## Database Models

### Employee (сотрудник)
Роли: `admin`, `teacher`, `manager`. Есть `is_active` флаг.

### Student (ученик)
- `status`: `active` / `inactive` (soft delete)
- Связи: `groups` (через GroupStudent), `parent_contacts`, `lesson_attendances`, `comments`, `history`, `payments`, `weekly_reports`
- Soft delete: `status = "inactive"`. Hard delete: отдельный эндпоинт `/permanent`.

### GroupStudent (студент-группа, junction table)
- `is_archived` — исключён из группы
- `is_trial` — пробный ученик (лид, ещё не конвертирован)
- `joined_at` — дата добавления

### Group (группа)
- `is_archived` флаг
- Связи: `subject`, `teacher`, `location`, `schedules`, `lessons`, `students`

### Schedule
Отдельная таблица (не поле Group). Несколько расписаний на группу: `day_of_week` (русское название), `start_time`, `duration_minutes` (default 90).

### Lesson (урок)
- `status`: `conducted` / `not_conducted`
- `work_type`: `none` / `control` / `test`
- `grading_system`: `5point` / `tasks`
- Связи: `attendances`

### LessonAttendance (посещаемость)
- `attendance`: `present` / `absent` / `late` / `trial`
- Поля: `late_minutes`, `lesson_grade`, `homework_grade`, `comment`
- **Важно**: `student_id` NOT NULL — нельзя SET NULL при удалении студента, нужно сначала удалить attendance записи.

### Lead (лид/клиент)
Статусы (lifecycle): `not_sorted → contact_established → trial_assigned → trial_conducted → archived`

M2M связи: `trial_groups`, `conducted_groups`

Когда назначают пробный урок (`assign-trial`): создаётся временный `Student` с `is_trial=True` в GroupStudent.
Когда конвертируют (`convert`): `is_trial` → `False`, lead.status = `archived`.
Когда удаляют архивируют лида: если есть `student_id` — нужно сначала удалить `LessonAttendance` и `GroupStudent` записи, потом студента, иначе NOT NULL violation.

### LeadComment
Комментарии к лиду. Когда учитель проводит пробный урок и оставляет комментарий в `LessonAttendance` — он автоматически копируется в `LeadComment` при смене статуса урока на `conducted`.

### Subject (предмет)
JSON поля для конфигурации экзаменов: `tasks`, `primary_to_secondary_scale`, `scale_markers`, `grade_scale`, `topics`. Поддерживает ЕГЭ и ОГЭ.

### Payment, EmployeeSalary (финансы)

### DailyReport (ежедневный отчёт)
Поля: звонки лидам, пробные уроки, доходы, задачи дня, список оттока студентов.

### Task (задача)
Может быть привязана к `DailyReport` или standalone. Статусы: `new/in_progress/urgent/completed`. WebSocket для real-time обновлений (`/reports/ws/tasks`).

### WeeklyReport (еженедельный отчёт)
AI-генерация через OpenRouter. Хранится как текст, можно одобрить перед отправкой родителям.

### SchoolLocation (локация)
Привязывает менеджера к филиалу. Менеджер видит только данные своей локации.

---

## API Routers

| Файл | Prefix |
|------|--------|
| `auth.py` | `/auth` |
| `employees.py` | `/employees` |
| `subjects.py` | `/subjects` |
| `groups.py` | `/groups` |
| `schedules.py` | `/schedules` |
| `students.py` | `/students` |
| `lessons.py` | `/lessons` |
| `exams.py` | `/exams` |
| `exam_templates.py` | `/exam-templates` |
| `finances.py` | `/finances` |
| `reports.py` | `/reports` |
| `settings.py` | `/settings` |
| `school_locations.py` | `/school-locations` |
| `leads.py` | `/leads` |

---

## Auth & RBAC

- `get_current_user` — декодирует JWT, возвращает `Employee`
- `require_role("admin", "manager")` — проверяет роль
- `get_manager_location_id` — возвращает UUID локации менеджера или `None` (admin/teacher без фильтрации)

**Хранение токенов**: localStorage на клиенте. Auto-refresh при 401.

---

## Frontend Pages

| Маршрут | Страница |
|---------|----------|
| `/login` | Авторизация |
| `/` | Главная — список групп (грид/таблица) |
| `/group/:id` | Группа (вкладки: Info, Lessons, Exams, Students, Performance) |
| `/students` | Студенты + Лиды + Архив |
| `/students/:id` | Карточка студента |
| `/exams` | Экзамены |
| `/school` | Настройки — предметы, сотрудники, локации, шаблоны экзаменов |
| `/analytics` | Аналитика |
| `/finances` | Финансы |
| `/reports` | Ежедневные отчёты |
| `/tasks` | Задачи |

### StudentsPage.tsx — сложная страница
Содержит три вкладки: `leads` (лиды/доска), `students` (таблица студентов), `archive` (архив).

Ключевые состояния:
- `mainTab` — `"leads" | "students" | "archive"`
- `selectedLeadForDetail` — открыть карточку лида
- `archivedStudents`, `archivedLeads` — данные для архивной вкладки

---

## Key Business Logic

### Lifecycle лида
```
not_sorted
  → contact_established    (PATCH /leads/{id})
  → trial_assigned         (POST /leads/{id}/assign-trial)
    - Создаёт Student если нет
    - GroupStudent.is_trial = True
  → trial_conducted        (автоматически когда урок переводят в conducted)
    - Копирует комментарий учителя из LessonAttendance → LeadComment
  → archived               (POST /leads/{id}/convert или DELETE /leads/{id})
    - На convert: is_trial → False, student остаётся
    - На delete: удаляет attendance + GroupStudent + student
```

### Soft Delete (студенты)
- `DELETE /students/{id}` → `status = "inactive"` (не удаляет из БД)
- `DELETE /students/{id}/permanent` → удаляет GroupStudent + LessonAttendance + student
- `POST /students/{id}/restore` → `status = "active"`

### Генерация уроков
`POST /groups/{id}/generate-lessons` — перебирает даты от `start_date` до end_date, сопоставляет с расписанием (day_of_week на русском), создаёт Lesson записи. Проведённые уроки не удаляются.

### AI отчёты
`POST /students/{id}/generate-weekly-report` → собирает посещаемость/оценки → запрос в OpenRouter → сохраняет `WeeklyReport.ai_report`.

### Порядок сохранения урока (LessonDetailsForm)
1. `PATCH /lessons/{id}` — тема/ДЗ (без изменения status)
2. Сохранить все attendance записи (с комментариями)
3. `PATCH /lessons/{id}` с `status: "conducted"` — бэкенд копирует комментарии пробных учеников в LeadComment

---

## Critical FK Constraints

`lesson_attendance.student_id` — NOT NULL. **SQLAlchemy пытается SET NULL при удалении Student** → IntegrityError. Решение: всегда явно удалять LessonAttendance записи перед удалением Student.

Аналогично: `group_students.student_id` — NOT NULL. Удалять GroupStudent перед Student.

---

## Frontend API Client

`client_crm/src/app/lib/api.ts` — единственный класс `ApiClient`, экспортируется как `api`. Методы 1:1 с эндпоинтами. Автоматический refresh token на 401.

### Важно про Radix UI Select
`<SelectItem value="">` — **не работает** в Radix UI v2.x (empty string конфликтует с internal placeholder state). Использовать `value="none"` или любое непустое значение.

---

## Environment Variables

```env
# server/.env
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/dbname
SECRET_KEY=...
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
ALGORITHM=HS256
OPENROUTER_API_KEY=...

# client_crm/.env
VITE_API_URL=http://localhost:8000
```

---

## Docker Compose Services

- `backend` — FastAPI на порту 8000
- `frontend` — React/Nginx на порту 5173
- `nginx` — реверс-прокси, порты 80/443, auto-SSL
- `certbot` — Let's Encrypt обновление

PostgreSQL работает на **хосте** (не в Docker). Backend подключается через `host.docker.internal`.
