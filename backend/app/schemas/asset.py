from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class AssetBase(BaseModel):
    code: str
    name: str
    category_code: Optional[str] = None
    asset_type_code: Optional[str] = None
    description: Optional[str] = None
    
    # Contexto organizacional
    macroprocess: Optional[str] = None
    process: Optional[str] = None
    subprocess: Optional[str] = None
    responsible_area: Optional[str] = None
    location: Optional[str] = None
    supplier: Optional[str] = None
    
    # Responsabilidades
    owner_name: Optional[str] = None
    custodian_name: Optional[str] = None
    administrator_name: Optional[str] = None
    authorized_users: Optional[str] = None
    
    # CIA
    confidentiality: Optional[str] = None
    integrity: Optional[str] = None
    availability: Optional[str] = None
    criticality_justification: Optional[str] = None
    
    # Evidencias
    evidence_reference: Optional[str] = None
    evidence_status_code: Optional[str] = None
    source_reference: Optional[str] = None
    
    # Revisión
    review_date: Optional[datetime] = None
    classification_code: Optional[str] = None
    lifecycle_code: Optional[str] = None
    regulatory_reference: Optional[str] = None
    observations: Optional[str] = None
    
    # Estado
    is_draft: bool = True


class AssetCreate(AssetBase):
    pass


class AssetUpdate(AssetBase):
    pass


class AssetResponse(AssetBase):
    id: UUID
    organization_id: UUID
    validated_at: Optional[datetime] = None
    validated_by: Optional[UUID] = None
    archived_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: Optional[UUID] = None
    updated_by: Optional[UUID] = None

    class Config:
        from_attributes = True
