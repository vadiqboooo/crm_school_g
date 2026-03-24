from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.routers import auth, employees, subjects, groups, students, lessons, exams, exam_templates, finances, reports, settings, schedules, school_locations, leads, subscriptions
from app.routers.student_auth import router as student_auth_router
from app.routers.student_portal import router as student_portal_router
from app.routers.exam_sessions import router as exam_sessions_router, students_router as portal_creds_router
from app.routers.chat import router as chat_router

app = FastAPI(title="CRM School API", version="1.0.0")

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:5174",
        "https://crm.garryschool.ru",
        "https://web.garryschool.ru",
        "https://web.rancheasy.ru",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(subjects.router)
app.include_router(groups.router)
app.include_router(schedules.router)
app.include_router(students.router)
app.include_router(lessons.router)
app.include_router(exams.router)
app.include_router(exam_templates.router)
app.include_router(finances.router)
app.include_router(reports.router)
app.include_router(settings.router)
app.include_router(school_locations.router)
app.include_router(leads.router)
app.include_router(subscriptions.router)
app.include_router(student_auth_router)
app.include_router(student_portal_router)
app.include_router(exam_sessions_router)
app.include_router(portal_creds_router)
app.include_router(chat_router)


@app.get("/")
async def root():
    return {"message": "CRM School API"}
