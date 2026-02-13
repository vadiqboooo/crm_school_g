from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, employees, subjects, groups, students, lessons, exams, finances, reports, settings

app = FastAPI(title="CRM School API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(subjects.router)
app.include_router(groups.router)
app.include_router(students.router)
app.include_router(lessons.router)
app.include_router(exams.router)
app.include_router(finances.router)
app.include_router(reports.router)
app.include_router(settings.router)


@app.get("/")
async def root():
    return {"message": "CRM School API"}
