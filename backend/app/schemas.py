import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator


# ─── Auth ─────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: str  # "student" | "researcher"

    @field_validator("role")
    @classmethod
    def role_must_be_valid(cls, v: str) -> str:
        if v not in ("student", "researcher"):
            raise ValueError("role must be 'student' or 'researcher'")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ─── User ─────────────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Student Profile ──────────────────────────────────────────────────────────

class StudentProfileCreate(BaseModel):
    academic_year: Optional[str] = None
    major: Optional[str] = None
    skills: list[str] = []
    interests: list[str] = []
    gpa_range: Optional[str] = None
    hours_per_week: Optional[int] = None
    start_date: Optional[str] = None
    remote_preference: Optional[str] = None
    preferred_domains: list[str] = []
    bio: Optional[str] = None
    is_anonymous: bool = False


class StudentProfileUpdate(StudentProfileCreate):
    pass


class StudentProfileOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    academic_year: Optional[str]
    major: Optional[str]
    skills: list[str]
    interests: list[str]
    gpa_range: Optional[str]
    hours_per_week: Optional[int]
    start_date: Optional[str]
    remote_preference: Optional[str]
    preferred_domains: list[str]
    bio: Optional[str]
    resume_url: Optional[str]
    is_anonymous: bool
    profile_complete: bool
    created_at: datetime
    user: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ─── AI Ingestion ─────────────────────────────────────────────────────────────

class IngestRequest(BaseModel):
    free_text: Optional[str] = None  # plain-text input


class IngestResult(BaseModel):
    academic_year: Optional[str] = None
    major: Optional[str] = None
    skills: list[str] = []
    interests: list[str] = []
    gpa_range: Optional[str] = None
    prior_experience: list[str] = []
    summary: Optional[str] = None


# ─── Researcher Profile ───────────────────────────────────────────────────────

class ResearcherProfileCreate(BaseModel):
    department: Optional[str] = None
    lab_name: Optional[str] = None
    title: Optional[str] = None
    institution: Optional[str] = None
    research_areas: list[str] = []
    bio: Optional[str] = None


class ResearcherProfileOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    department: Optional[str]
    lab_name: Optional[str]
    title: Optional[str]
    institution: Optional[str]
    research_areas: list[str]
    bio: Optional[str]
    created_at: datetime
    user: Optional[UserOut] = None

    model_config = {"from_attributes": True}


# ─── Research Project ─────────────────────────────────────────────────────────

class ProjectCreate(BaseModel):
    title: str
    description_plain: str
    required_skills: list[str] = []
    preferred_skills: list[str] = []
    hours_per_week: Optional[int] = None
    start_date: Optional[str] = None
    duration: Optional[str] = None
    min_academic_year: Optional[str] = None
    remote_option: bool = False


class ProjectOut(BaseModel):
    id: uuid.UUID
    researcher_id: uuid.UUID
    title: str
    description_plain: str
    required_skills: list[str]
    preferred_skills: list[str]
    hours_per_week: Optional[int]
    start_date: Optional[str]
    duration: Optional[str]
    min_academic_year: Optional[str]
    remote_option: bool
    is_active: bool
    created_at: datetime
    researcher: Optional[ResearcherProfileOut] = None
    compatibility_score: Optional[float] = None

    model_config = {"from_attributes": True}


# ─── Match ────────────────────────────────────────────────────────────────────

class SwipeRequest(BaseModel):
    project_id: uuid.UUID
    direction: str  # "right" (interested) | "left" (pass)

    @field_validator("direction")
    @classmethod
    def direction_must_be_valid(cls, v: str) -> str:
        if v not in ("right", "left"):
            raise ValueError("direction must be 'right' or 'left'")
        return v


class ResearcherSwipeRequest(BaseModel):
    match_id: uuid.UUID
    direction: str  # "right" | "left"

    @field_validator("direction")
    @classmethod
    def direction_must_be_valid(cls, v: str) -> str:
        if v not in ("right", "left"):
            raise ValueError("direction must be 'right' or 'left'")
        return v


class MatchOut(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    project_id: uuid.UUID
    student_interest: bool
    researcher_interest: bool
    is_mutual: bool
    status: str
    compatibility_score: Optional[float]
    created_at: datetime
    updated_at: datetime
    project: Optional[ProjectOut] = None

    model_config = {"from_attributes": True}


# ─── Message ──────────────────────────────────────────────────────────────────

class MessageCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("message content cannot be empty")
        return v.strip()


class MessageOut(BaseModel):
    id: uuid.UUID
    match_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    created_at: datetime
    sender: Optional[UserOut] = None

    model_config = {"from_attributes": True}
