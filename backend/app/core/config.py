from pydantic_settings import BaseSettings
from pydantic import ConfigDict

class Settings(BaseSettings):
    model_config = ConfigDict(env_file=".env")

    DATABASE_URL: str = "sqlite:///./fairlens.db"
    GROQ_API_KEY: str = ""
    SECRET_KEY: str = "fairlens_secret"

settings = Settings()
