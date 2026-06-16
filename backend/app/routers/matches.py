import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_researcher, get_current_student, get_current_user
from app.models import Match, MatchStatus, ResearchProject, ResearcherProfile, StudentProfile, User, UserRole
from app.schemas import MatchOut, ProfessorRequestBody, ResearcherSwipeRequest, SwipeRequest
from app.services.matching import compute_compatibility

router = APIRouter()


def _match_load_opts():
    """Eager-load every relationship MatchOut reads, so async serialization
    never triggers a lazy load (which raises MissingGreenlet)."""
    return (
        selectinload(Match.project)
        .selectinload(ResearchProject.researcher)
        .selectinload(ResearcherProfile.user),
        selectinload(Match.student).selectinload(StudentProfile.user),
    )


async def _reload_match(db: AsyncSession, match_id: uuid.UUID) -> Match:
    result = await db.execute(
        select(Match).where(Match.id == match_id).options(*_match_load_opts())
    )
    match = result.scalar_one()
    if match.student and match.student.is_anonymous:
        match.student.user = None
    return match


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
    return await _reload_match(db, match.id)


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
    return await _reload_match(db, match.id)


@router.post("/professor-request", response_model=MatchOut, status_code=status.HTTP_201_CREATED)
async def professor_request(
    body: ProfessorRequestBody,
    current: Annotated[tuple, Depends(get_current_researcher)],
    db: AsyncSession = Depends(get_db),
):
    """Professor proactively expresses interest in a student (creates or updates a Match)."""
    user, researcher = current

    # Verify project belongs to this researcher
    proj_result = await db.execute(
        select(ResearchProject)
        .where(
            ResearchProject.id == body.project_id,
            ResearchProject.researcher_id == researcher.id,
        )
        .options(selectinload(ResearchProject.researcher))
    )
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Verify student exists
    student_result = await db.execute(
        select(StudentProfile).where(StudentProfile.id == body.student_id)
    )
    student = student_result.scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Check for existing match
    existing = await db.execute(
        select(Match).where(
            Match.student_id == body.student_id,
            Match.project_id == body.project_id,
        )
    )
    match = existing.scalar_one_or_none()

    score = compute_compatibility(student, project)

    if match:
        match.researcher_interest = True
    else:
        match = Match(
            student_id=body.student_id,
            project_id=body.project_id,
            researcher_interest=True,
            student_interest=False,
            compatibility_score=score,
        )
        db.add(match)

    # If both sides interested, mark as mutual
    if match.student_interest and match.researcher_interest:
        match.is_mutual = True
        match.status = MatchStatus.MATCHED

    await db.commit()
    return await _reload_match(db, match.id)


@router.get("", response_model=list[MatchOut])
async def list_matches(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Return all matches for the authenticated user (student or researcher)."""
    # Eager-load every relationship the response schema reads, so async
    # serialization never triggers a lazy load.
    load_opts = (
        selectinload(Match.project)
        .selectinload(ResearchProject.researcher)
        .selectinload(ResearcherProfile.user),
        selectinload(Match.student).selectinload(StudentProfile.user),
    )

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
            .options(*load_opts)
            .order_by(Match.updated_at.desc())
        )
        return result.scalars().all()

    # Researcher: fetch all matches on their projects where a student showed interest
    result = await db.execute(
        select(Match)
        .join(ResearchProject, Match.project_id == ResearchProject.id)
        .options(*load_opts)
        .where(Match.student_interest == True)
        .where(
            ResearchProject.researcher_id.in_(
                select(ResearcherProfile.id).where(
                    ResearcherProfile.user_id == current_user.id
                )
            )
        )
        .order_by(Match.updated_at.desc())
    )
    matches = result.scalars().all()

    # Respect anonymity: hide identity of anonymous students in the queue
    for m in matches:
        if m.student and m.student.is_anonymous:
            m.student.user = None

    return matches
