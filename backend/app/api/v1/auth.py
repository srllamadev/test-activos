from fastapi import APIRouter, HTTPException, status, Header, Depends
from datetime import timedelta
from typing import List, Optional
import asyncio

from app.schemas import UserCreate, UserLogin, UserResponse, Token
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.database_supabase import supabase_client

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    """Registra un nuevo usuario."""
    existing = await supabase_client.select_one("users", filters={"email": f"eq.{user.email}"})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user.password)
    result = await supabase_client.insert("users", {
        "email": user.email,
        "hashed_password": hashed_password,
        "full_name": user.full_name,
        "is_active": True,
        "is_superuser": False
    })
    
    if isinstance(result, list) and result:
        return result[0]
    return result


@router.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """Inicia sesión y retorna un token JWT."""
    user = await supabase_client.select_one("users", filters={"email": f"eq.{user_credentials.email}"})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Usuario inactivo"
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["id"])},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me")
async def get_current_user_endpoint(
    authorization: Optional[str] = Header(None)
):
    """Obtiene el usuario actual."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token requerido",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = authorization.replace("Bearer ", "")
    from app.core.security import decode_access_token
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token sin identificador de usuario",
        )
    
    user = await supabase_client.select_one("users", filters={"id": f"eq.{user_id}"})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )
    
    return user


@router.get("/me/organizations")
async def get_user_organizations(authorization: Optional[str] = Header(None)):
    """Obtiene las organizaciones del usuario actual."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token requerido",
        )
    
    token = authorization.replace("Bearer ", "")
    from app.core.security import decode_access_token
    payload = decode_access_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    
    user_id = payload.get("sub")
    memberships = await supabase_client.select(
        "organization_members",
        columns="*,organizations(*)",
        filters={"user_id": f"eq.{user_id}"}
    )
    
    orgs = []
    for m in memberships:
        org = m.get("organizations", {})
        if org:
            orgs.append({
                "id": org.get("id"),
                "name": org.get("name"),
                "short_name": org.get("short_name"),
                "role": m.get("role")
            })
    
    return orgs
