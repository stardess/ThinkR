"""
ThinkR demo seed script.

Usage (from the backend/ directory):
    python scripts/seed.py

Requires DATABASE_URL to be set in the environment (or via a .env file that
pydantic-settings picks up automatically).  Idempotent: skips records whose
email / title already exists.
"""

import asyncio
import os
import sys

# Make `app.*` importable when running as: cd backend && python scripts/seed.py
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passlib.context import CryptContext
from sqlalchemy import select

from app.database import AsyncSessionLocal, create_tables
from app.models import Match, ResearcherProfile, ResearchProject, StudentProfile, User, UserRole
from app.services.matching import compute_compatibility

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DEMO_PASSWORD = "ThinkR2026!"


def _hash(password: str) -> str:
    return pwd_context.hash(password)


# ─── Fixture data ─────────────────────────────────────────────────────────────

RESEARCHERS = [
    {
        "email": "elena.ramirez@university.edu",
        "name": "Dr. Elena Ramirez",
        "profile": {
            "department": "Biology",
            "lab_name": "Ramirez Exercise Biology Lab",
            "title": "Associate Professor",
            "institution": "State University",
            "research_areas": [
                "mitochondrial biology", "exercise physiology",
                "metabolism", "sports medicine", "translational research",
            ],
            "bio": (
                "Highly structured and patient with new researchers. Strong at teaching "
                "lab technique. Prefers students who are consistent, careful, and curious."
            ),
        },
    },
    {
        "email": "marcus.chen@university.edu",
        "name": "Dr. Marcus Chen",
        "profile": {
            "department": "Computer Science and Emergency Medicine",
            "lab_name": "Chen Clinical AI Lab",
            "title": "Assistant Professor",
            "institution": "State University",
            "research_areas": [
                "machine learning", "clinical informatics",
                "healthcare AI", "data science", "health informatics",
            ],
            "bio": (
                "Analytical, fast-paced, and outcomes-focused. Prefers students who are "
                "self-directed, comfortable troubleshooting code, and can communicate "
                "technical findings to clinical audiences."
            ),
        },
    },
    {
        "email": "leo.vasquez@university.edu",
        "name": "Dr. Leo Vasquez",
        "profile": {
            "department": "Computer Science and Health Informatics",
            "lab_name": "Vasquez Predictive Health Lab",
            "title": "Associate Professor",
            "institution": "State University",
            "research_areas": [
                "machine learning", "healthcare AI", "data science",
                "clinical informatics", "health informatics",
            ],
            "bio": (
                "Patient, conceptually strong, and supportive of students new to research. "
                "Prefers students who are curious, mathematically persistent, and comfortable "
                "learning through trial and error."
            ),
        },
    },
    {
        "email": "annie.karitonze@nd.edu",
        "name": "Dr. Annie Karitonze",
        "profile": {
            "department": "Computer Science and Engineering",
            "lab_name": "Youth & Technology HCI Lab",
            "title": "Assistant Professor",
            "institution": "University of Notre Dame",
            "research_areas": [
                "Human-Computer Interaction",
                "Social Computing",
                "Online Safety",
                "Usable Privacy and Security",
                "Digital Youth",
                "Child Welfare",
                "Marginalized Populations",
            ],
            "bio": (
                "Human-computer interaction researcher designing technology-driven solutions "
                "that empower people and protect the well-being of youth and marginalized "
                "communities. Uses human-centered and participatory design methods to study "
                "adolescent online safety for teens in foster care. Fellow of the Lucy Family "
                "Institute for Data and Society and an active member of the SIGCHI Latin "
                "American HCI Community (LAIHC); a Latina advocate for diversity, inclusion, "
                "and equity in computing. Mentors students closely and welcomes those new to "
                "research who bring strong design instincts and care for the communities we serve."
            ),
        },
    },
]

