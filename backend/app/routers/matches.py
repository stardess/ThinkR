import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_researcher, get_current_student, get_current_user
from app.models import Match, MatchStatus, ResearchProject, StudentProfile, User, UserRole
from app.schemas import MatchOut, ResearcherSwipeRequest, SwipeRequest
from app.services.matching import compute_compatibility

router = APIRouter()


@router.post("/swipe", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
async def student_swipe(
    body: SwipeRequest,
    current: Annotated[tuple, Depends(get_current_student)],
    db: AsyncSession = Depends(get_db),
):
    """Student swipes on a research project."""
    user, student = current

    # Ensure project exists
    result = await db.execute(
        select(ResearchProject)
        .where(ResearchProject.id == body.project_id)
        .options(selectinload(ResearchProject.researcher))
    )
    project = result.scalar_one_or_none()
    if not project or not project.is_active:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check for existing match record
    existing = await db.execute(
        select(Match).where(
            Match.student_id == student.id,
            Match.project_id == body.project_id,
        )
    )
    match = existing.scalar_one_or_none()

    interested = body.direction == "right"
    score = compute_compatibility(student, project)

    if match:
        match.student_interest = interested
    else:
        match = Match(
            student_id=student.id,
            project_id=body.project_id,
            student_interest=interested,
            compatibility_score=score,
        )
        db.add(match)

    # Check for mutual match
    if match.student_interest and match.researcher_interest:
        match.is_mutual = True
        match.status = MatchStatus.MATCHED

    await db.commit()
    await db.refresh(match)
    return match


@router.post("/researcher-swipe", response_model=MatchOut)
async def researcher_swipe(
    body: ResearcherSwipeRequest,
    current: Annotated[tuple, Depends(get_current_researcher)],
    db: AsyncSession = Depends(get_db),
):
    """Researcher expresses interest (or passes) on a student who swiped right."""
    user, researcher = current

    result = await db.execute(
        select(Match)
        .where(Match.id == body.match_id)
        .options(selectinload(Match.project))
    )
    match = result.scalar_one_or_none()

    if not match or match.project.researcher_id != researcher.id:
        raise HTTPException(status_code=404, detail="Match not found")

    match.researcher_interest = body.direction == "right"

    if match.student_interest and match.researcher_interest:
        match.is_mutual = True
        match.status = MatchStatus.MATCHED

    await db.commit()
    await db.refresh(match)
    return match


@router.get("", response_model=list[MatchOut])
async def list_matches(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Return all matches for the authenticated user (student or researcher)."""
    if current_user.role == UserRole.STUDENT:
        student_result = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        )
        student = student_result.scalar_one_or_none()
        if not student:
            return []
        result = await db.execute(
            select(Match)
            .where(Match.student_id == student.id)
            .options(selectinload(Match.project).selectinload(ResearchProject.researcher))
            .order_by(Match.updated_at.desc())
        )
    else:
        # Researcher: fetch all matches on their projects
        result = await db.execute(
            select(Match)
            .join(ResearchProject, Match.project_id == ResearchProject.id)
            .join(StudentProfile, Match.student_id == StudentProfile.id)
            .options(
                selectinload(Match.project),
                selectinload(Match.student),
            )
            .where(
                Match.student_interest == True,
            )
            .order_by(Match.updated_at.desc())
        )

    return result.scalars().all()
