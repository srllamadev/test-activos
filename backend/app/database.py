from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Solo crear engine si hay DATABASE_URL configurado
engine = None
SessionLocal = None

if settings.DATABASE_URL:
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency para obtener sesión de base de datos."""
    if SessionLocal is None:
        raise RuntimeError("DATABASE_URL not configured - using Supabase REST API instead")
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
