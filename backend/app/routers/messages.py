import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Match, Message, ResearchProject, StudentProfile, User, UserRole
from app.schemas import MessageCreate, MessageOut

router = APIRouter()


async def _assert_match_access(match_id: uuid.UUID, user: User, db: AsyncSession) -> Match:
    """Ensure the user is a participant in the match and the match is mutual."""
    result = await db.execute(
        select(Match)
        .where(Match.id == match_id)
        .options(
            selectinload(Match.project).selectinload(ResearchProject.researcher),
            selectinload(Match.student),
        )
    )
    match = result.scalar_one_or_none()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    if not match.is_mutual:
        raise HTTPException(status_code=403, detail="Chat is only available for mutual matches")

    # Verify the user is a participant
    is_student_participant = (
        user.role == UserRole.STUDENT and match.student.user_id == user.id
    )
    is_researcher_participant = (
        user.role == UserRole.RESEARCHER
        and match.project.researcher.user_id == user.id
    )
    if not (is_student_participant or is_researcher_participant):
        raise HTTPException(status_code=403, detail="Not a participant in this match")

    return match


@router.get("/{match_id}", response_model=list[MessageOut])
async def get_messages(
    match_id: uuid.UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    await _assert_match_access(match_id, current_user, db)

    result = await db.execute(
        select(Message)
        .where(Message.match_id == match_id)
        .options(selectinload(Message.sender))
        .order_by(Message.created_at.asc())
    )
    return result.scalars().all()


@router.post("/{match_id}", response_model=MessageOut, status_code=201)
async def send_message(
    match_id: uuid.UUID,
    body: MessageCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    await _assert_match_access(match_id, current_user, db)

    message = Message(
        match_id=match_id,
        sender_id=current_user.id,
        content=body.content,
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message
