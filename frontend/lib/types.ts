// ─── Auth ─────────────────────────────────────────────────────────────────────

export type UserRole = "student" | "researcher";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface AuthState {
  token: string | null;
  user: User | null;
}

// ─── Student ──────────────────────────────────────────────────────────────────

export interface StudentProfile {
  id: string;
  user_id: string;
  academic_year: string | null;
  major: string | null;
  skills: string[];
  interests: string[];
  gpa_range: string | null;
  hours_per_week: number | null;
  start_date: string | null;
  remote_preference: "remote" | "in-person" | "hybrid" | null;
  preferred_domains: string[];
  bio: string | null;
  resume_url: string | null;
  is_anonymous: boolean;
  profile_complete: boolean;
  created_at: string;
  user?: User;
}

export interface IngestResult {
  academic_year: string | null;
  major: string | null;
  skills: string[];
  interests: string[];
  gpa_range: string | null;
  prior_experience: string[];
  summary: string | null;
}

// ─── Researcher ───────────────────────────────────────────────────────────────

export interface ResearcherProfile {
  id: string;
  user_id: string;
  department: string | null;
  lab_name: string | null;
  title: string | null;
  institution: string | null;
  research_areas: string[];
  bio: string | null;
  created_at: string;
  user?: User;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface ResearchProject {
  id: string;
  researcher_id: string;
  title: string;
  description_plain: string;
  required_skills: string[];
  preferred_skills: string[];
  hours_per_week: number | null;
  start_date: string | null;
  duration: string | null;
  min_academic_year: string | null;
  remote_option: boolean;
  is_active: boolean;
  created_at: string;
  researcher?: ResearcherProfile;
  compatibility_score?: number;
}

// ─── Match ────────────────────────────────────────────────────────────────────

export type MatchStatus = "Pending" | "Matched" | "Contacted" | "Closed";

export interface Match {
  id: string;
  student_id: string;
  project_id: string;
  student_interest: boolean;
  researcher_interest: boolean;
  is_mutual: boolean;
  status: MatchStatus;
  compatibility_score: number | null;
  created_at: string;
  updated_at: string;
  project?: ResearchProject;
}

// ─── Message ──────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: User;
}
