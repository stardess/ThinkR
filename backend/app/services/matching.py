from app.models import StudentProfile, ResearchProject


# Ordinal ranking of academic seniority, used for the academic-year signal.
YEAR_RANK = {
    "freshman": 1,
    "sophomore": 2,
    "junior": 3,
    "senior": 4,
    "masters": 5,
    "phd": 6,
}


def _norm_set(items: list[str]) -> set[str]:
    return {s.lower().strip() for s in (items or []) if s and s.strip()}


def _overlap_count(a: list[str], b: list[str]) -> tuple[int, int]:
    """(# of b items matched by a, total b items)."""
    set_a, set_b = _norm_set(a), _norm_set(b)
    return len(set_a & set_b), len(set_b)


def compute_compatibility_detailed(student: StudentProfile, project: ResearchProject) -> dict:
    """
    Score student↔project compatibility on a 0–100 scale and return a
    per-signal breakdown.

    Hard signals (~70):
      30  required skill overlap
      20  academic-year match (project minimum)
      20  availability (hours/week + start-date proximity)
    Soft signals (~30):
      15  interest / research-domain alignment
      10  preferred-skill bonus
       5  prior research experience
    """
    breakdown: list[dict] = []

    # ── Required skills (30) — coverage of the project's requirements ─────
    matched, total_req = _overlap_count(student.skills, project.required_skills)
    if total_req:
        skill_earned = round(matched / total_req * 30, 1)
        skill_detail = f"{matched} of {total_req} required skills matched"
    else:
        skill_earned = 30.0
        skill_detail = "No required skills listed"
    breakdown.append({
        "label": "Required skills",
        "earned": skill_earned,
        "max": 30,
        "detail": skill_detail,
    })

    # ── Academic year (20) ────────────────────────────────────────────────
    min_year = (project.min_academic_year or "").lower().strip()
    stu_year = (student.academic_year or "").lower().strip()
    min_rank = YEAR_RANK.get(min_year)
    stu_rank = YEAR_RANK.get(stu_year)
    if not min_rank:
        year_earned, year_detail = 20.0, "No minimum year required"
    elif not stu_rank:
        year_earned, year_detail = 10.0, "Your academic year isn't set"
    elif stu_rank >= min_rank:
        year_earned, year_detail = 20.0, f"Meets {project.min_academic_year}+ requirement"
    elif min_rank - stu_rank == 1:
        year_earned, year_detail = 10.0, f"One year below {project.min_academic_year}"
    else:
        year_earned, year_detail = 0.0, f"Below {project.min_academic_year} requirement"
    breakdown.append({
        "label": "Academic year",
        "earned": year_earned,
        "max": 20,
        "detail": year_detail,
    })

    # ── Availability: hours (14) + start date (6) ─────────────────────────
    if student.hours_per_week and project.hours_per_week:
        diff = abs(student.hours_per_week - project.hours_per_week)
        if diff <= 2:
            hours_earned = 14.0
        elif diff <= 5:
            hours_earned = 9.0
        elif diff <= 10:
            hours_earned = 4.0
        else:
            hours_earned = 0.0
        hours_detail = f"You: {student.hours_per_week}h/wk vs project {project.hours_per_week}h/wk"
    else:
        hours_earned = 7.0
        hours_detail = "Hours not fully specified"

    s_start = (student.start_date or "").lower().strip()
    p_start = (project.start_date or "").lower().strip()
    if s_start and p_start:
        if s_start == p_start or any(tok in p_start for tok in s_start.split() if len(tok) > 2):
            start_earned, start_detail = 6.0, "Start dates align"
        else:
            start_earned, start_detail = 3.0, "Start dates differ"
    else:
        start_earned, start_detail = 3.0, "Start date flexible"

    breakdown.append({
        "label": "Availability",
        "earned": round(hours_earned + start_earned, 1),
        "max": 20,
        "detail": f"{hours_detail}; {start_detail.lower()}",
    })

    # ── Interest / domain alignment (15) — coverage of the lab's areas ────
    researcher_areas = project.researcher.research_areas if project.researcher else []
    i_matched, total_areas = _overlap_count(
        student.interests + student.preferred_domains, researcher_areas
    )
    if total_areas:
        interest_earned = round(i_matched / total_areas * 15, 1)
        interest_detail = f"{i_matched} of {total_areas} research areas shared"
    else:
        interest_earned = 7.5
        interest_detail = "Lab research areas not listed"
    breakdown.append({
        "label": "Research interests",
        "earned": interest_earned,
        "max": 15,
        "detail": interest_detail,
    })

    # ── Preferred skills bonus (10) — coverage of nice-to-haves ───────────
    pref_matched, total_pref = _overlap_count(student.skills, project.preferred_skills)
    if total_pref:
        pref_earned = round(pref_matched / total_pref * 10, 1)
        pref_detail = f"{pref_matched} of {total_pref} preferred skills matched"
    else:
        pref_earned = 10.0
        pref_detail = "No preferred skills listed"
    breakdown.append({
        "label": "Preferred skills",
        "earned": pref_earned,
        "max": 10,
        "detail": pref_detail,
    })

    # ── Prior research experience (5) ─────────────────────────────────────
    has_experience = bool(getattr(student, "prior_experience", None))
    exp_earned = 5.0 if has_experience else 0.0
    breakdown.append({
        "label": "Prior experience",
        "earned": exp_earned,
        "max": 5,
        "detail": "Has prior research experience" if has_experience else "No prior research listed",
    })

    total = round(min(100.0, sum(b["earned"] for b in breakdown)), 1)
    return {"score": total, "breakdown": breakdown}


def compute_compatibility(student: StudentProfile, project: ResearchProject) -> float:
    """Score compatibility between a student and a research project on a 0–100 scale."""
    return compute_compatibility_detailed(student, project)["score"]


def score_to_tier(score: float) -> dict:
    """Convert a 0–100 compatibility score to a human-readable tier label and color key."""
    if score >= 85:
        return {"label": "Strong Match", "color": "green"}
    elif score >= 65:
        return {"label": "Good Match", "color": "blue"}   # rendered teal
    elif score >= 40:
        return {"label": "Partial Match", "color": "yellow"}  # rendered amber
    else:
        return {"label": "Low Match", "color": "gray"}


def rank_projects(
    student: StudentProfile,
    projects: list[ResearchProject],
) -> list[tuple[ResearchProject, float]]:
    """Return projects sorted by descending compatibility score."""
    scored = [(p, compute_compatibility(student, p)) for p in projects]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored
