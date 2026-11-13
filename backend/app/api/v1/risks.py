from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.database import get_db
from app.models import Risk
from app.schemas import RiskCreate, RiskUpdate, RiskResponse

router = APIRouter()


@router.get("/", response_model=List[RiskResponse])
def list_risks(
    organization_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """Lista todos los riesgos de una organización."""
    risks = db.query(Risk).filter(
        Risk.organization_id == organization_id,
        Risk.archived_at.is_(None)
    ).offset(skip).limit(limit).all()
    
    return risks


@router.get("/{risk_id}", response_model=RiskResponse)
def get_risk(
    risk_id: UUID,
    db: Session = Depends(get_db)
):
    """Obtiene un riesgo por su ID."""
    risk = db.query(Risk).filter(
        Risk.id == risk_id,
        Risk.archived_at.is_(None)
    ).first()
    
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found"
        )
    
    return risk


@router.post("/", response_model=RiskResponse, status_code=status.HTTP_201_CREATED)
def create_risk(
    organization_id: UUID,
    risk: RiskCreate,
    db: Session = Depends(get_db)
):
    """Crea un nuevo riesgo."""
    db_risk = Risk(**risk.dict(), organization_id=organization_id)
    db.add(db_risk)
    db.commit()
    db.refresh(db_risk)
    
    return db_risk


@router.put("/{risk_id}", response_model=RiskResponse)
def update_risk(
    risk_id: UUID,
    risk_update: RiskUpdate,
    db: Session = Depends(get_db)
):
    """Actualiza un riesgo existente."""
    risk = db.query(Risk).filter(
        Risk.id == risk_id,
        Risk.archived_at.is_(None)
    ).first()
    
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found"
        )
    
    for key, value in risk_update.dict(exclude_unset=True).items():
        setattr(risk, key, value)
    
    db.commit()
    db.refresh(risk)
    
    return risk


@router.delete("/{risk_id}", status_code=status.HTTP_204_NO_CONTENT)
def archive_risk(
    risk_id: UUID,
    db: Session = Depends(get_db)
):
    """Archiva un riesgo (soft delete)."""
    risk = db.query(Risk).filter(
        Risk.id == risk_id,
        Risk.archived_at.is_(None)
    ).first()
    
    if not risk:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Risk not found"
        )
    
    from datetime import datetime
    risk.archived_at = datetime.utcnow()
    db.commit()
    
    return None