PROJECTS = {
    "elena.ramirez@university.edu": [
        {
            "title": "Mitochondrial Stress and Exercise Recovery Study",
            "description_plain": (
                "The Ramirez Lab is recruiting undergraduate research assistants to support "
                "a study examining how mitochondrial stress markers change after high-intensity "
                "exercise and recovery. Students will assist with sample preparation, literature "
                "review, data entry, microscopy support, and basic analysis of cellular stress "
                "indicators. Appropriate for students interested in medicine, human performance, "
                "molecular biology, or translational research."
            ),
            "required_skills": ["General biology", "Attention to detail", "Excel", "Lab protocols"],
            "preferred_skills": ["Pipetting", "Microscopy", "Chemistry coursework", "Metabolism"],
            "hours_per_week": 6,
            "min_academic_year": "Sophomore",
            "remote_option": False,
            "start_date": "Fall 2026",
            "duration": "1 semester",
        },
        {
            "title": "Wearable Sensor Data for Injury Prevention in Student Athletes",
            "description_plain": (
                "This project uses wearable sensor data to identify movement patterns, workload "
                "trends, and fatigue indicators associated with injury risk in student athletes. "
                "Research assistants will help with device setup, testing sessions, data entry, "
                "athlete scheduling, and summary dashboards. Students will gain experience in "
                "human performance research, sports medicine, biomechanics, and applied analytics."
            ),
            "required_skills": ["Excel", "Reliability", "Interest in human performance", "Data entry"],
            "preferred_skills": ["Statistics", "Motion analysis", "Athletic training", "Wearable technology"],
            "hours_per_week": 5,
            "min_academic_year": "Sophomore",
            "remote_option": False,
            "start_date": "Fall 2026",
            "duration": "1 semester",
        },
    ],
    "marcus.chen@university.edu": [
        {
            "title": "AI-Assisted Early Detection of Sepsis in Emergency Care",
            "description_plain": (
                "This project explores whether machine learning models can help identify early "
                "sepsis risk using de-identified emergency care data. Research assistants will "
                "support data cleaning, variable labeling, literature review, exploratory analysis, "
                "and model performance summaries. Ideal for students interested in medical school, "
                "health informatics, biomedical data science, or responsible AI."
            ),
            "required_skills": ["Python", "Machine Learning", "Statistics", "Data Visualization"],
            "preferred_skills": ["R", "scikit-learn", "Pandas", "healthcare data"],
            "hours_per_week": 8,
            "min_academic_year": "Junior",
            "remote_option": True,
            "start_date": "Fall 2026",
            "duration": "2 semesters",
        },
        {
            "title": "Ethics of AI in Healthcare Decision Support",
            "description_plain": (
                "This project examines the ethical, clinical, and policy implications of "
                "AI-enabled decision support tools in healthcare. Student researchers will assist "
                "with literature review, case analysis, policy comparison, and seminar discussion "
                "briefs. Topics include bias, transparency, clinician accountability, patient "
                "consent, explainability, and risk in high-stakes clinical settings."
            ),
            "required_skills": ["Strong writing", "Reading comprehension", "Healthcare technology interest"],
            "preferred_skills": ["Ethics coursework", "Health policy", "AI literacy", "Debate experience"],
            "hours_per_week": 4,
            "min_academic_year": "Sophomore",
            "remote_option": True,
            "start_date": "Spring 2027",
            "duration": "1 semester",
        },
    ],
    "leo.vasquez@university.edu": [
        {
            "title": "Machine Learning for Health Outcomes Prediction",
            "description_plain": (
                "The Vasquez Lab applies machine learning and statistical modeling to predict "
                "patient health outcomes from clinical and behavioral datasets. Research assistants "
                "will build and evaluate predictive models, visualize findings, maintain data "
                "pipelines, and contribute to peer-reviewed publications. This is a strong fit "
                "for students with Python and ML experience who want to apply their skills to "
                "real-world health informatics problems."
            ),
            "required_skills": ["Python", "Machine Learning", "Statistics", "Data Visualization", "R", "scikit-learn"],
            "preferred_skills": ["Pandas", "SQL", "Machine Learning", "Python"],
            "hours_per_week": 8,
            "min_academic_year": "Junior",
            "remote_option": True,
            "start_date": "Fall 2026",
            "duration": "2 semesters",
        },
    ],
    "annie.karitonze@nd.edu": [
        {
            "title": "Designing Online Safety Tools for Teens in Foster Care",
            "description_plain": (
                "The Youth & Technology HCI Lab is hiring a research assistant for a funded, "
                "human-centered study on adolescent online safety for teens in foster care. "
                "Using participatory design and qualitative methods, the student will help "
                "co-design and evaluate safety-focused mobile experiences with youth, run user "
                "interviews and design workshops, analyze qualitative data, and prototype "
                "interfaces in Figma. A strong fit for students interested in HCI, social "
                "computing, online safety, and designing technology for marginalized and "
                "vulnerable populations. No prior research experience required — we mentor "
                "motivated students with strong design instincts."
            ),
            "required_skills": [
                "Human-Computer Interaction", "User Research",
                "Participatory Design", "Qualitative Coding", "Python",
            ],
            "preferred_skills": ["Figma", "Survey Design", "Mobile Development", "Data Visualization"],
            "hours_per_week": 10,
            "min_academic_year": "Junior",
            "remote_option": True,
            "start_date": "Fall 2026",
            "duration": "2 semesters",
        },
    ],
}

