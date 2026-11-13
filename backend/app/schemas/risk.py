from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class RiskBase(BaseModel):
    code: str
    asset_id: UUID
    
    # Escenario
    threat_source: str
    vulnerability: str
    scenario_consequence: str
    affected_process: str
    
    # Evaluación inherente
    probability_inherent: Optional[str] = None
    impact_inherent: Optional[str] = None
    existing_controls: Optional[str] = None
    
    # Evaluación residual
    probability_residual: Optional[str] = None
    impact_residual: Optional[str] = None
    residual_assessed_at: Optional[datetime] = None
    
    # Tratamiento
    treatment_code: str
    risk_owner: str
    assessment_date: datetime
    
    # Evidencia
    evidence_status_code: str
    evidence_basis: str
    observations: Optional[str] = None
    
    # Estado
    is_draft: bool = True


class RiskCreate(RiskBase):
    pass


class RiskUpdate(RiskBase):
    pass


class RiskResponse(RiskBase):
    id: UUID
    organization_id: UUID
    residual_assessed_by: Optional[UUID] = None
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None

    class Config:
        from_attributes = True
