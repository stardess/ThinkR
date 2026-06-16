from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_student
from app.models import Match, ResearchProject, ResearcherProfile, StudentProfile
from app.schemas import ProjectOut
from app.services.matching import compute_compatibility_detailed, score_to_tier

router = APIRouter()


@router.get("", response_model=list[ProjectOut])
async def discover_projects(
    current: Annotated[tuple, Depends(get_current_student)],
    db: AsyncSession = Depends(get_db),
    remote_only: bool = Query(False),
    domain: Optional[str] = Query(None),
    max_hours: Optional[int] = Query(None),
):
    """
    Return a ranked list of active research projects for the authenticated student.
    Projects the student has already swiped on are excluded.
    Supports optional hard filters: remote_only, domain, max_hours.
    """
    user, student = current

    # IDs of projects already swiped by this student
    swiped_result = await db.execute(
        select(Match.project_id).where(Match.student_id == student.id)
    )
    swiped_ids = {row[0] for row in swiped_result.all()}

    # Fetch active projects not yet swiped
    query = (
        select(ResearchProject)
        .where(ResearchProject.is_active == True)
        .options(
            selectinload(ResearchProject.researcher).selectinload(ResearcherProfile.user)
        )
    )
    if swiped_ids:
        query = query.where(ResearchProject.id.not_in(swiped_ids))
    if remote_only:
        query = query.where(ResearchProject.remote_option == True)
    if max_hours:
        query = query.where(ResearchProject.hours_per_week <= max_hours)

    result = await db.execute(query)
    projects = result.scalars().all()

    # Optionally filter by domain keyword
    if domain:
        domain_lower = domain.lower()
        projects = [
            p for p in projects
            if any(domain_lower in area.lower() for area in (p.researcher.research_areas if p.researcher else []))
        ]

    # Score each project (with breakdown) and rank by compatibility descending
    output = []
    for project in projects:
        detail = compute_compatibility_detailed(student, project)
        project_out = ProjectOut.model_validate(project)
        project_out.compatibility_score = detail["score"]
        project_out.tier = score_to_tier(detail["score"])
        project_out.score_breakdown = detail["breakdown"]
        output.append(project_out)

    output.sort(key=lambda p: p.compatibility_score or 0, reverse=True)
    return output