STUDENTS = [
    {
        "email": "alex.kim@student.edu",
        "name": "Alex Kim",
        "profile": {
            "academic_year": "Junior",
            "major": "Computer Science",
            "skills": ["Python", "Machine Learning", "Statistics", "Data Visualization", "R", "scikit-learn", "Pandas", "SQL"],
            "interests": ["machine learning", "healthcare AI", "data science", "clinical informatics"],
            "gpa_range": "3.5–3.8",
            "hours_per_week": 8,
            "start_date": "Fall 2026",
            "remote_preference": "hybrid",
            "preferred_domains": ["machine learning", "data science", "health informatics"],
            "prior_experience": ["Undergraduate research assistant, ML Lab (2 semesters)", "Kaggle competition top-10%"],
            "bio": "CS junior passionate about applying ML to healthcare problems. Experienced with Python, scikit-learn, and data pipelines. Looking for a research role where I can contribute to meaningful clinical outcomes.",
            "profile_complete": True,
            "is_anonymous": False,
        },
    },
    {
        "email": "sofia.rodriguez@student.edu",
        "name": "Sofia Rodriguez",
        "profile": {
            "academic_year": "Sophomore",
            "major": "Biology",
            "skills": ["General biology", "Lab protocols", "Attention to detail", "Pipetting", "Microscopy", "Excel"],
            "interests": ["mitochondrial biology", "exercise physiology", "pre-medicine", "metabolism"],
            "gpa_range": "3.5–3.8",
            "hours_per_week": 6,
            "start_date": "Fall 2026",
            "remote_preference": "in-person",
            "preferred_domains": ["biology", "biochemistry", "exercise science"],
            "bio": "Biology sophomore with wet lab experience, interested in pre-med and translational research in cellular biology.",
            "profile_complete": True,
            "is_anonymous": False,
        },
    },
    {
        "email": "jordan.lee@student.edu",
        "name": "Jordan Lee",
        "profile": {
            "academic_year": "Senior",
            "major": "Public Health",
            "skills": ["Excel", "Statistics", "Survey design", "Data handling", "Communication", "R"],
            "interests": ["public health", "health informatics", "data science", "healthcare AI"],
            "gpa_range": "3.0–3.5",
            "hours_per_week": 5,
            "start_date": "Fall 2026",
            "remote_preference": "hybrid",
            "preferred_domains": ["public health", "health informatics", "data science"],
            "prior_experience": ["Summer research intern, county health department"],
            "bio": "Public health senior with strong quantitative and communication skills seeking applied research experience before graduation.",
            "profile_complete": True,
            "is_anonymous": False,
        },
    },
    {
        "email": "sam.taylor@student.edu",
        "name": "Sam Taylor",
        "profile": {
            "academic_year": "Freshman",
            "major": "Undecided",
            "skills": ["Excel", "Writing", "Communication", "Basic research"],
            "interests": ["medicine", "science", "research", "biology"],
            "gpa_range": "3.0–3.5",
            "hours_per_week": 4,
            "start_date": "Fall 2026",
            "remote_preference": "hybrid",
            "preferred_domains": ["health sciences", "biology"],
            "bio": "Freshman exploring research opportunities across science and health disciplines. Eager to learn lab and data skills.",
            "profile_complete": True,
            "is_anonymous": False,
        },
    },
    {
        "email": "kuria.githinji@nd.edu",
        "name": "Kuria Githinji",
        "profile": {
            "academic_year": "Masters",
            "major": "Computer Science",
            "skills": [
                "Human-Computer Interaction", "User Research", "Participatory Design",
                "Qualitative Coding", "Python", "Figma", "Survey Design",
                "Mobile Development", "Data Visualization", "JavaScript", "React",
            ],
            "interests": [
                "Human-Computer Interaction", "Social Computing", "Online Safety", "Digital Youth",
            ],
            "gpa_range": "3.5–3.8",
            "hours_per_week": 10,
            "start_date": "Fall 2026",
            "remote_preference": "hybrid",
            "preferred_domains": [
                "Usable Privacy and Security", "Child Welfare", "Marginalized Populations",
            ],
            "prior_experience": [],
            "bio": (
                "Incoming Computer Science master's student and a first-generation, international "
                "scholar aiming for a PhD. New to formal research but deeply motivated by "
                "human-centered design — built accessible mobile prototypes in coursework and a "
                "campus app supporting student well-being. Eager to join an HCI lab studying "
                "online safety and technology for youth and marginalized communities."
            ),
            "profile_complete": True,
            "is_anonymous": False,
        },
    },
]

