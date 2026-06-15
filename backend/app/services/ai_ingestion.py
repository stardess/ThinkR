import json
import re
from typing import Optional

import httpx
from app.config import settings
from app.schemas import IngestResult


SYSTEM_PROMPT = """You are an academic profile parser. Extract structured information from student-provided text (resume, transcript, or free-form description).

Return a single JSON object with ONLY these fields:
{
  "academic_year": one of ["Freshman", "Sophomore", "Junior", "Senior", "Masters", "PhD"] or null,
  "major": string or null,
  "skills": array of concise skill strings (e.g. ["Python", "Machine Learning", "R", "Statistics"]),
  "interests": array of research interest strings (e.g. ["computational biology", "NLP", "climate modeling"]),
  "gpa_range": one of ["Below 3.0", "3.0–3.5", "3.5–3.8", "3.8+"] or null,
  "prior_experience": array of brief experience strings,
  "summary": one-sentence plain-language summary of the student
}

Rules:
- Be generous with skills extraction — include programming languages, tools, methodologies, and domain knowledge.
- Infer interests from coursework, projects, and experience if not explicitly stated.
- Do NOT include PII beyond what is needed for matching (no SSN, phone numbers, addresses).
- Output ONLY the JSON object. No explanation, no markdown fences.
"""


async def ingest_student_text(text: str) -> IngestResult:
    """
    Send student-provided text to the OpenAI API and parse it into a structured
    IngestResult. Falls back to an empty result if the API key is not configured.
    """
    if not settings.OPENAI_API_KEY:
        # Graceful degradation — return empty result so the student can fill manually.
        return IngestResult()

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": "gpt-4o-mini",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                "temperature": 0.2,
                "max_tokens": 800,
            },
        )
        response.raise_for_status()
        data = response.json()

    raw = data["choices"][0]["message"]["content"].strip()

    # Strip any accidental markdown fences
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    parsed = json.loads(raw)
    return IngestResult(**parsed)


async def ingest_resume_file(file_bytes: bytes, filename: str) -> str:
    """
    Extract text from an uploaded file (PDF/DOCX). In production, integrate a
    document parsing service (e.g. AWS Textract, PyMuPDF). Here we return the
    raw bytes decoded as utf-8 (works for plain-text uploads in development).
    """
    try:
        return file_bytes.decode("utf-8", errors="ignore")
    except Exception:
        return ""
