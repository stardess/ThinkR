from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import Match, Message, ResearchProject, ResearcherProfile, StudentProfile, User, UserRole

router = APIRouter()


@router.get("/summary")
async def get_notification_summary(
    current_user: Annotated[User, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Return notification counts used for the navbar badge and live toast banners.

    Shared keys (zero when not applicable to the role):
      new_matches       — mutual matches (both sides interested)
      unread_messages   — messages from the other party in mutual chats (last 24 h)
      incoming_requests — STUDENT only: researchers who proactively reached out
      pending_swipes    — RESEARCHER only: students who swiped right, awaiting response
    """
    since = datetime.utcnow() - timedelta(hours=24)
    new_matches = 0
    incoming_requests = 0
    pending_swipes = 0
    mutual_ids: list = []

    if current_user.role == UserRole.STUDENT:
        sp_result = await db.execute(
            select(StudentProfile).where(StudentProfile.user_id == current_user.id)
        )
        student = sp_result.scalar_one_or_none()
        if not student:
            return _empty_summary()

        # Mutual matches
        nm_result = await db.execute(
            select(func.count(Match.id)).where(
                Match.student_id == student.id,
                Match.is_mutual == True,
            )
        )
        new_matches = nm_result.scalar() or 0

        # A researcher reached out proactively (not yet accepted by student)
        ir_result = await db.execute(
            select(func.count(Match.id)).where(
                Match.student_id == student.id,
                Match.researcher_interest == True,
                Match.student_interest == False,
                Match.is_mutual == False,
            )
        )
        incoming_requests = ir_result.scalar() or 0

        mutual_ids_result = await db.execute(
            select(Match.id).where(
                Match.student_id == student.id,
                Match.is_mutual == True,
            )
        )
        mutual_ids = [row[0] for row in mutual_ids_result.all()]

    else:
        rp_result = await db.execute(
            select(ResearcherProfile).where(ResearcherProfile.user_id == current_user.id)
        )
        researcher = rp_result.scalar_one_or_none()
        if not researcher:
            return _empty_summary()

        # Students who swiped right and haven't been responded to yet
        ps_result = await db.execute(
            select(func.count(Match.id))
            .join(ResearchProject, Match.project_id == ResearchProject.id)
            .where(
                ResearchProject.researcher_id == researcher.id,
                Match.student_interest == True,
                Match.researcher_interest == False,
            )
        )
        pending_swipes = ps_result.scalar() or 0

        # Mutual matches on this researcher's projects
        nm_result = await db.execute(
            select(func.count(Match.id))
            .join(ResearchProject, Match.project_id == ResearchProject.id)
            .where(
                ResearchProject.researcher_id == researcher.id,
                Match.is_mutual == True,
            )
        )
        new_matches = nm_result.scalar() or 0

        mutual_ids_result = await db.execute(
            select(Match.id)
            .join(ResearchProject, Match.project_id == ResearchProject.id)
            .where(
                ResearchProject.researcher_id == researcher.id,
                Match.is_mutual == True,
            )
        )
        mutual_ids = [row[0] for row in mutual_ids_result.all()]

    # Unread messages: recent messages from the other party in mutual chats
    unread_messages = 0
    if mutual_ids:
        um_result = await db.execute(
            select(func.count(Message.id)).where(
                Message.match_id.in_(mutual_ids),
                Message.sender_id != current_user.id,
                Message.created_at > since,
            )
        )
        unread_messages = um_result.scalar() or 0

    return {
        "new_matches": new_matches,
        "unread_messages": unread_messages,
        "incoming_requests": incoming_requests,
        "pending_swipes": pending_swipes,
    }


def _empty_summary() -> dict:
    return {
        "new_matches": 0,
        "unread_messages": 0,
        "incoming_requests": 0,
        "pending_swipes": 0,
    }