# Pre-seeded right swipes: (student_email, project_title)
SWIPES = [
    ("alex.kim@student.edu", "AI-Assisted Early Detection of Sepsis in Emergency Care"),
    ("sofia.rodriguez@student.edu", "Mitochondrial Stress and Exercise Recovery Study"),
]


# ─── Seed logic ───────────────────────────────────────────────────────────────

async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # ── Researchers ──────────────────────────────────────────────────────
        researcher_map: dict[str, tuple] = {}  # email → (User, ResearcherProfile)

        for r in RESEARCHERS:
            existing = (await db.execute(select(User).where(User.email == r["email"]))).scalar_one_or_none()
            if existing:
                rp = (await db.execute(
                    select(ResearcherProfile).where(ResearcherProfile.user_id == existing.id)
                )).scalar_one_or_none()
                if rp:
                    # Update research_areas in case they changed
                    for field, value in r["profile"].items():
                        setattr(rp, field, value)
                    print(f"  [updated] researcher profile: {r['name']}")
                else:
                    rp = ResearcherProfile(user_id=existing.id, **r["profile"])
                    db.add(rp)
                    await db.flush()
                researcher_map[r["email"]] = (existing, rp)
                continue

            user = User(
                email=r["email"],
                name=r["name"],
                hashed_password=_hash(DEMO_PASSWORD),
                role=UserRole.RESEARCHER,
            )
            db.add(user)
            await db.flush()

            rp = ResearcherProfile(user_id=user.id, **r["profile"])
            db.add(rp)
            await db.flush()

            researcher_map[r["email"]] = (user, rp)
            print(f"  [+] created researcher: {r['name']} <{r['email']}>")

        # ── Projects ─────────────────────────────────────────────────────────
        project_map: dict[str, ResearchProject] = {}  # title → ResearchProject

        for email, projects in PROJECTS.items():
            _, rp = researcher_map[email]
            for p in projects:
                existing = (await db.execute(
                    select(ResearchProject).where(ResearchProject.title == p["title"])
                )).scalar_one_or_none()
                if existing:
                    # Update skills in case they changed
                    for field, value in p.items():
                        setattr(existing, field, value)
                    project_map[p["title"]] = existing
                    print(f"  [updated] project: {p['title']}")
                    continue

                project = ResearchProject(researcher_id=rp.id, **p)
                db.add(project)
                await db.flush()

                project_map[p["title"]] = project
                print(f"  [+] created project: {p['title']}")

        # ── Students ─────────────────────────────────────────────────────────
        student_map: dict[str, tuple] = {}  # email → (User, StudentProfile)

        for s in STUDENTS:
            existing = (await db.execute(select(User).where(User.email == s["email"]))).scalar_one_or_none()
            if existing:
                sp = (await db.execute(
                    select(StudentProfile).where(StudentProfile.user_id == existing.id)
                )).scalar_one_or_none()
                if sp:
                    # Always update seed profile to latest values (upsert)
                    for field, value in s["profile"].items():
                        setattr(sp, field, value)
                    print(f"  [updated] student profile: {s['name']}")
                else:
                    sp = StudentProfile(user_id=existing.id, **s["profile"])
                    db.add(sp)
                    await db.flush()
                student_map[s["email"]] = (existing, sp)
                continue

            user = User(
                email=s["email"],
                name=s["name"],
                hashed_password=_hash(DEMO_PASSWORD),
                role=UserRole.STUDENT,
            )
            db.add(user)
            await db.flush()

            sp = StudentProfile(user_id=user.id, **s["profile"])
            db.add(sp)
            await db.flush()

            student_map[s["email"]] = (user, sp)
            print(f"  [+] created student: {s['name']} <{s['email']}>")

        # ── Pre-seeded swipes ─────────────────────────────────────────────────
        for student_email, project_title in SWIPES:
            _, student = student_map.get(student_email, (None, None))
            project = project_map.get(project_title)

            if not student or not project:
                print(f"  [warn] skipping swipe — missing data for {student_email} → {project_title}")
                continue

            existing_match = (await db.execute(
                select(Match).where(
                    Match.student_id == student.id,
                    Match.project_id == project.id,
                )
            )).scalar_one_or_none()

            if existing_match:
                print(f"  [skip] swipe already exists: {student_email} → {project_title}")
                continue

            # Need researcher relationship loaded for compute_compatibility
            from sqlalchemy.orm import selectinload
            proj_with_researcher = (await db.execute(
                select(ResearchProject)
                .where(ResearchProject.id == project.id)
                .options(selectinload(ResearchProject.researcher))
            )).scalar_one()

            score = compute_compatibility(student, proj_with_researcher)
            match = Match(
                student_id=student.id,
                project_id=project.id,
                student_interest=True,
                researcher_interest=False,
                compatibility_score=score,
            )
            db.add(match)
            print(f"  [+] created swipe: {student_email} → {project_title} (score: {score})")

        await db.commit()


async def main() -> None:
    print("ThinkR seed starting…")
    await create_tables()
    await seed()
    print("\nSeed complete.")
    print(f"\nDemo credentials (password: {DEMO_PASSWORD}):")
    print("  Researchers:  annie.karitonze@nd.edu (★ video)  |  elena.ramirez@university.edu")
    print("                marcus.chen@university.edu  |  leo.vasquez@university.edu")
    print("  Students:     kuria.githinji@nd.edu (★ video)  |  alex.kim@student.edu")
    print("                sofia.rodriguez@student.edu  |  jordan.lee@student.edu  |  sam.taylor@student.edu")


if __name__ == "__main__":
    asyncio.run(main())
