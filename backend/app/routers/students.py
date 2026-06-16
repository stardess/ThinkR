import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_student, get_current_user
from app.models import ResearchProject, StudentProfile, User
from app.schemas import IngestRequest, IngestResult, StudentProfileOut, StudentProfileUpdate
from app.services.ai_ingestion import ingest_resume_file, ingest_student_text
from app.services.matching import compute_compatibility_detailed, score_to_tier

router = APIRouter()


@router.get("", response_model=list[StudentProfileOut])
async def list_students(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    project_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Return a paginated list of public (non-anonymous, profile-complete) students.
    If project_id is provided, each result includes a compatibility_score and tier
    computed against that project, sorted by score descending.
    """
    result = await db.execute(
        select(StudentProfile)
        .where(
            StudentProfile.is_anonymous == False,
            StudentProfile.profile_complete == True,
        )
        .options(selectinload(StudentProfile.user))
        .offset(skip)
        .limit(limit)
    )
    students = result.scalars().all()

    if not project_id:
        return students

    # Load the project with researcher so compute_compatibility works
    proj_result = await db.execute(
        select(ResearchProject)
        .where(ResearchProject.id == project_id)
        .options(selectinload(ResearchProject.researcher))
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        return students

    # Build scored output
    scored = []
    for student in students:
        detail = compute_compatibility_detailed(student, project)
        out = StudentProfileOut.model_validate(student)
        out.compatibility_score = detail["score"]
        out.tier = score_to_tier(detail["score"])
        out.score_breakdown = detail["breakdown"]
        scored.append(out)

    scored.sort(key=lambda s: s.compatibility_score or 0, reverse=True)
    return scored

@router.get("/me", response_model=StudentProfileOut)
async def get_my_profile(
    current: Annotated[tuple, Depends(get_current_student)],
    db: AsyncSession = Depends(get_db),
):
    user, _ = current
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.user_id == user.id)
        .options(selectinload(StudentProfile.user))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.get("/{student_id}", response_model=StudentProfileOut)
async def get_student(student_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(StudentProfile)
        .where(StudentProfile.id == student_id)
        .options(selectinload(StudentProfile.user))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Student not found")
    # Enforce anonymous mode — strip user details
    if profile.is_anonymous:
        profile.user = None
    return profile


@router.put("/me", response_model=StudentProfileOut)
async def update_my_profile(
    body: StudentProfileUpdate,
    current: Annotated[tuple, Depends(get_current_student)],
    db: AsyncSession = Depends(get_db),
):
    user, profile = current
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    # Mark complete if minimum fields are present
    profile.profile_complete = bool(profile.skills and profile.interests and profile.major)

    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/ingest", response_model=IngestResult)
async def ingest_profile(
    current: Annotated[tuple, Depends(get_current_student)],
    free_text: str = Form(None),
    file: UploadFile = File(None),
):
    """
    Accepts either a free-text form field or a file upload (PDF/DOCX/TXT).
    Sends content to the AI ingestion service and returns structured fields
    for the student to review before saving.
    """
    if file:
        raw_bytes = await file.read()
        text = await ingest_resume_file(raw_bytes, file.filename or "")
    elif free_text:
        text = free_text
    else:
        raise HTTPException(status_code=422, detail="Provide free_text or a file")

    if not text.strip():
        raise HTTPException(status_code=422, detail="Could not extract text from the uploaded file")

    return await ingest_student_text(text)
