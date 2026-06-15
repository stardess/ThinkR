import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_researcher
from app.models import ResearcherProfile, ResearchProject
from app.schemas import ProjectCreate, ProjectOut, ResearcherProfileCreate, ResearcherProfileOut

router = APIRouter()


@router.get("/me", response_model=ResearcherProfileOut)
async def get_my_profile(
    current: Annotated[tuple, Depends(get_current_researcher)],
    db: AsyncSession = Depends(get_db),
):
    user, _ = current
    result = await db.execute(
        select(ResearcherProfile)
        .where(ResearcherProfile.user_id == user.id)
        .options(selectinload(ResearcherProfile.user))
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile


@router.put("/me", response_model=ResearcherProfileOut)
async def update_my_profile(
    body: ResearcherProfileCreate,
    current: Annotated[tuple, Depends(get_current_researcher)],
    db: AsyncSession = Depends(get_db),
):
    user, profile = current
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


@router.post("/me/projects", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    current: Annotated[tuple, Depends(get_current_researcher)],
    db: AsyncSession = Depends(get_db),
):
    user, profile = current
    if not profile:
        raise HTTPException(status_code=404, detail="Complete your researcher profile first")

    project = ResearchProject(**body.model_dump(), researcher_id=profile.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/me/projects", response_model=list[ProjectOut])
async def list_my_projects(
    current: Annotated[tuple, Depends(get_current_researcher)],
    db: AsyncSession = Depends(get_db),
):
    user, profile = current
    if not profile:
        return []
    result = await db.execute(
        select(ResearchProject)
        .where(ResearchProject.researcher_id == profile.id)
        .order_by(ResearchProject.created_at.desc())
    )
    return result.scalars().all()


@router.patch("/me/projects/{project_id}/toggle", response_model=ProjectOut)
async def toggle_project_active(
    project_id: uuid.UUID,
    current: Annotated[tuple, Depends(get_current_researcher)],
    db: AsyncSession = Depends(get_db),
):
    user, profile = current
    result = await db.execute(
        select(ResearchProject).where(
            ResearchProject.id == project_id,
            ResearchProject.researcher_id == profile.id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.is_active = not project.is_active
    await db.commit()
    await db.refresh(project)
    return project
