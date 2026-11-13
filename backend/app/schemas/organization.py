from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID


class OrganizationBase(BaseModel):
    name: str
    short_name: Optional[str] = None
    description: Optional[str] = None


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationResponse(OrganizationBase):
    id: UUID
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class OrganizationMemberBase(BaseModel):
    user_id: UUID
    organization_id: UUID
    role: str  # admin, editor, viewer


class OrganizationMemberCreate(OrganizationMemberBase):
    pass


class OrganizationMemberResponse(OrganizationMemberBase):
    id: UUID
    created_at: datetime

    class Config:
        from_attributes = True
