from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.core.database import async_session


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup ---
    print("\n🚀 MentailPeace API starting...")

    # Check database connection
    try:
        async with async_session() as session:
            await session.execute(text("SELECT 1"))
        print("✅ Database connected")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")

    yield

    # --- Shutdown ---
    print("👋 MentailPeace API shutting down...")


app = FastAPI(title=settings.APP_NAME, debug=settings.DEBUG, lifespan=lifespan)

# CORS — allow frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "MentailPeace API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}
