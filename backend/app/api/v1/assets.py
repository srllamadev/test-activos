from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import Asset
from app.schemas import AssetCreate, AssetUpdate, AssetResponse

router = APIRouter()


@router.get("/", response_model=List[AssetResponse])
def list_assets(
    organization_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Lista todos los activos de una organización."""
    assets = db.query(Asset).filter(
        Asset.organization_id == organization_id,
        Asset.archived_at.is_(None)
    ).offset(skip).limit(limit).all()
    
    return assets


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(
    asset_id: UUID,
    db: Session = Depends(get_db)
):
    """Obtiene un activo por su ID."""
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.archived_at.is_(None)
    ).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    return asset


@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(
    organization_id: UUID,
    asset: AssetCreate,
    db: Session = Depends(get_db)
):
    """Crea un nuevo activo."""
    db_asset = Asset(**asset.dict(), organization_id=organization_id)
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    return db_asset


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(
    asset_id: UUID,
    asset_update: AssetUpdate,
    db: Session = Depends(get_db)
):
    """Actualiza un activo existente."""
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.archived_at.is_(None)
    ).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    for key, value in asset_update.dict(exclude_unset=True).items():
        setattr(asset, key, value)
    
    db.commit()
    db.refresh(asset)
    
    return asset


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_asset(
    asset_id: UUID,
    db: Session = Depends(get_db)
):
    """Archiva un activo (soft delete)."""
    asset = db.query(Asset).filter(
        Asset.id == asset_id,
        Asset.archived_at.is_(None)
    ).first()
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found"
        )
    
    from datetime import datetime
    asset.archived_at = datetime.utcnow()
    db.commit()
    
    return None
