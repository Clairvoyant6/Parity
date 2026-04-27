from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./fairlens.db"
    GROQ_API_KEY: str = ""
    SECRET_KEY: str = "fairlens_secret"

    class Config:
        env_file = ".env"

settings = Settings()