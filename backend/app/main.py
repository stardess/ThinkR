from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_tables
from app.routers import auth, discover, matches, messages, notifications, researchers, students

app = FastAPI(
    title="ThinkR API",
    version="1.0.0",
    description="Academic research matchmaking platform — backend API",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    await create_tables()


app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(students.router, prefix="/students", tags=["Students"])
app.include_router(researchers.router, prefix="/researchers", tags=["Researchers"])
app.include_router(discover.router, prefix="/discover", tags=["Discover"])
app.include_router(matches.router, prefix="/matches", tags=["Matches"])
app.include_router(messages.router, prefix="/messages", tags=["Messages"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])


@app.get("/health")
async def health():
    return {"status": "ok"}
