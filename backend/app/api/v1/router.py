from fastapi import APIRouter
from .auth import router as auth_router
from .assets import router as assets_router
from .risks import router as risks_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(assets_router, prefix="/assets", tags=["Assets"])
api_router.include_router(risks_router, prefix="/risks", tags=["Risks"])
