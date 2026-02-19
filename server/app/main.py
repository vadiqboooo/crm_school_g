from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, employees, subjects, groups, students, lessons, exams, exam_templates, finances, reports, settings, schedules, school_locations

app = FastAPI(title="CRM School API", version="1.0.0", redirect_slashes=False)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://crm.garryschool.ru",
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


@app.get("/")
async def root():
    return {"message": "CRM School API"}
