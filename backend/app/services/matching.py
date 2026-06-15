from app.models import StudentProfile, ResearchProject


def _jaccard(a: list[str], b: list[str]) -> float:
    """Jaccard similarity between two lists of strings (case-insensitive)."""
    set_a = {s.lower().strip() for s in a if s}
    set_b = {s.lower().strip() for s in b if s}
    if not set_a and not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    return intersection / union if union else 0.0


def compute_compatibility(student: StudentProfile, project: ResearchProject) -> float:
    """
    Score compatibility between a student and a research project on a 0–100 scale.

    Weights:
      40% — required skill overlap
      15% — preferred skill overlap
      30% — research domain / interest alignment
      15% — availability & logistics
    """
    # Required skills overlap (40%)
    skill_score = _jaccard(student.skills, project.required_skills) * 40

    # Preferred skills overlap (15%)
    pref_score = _jaccard(student.skills, project.preferred_skills) * 15

    # Interest / domain alignment (30%)
    researcher_areas: list[str] = []
    if project.researcher:
        researcher_areas = project.researcher.research_areas or []
    interest_score = _jaccard(
        student.interests + student.preferred_domains,
        researcher_areas,
    ) * 30

    # Availability match (15%)
    avail_score = 0.0
    if student.hours_per_week and project.hours_per_week:
        diff = abs(student.hours_per_week - project.hours_per_week)
        if diff <= 2:
            avail_score = 15.0
        elif diff <= 5:
            avail_score = 10.0
        elif diff <= 10:
            avail_score = 5.0
    else:
        avail_score = 7.5  # neutral when either side hasn't specified

    total = skill_score + pref_score + interest_score + avail_score
    return round(min(100.0, total), 1)


def rank_projects(
    student: StudentProfile,
    projects: list[ResearchProject],
) -> list[tuple[ResearchProject, float]]:
    """Return projects sorted by descending compatibility score."""
    scored = [(p, compute_compatibility(student, p)) for p in projects]
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored
