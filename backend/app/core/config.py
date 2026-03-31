from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    DIRECT_URL: str = ""

    # JWT
    JWT_SECRET: str = "change-this"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""

    # OpenRouter
    OPENROUTER_API_KEY: str = ""

    # App
    APP_NAME: str = "MentailPeace"
    DEBUG: bool = True

    class Config:
        env_file = ".env"


settings = Settings()
