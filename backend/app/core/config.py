from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database - Direct PostgreSQL (for migrations)
    DATABASE_URL: str = ""
    
    # Supabase REST API
    SUPABASE_URL: str = "https://xaapvdtsqbytkxsozusq.supabase.co"
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    
    # JWT
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"


settings = Settings()
