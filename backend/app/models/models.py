from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    organization_memberships = relationship("OrganizationMember", back_populates="user")


class Organization(Base):
    __tablename__ = "organizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    short_name = Column(String)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    members = relationship("OrganizationMember", back_populates="organization")
    assets = relationship("Asset", back_populates="organization")


class OrganizationMember(Base):
    __tablename__ = "organization_members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    role = Column(String, nullable=False)  # admin, editor, viewer
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="organization_memberships")
    organization = relationship("Organization", back_populates="members")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # Identificación
    code = Column(String, nullable=False)
    name = Column(String, nullable=False)
    category_code = Column(String)
    asset_type_code = Column(String)
    description = Column(Text)
    
    # Contexto organizacional
    macroprocess = Column(String)
    process = Column(String)
    subprocess = Column(String)
    responsible_area = Column(String)
    location = Column(Text)
    supplier = Column(Text)
    
    # Responsabilidades
    owner_name = Column(String)
    custodian_name = Column(String)
    administrator_name = Column(String)
    authorized_users = Column(Text)
    
    # CIA
    confidentiality = Column(String)  # 1-5
    integrity = Column(String)  # 1-5
    availability = Column(String)  # 1-5
    criticality_justification = Column(Text)
    
    # Evidencias
    evidence_reference = Column(Text)
    evidence_status_code = Column(String)
    source_reference = Column(Text)
    
    # Revisión
    review_date = Column(DateTime(timezone=True))
    classification_code = Column(String)
    lifecycle_code = Column(String)
    regulatory_reference = Column(Text)
    observations = Column(Text)
    
    # Estado
    is_draft = Column(Boolean, default=True)
    validated_at = Column(DateTime(timezone=True))
    validated_by = Column(UUID(as_uuid=True))
    archived_at = Column(DateTime(timezone=True))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True))
    updated_by = Column(UUID(as_uuid=True))

    # Relationships
    organization = relationship("Organization", back_populates="assets")
    risks = relationship("Risk", back_populates="asset")


class Risk(Base):
    __tablename__ = "risks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"), nullable=False)
    
    # Identificación
    code = Column(String, nullable=False)
    
    # Escenario
    threat_source = Column(Text, nullable=False)
    vulnerability = Column(Text, nullable=False)
    scenario_consequence = Column(Text, nullable=False)
    affected_process = Column(String, nullable=False)
    
    # Evaluación inherente
    probability_inherent = Column(String)  # 1-5
    impact_inherent = Column(String)  # 1-5
    existing_controls = Column(Text)
    
    # Evaluación residual
    probability_residual = Column(String)  # 1-5
    impact_residual = Column(String)  # 1-5
    residual_assessed_at = Column(DateTime(timezone=True))
    residual_assessed_by = Column(UUID(as_uuid=True))
    
    # Tratamiento
    treatment_code = Column(String, nullable=False)
    risk_owner = Column(String, nullable=False)
    assessment_date = Column(DateTime(timezone=True), nullable=False)
    
    # Evidencia
    evidence_status_code = Column(String, nullable=False)
    evidence_basis = Column(Text, nullable=False)
    observations = Column(Text)
    
    # Estado
    is_draft = Column(Boolean, default=True)
    archived_at = Column(DateTime(timezone=True))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True))
    updated_by = Column(UUID(as_uuid=True))

    # Relationships
    asset = relationship("Asset", back_populates="risks")
    controls = relationship("Control", back_populates="risk")


class Control(Base):
    __tablename__ = "controls"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    risk_id = Column(UUID(as_uuid=True), ForeignKey("risks.id"), nullable=False)
    
    # Identificación
    code = Column(String, nullable=False)
    control_name = Column(Text, nullable=False)
    control_type_code = Column(String)
    control_reference = Column(Text)
    responsible = Column(String)
    
    # Implementación
    implementation_status_code = Column(String)
    implementation_date = Column(DateTime(timezone=True))
    evidence_text = Column(Text)
    
    # Verificación
    verification_date = Column(DateTime(timezone=True))
    effectiveness_verified = Column(String)  # Sí, No, Pendiente
    verification_result = Column(Text)
    verified_by = Column(UUID(as_uuid=True))
    verified_at = Column(DateTime(timezone=True))
    next_review_date = Column(DateTime(timezone=True))
    
    # Estado
    observations = Column(Text)
    archived_at = Column(DateTime(timezone=True))
    
    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True))
    updated_by = Column(UUID(as_uuid=True))

    # Relationships
    risk = relationship("Risk", back_populates="controls")


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id"), nullable=False)
    
    # Identificación
    code = Column(String, nullable=False)
    activity_type_code = Column(String)
    description = Column(Text, nullable=False)
    
    # Asignación
    asset_id = Column(UUID(as_uuid=True), ForeignKey("assets.id"))
    risk_id = Column(UUID(as_uuid=True), ForeignKey("risks.id"))
    responsible = Column(String)
    
    # Fechas
    scheduled_date = Column(DateTime(timezone=True))
    completed_date = Column(DateTime(timezone=True))
    
    # Estado
    status = Column(String, nullable=False)  # Pendiente, En curso, Completada, Vencida
    evidence_link = Column(Text)
    result_agreement = Column(Text)
    next_step = Column(Text)
    
    # Metadata
    archived_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    created_by = Column(UUID(as_uuid=True))
    updated_by = Column(UUID(as_uuid=True))
