"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { matchesApi, researchersApi, studentsApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Match, ResearchProject, StudentProfile } from "@/lib/types";

function MatchStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Pending: "bg-yellow-50 text-yellow-700",
    Matched: "bg-emerald-50 text-emerald-700",
    Contacted: "bg-sky-50 text-sky-700",
    Closed: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${colors[status] || colors.Pending}`}>
      {status}
    </span>
  );
}

// ─── Student Dashboard ────────────────────────────────────────────────────────

function StudentDashboard() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([studentsApi.getMyProfile(), matchesApi.listMatches()])
      .then(([pRes, mRes]) => {
        setProfile(pRes.data);
        setMatches(mRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading…</div>;

  const completionFields = [
    profile?.skills?.length,
    profile?.interests?.length,
    profile?.major,
    profile?.academic_year,
    profile?.bio,
    profile?.hours_per_week,
  ];
  const completionPct = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100
  );

  const mutualMatches = matches.filter((m) => m.is_mutual);
  const pendingMatches = matches.filter((m) => !m.is_mutual && m.student_interest);

  return (
    <div className="space-y-8">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-extrabold text-brand-900">{matches.length}</div>
          <div className="text-xs text-slate-500 mt-1">Total swipes</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-extrabold text-match">{mutualMatches.length}</div>
          <div className="text-xs text-slate-500 mt-1">Mutual matches</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-extrabold text-brand-600">{completionPct}%</div>
          <div className="text-xs text-slate-500 mt-1">Profile complete</div>
        </div>
      </div>

      {/* Profile completion bar */}
      {completionPct < 100 && (
        <div className="card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">Profile completeness</span>
            <span className="text-sm text-brand-600 font-semibold">{completionPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-brand-600 transition-all"
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Complete your profile to improve your match quality.{" "}
            <Link href="/profile" className="text-brand-600 underline">
              Edit profile →
            </Link>
          </p>
        </div>
      )}

      {/* CTA to discover */}
      <div className="flex items-center gap-4">
        <Link href="/discover" className="btn-primary">
          Browse new opportunities →
        </Link>
      </div>

      {/* Mutual matches */}
      <div>
        <h2 className="text-lg font-bold text-brand-900 mb-4">
          Mutual matches{" "}
          {mutualMatches.length > 0 && (
            <span className="ml-1 inline-flex items-center rounded-full bg-match text-white text-xs px-2 py-0.5">
              {mutualMatches.length}
            </span>
          )}
        </h2>
        {mutualMatches.length === 0 ? (
          <p className="text-sm text-slate-400">No mutual matches yet — keep swiping!</p>
        ) : (
          <div className="space-y-3">
            {mutualMatches.map((m) => (
              <Link
                key={m.id}
                href={`/matches/${m.id}`}
                className="card flex items-center justify-between hover:shadow-card-hover transition-shadow"
              >
                <div>
                  <p className="font-semibold text-brand-900">{m.project?.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {m.project?.researcher?.lab_name || m.project?.researcher?.department}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <MatchStatusBadge status={m.status} />
                  <span className="text-brand-600 text-sm">Chat →</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pending (waiting for researcher) */}
      {pendingMatches.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-brand-900 mb-4">Waiting for response</h2>
          <div className="space-y-3">
            {pendingMatches.map((m) => (
              <div key={m.id} className="card flex items-center justify-between opacity-70">
                <div>
                  <p className="font-semibold text-brand-900">{m.project?.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {m.project?.researcher?.lab_name}
                  </p>
                </div>
                <MatchStatusBadge status="Pending" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Researcher Dashboard ─────────────────────────────────────────────────────

function ResearcherDashboard() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([researchersApi.listMyProjects(), matchesApi.listMatches()])
      .then(([pRes, mRes]) => {
        setProjects(pRes.data);
        setMatches(mRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggleProject(id: string) {
    await researchersApi.toggleProject(id);
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  }

  if (loading) return <div className="text-slate-400 text-sm animate-pulse p-8">Loading…</div>;

  const interestedStudents = matches.filter((m) => m.student_interest && !m.researcher_interest);
  const mutualMatches = matches.filter((m) => m.is_mutual);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center">
          <div className="text-3xl font-extrabold text-brand-900">{projects.filter((p) => p.is_active).length}</div>
          <div className="text-xs text-slate-500 mt-1">Active projects</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-extrabold text-sky-500">{interestedStudents.length}</div>
          <div className="text-xs text-slate-500 mt-1">Students interested</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-extrabold text-match">{mutualMatches.length}</div>
          <div className="text-xs text-slate-500 mt-1">Mutual matches</div>
        </div>
      </div>

      {/* Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-brand-900">Your projects</h2>
          <Link href="/onboarding/researcher" className="btn-primary py-2 px-4 text-sm">
            + New project
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="text-sm text-slate-400">
            No projects yet.{" "}
            <Link href="/onboarding/researcher" className="text-brand-600 underline">
              Create your first one →
            </Link>
          </p>
        ) : (
          <div className="space-y-3">
            {projects.map((p) => (
              <div key={p.id} className="card flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-brand-900 truncate">{p.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{p.description_plain}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.required_skills.slice(0, 4).map((s) => (
                      <span key={s} className="tag text-xs">{s}</span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => toggleProject(p.id)}
                  className={`flex-shrink-0 rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    p.is_active
                      ? "bg-emerald-50 text-emerald-700 hover:bg-red-50 hover:text-red-600"
                      : "bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                  }`}
                >
                  {p.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Interested students queue */}
      {interestedStudents.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-brand-900 mb-4">Students who swiped right</h2>
          <div className="space-y-3">
            {interestedStudents.map((m) => (
              <div key={m.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold text-brand-900">
                    {m.project?.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Compatibility: {m.compatibility_score ?? "—"}%
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-icon w-10 h-10 bg-pass/10 text-pass hover:bg-pass/20"
                    aria-label="Pass"
                    onClick={async () => {
                      await matchesApi.researcherSwipe(m.id, "left");
                      setMatches((prev) => prev.filter((x) => x.id !== m.id));
                    }}
                  >
                    ✕
                  </button>
                  <button
                    className="btn-icon w-10 h-10 bg-match/10 text-match hover:bg-match/20"
                    aria-label="Interested"
                    onClick={async () => {
                      const { data } = await matchesApi.researcherSwipe(m.id, "right");
                      setMatches((prev) => prev.map((x) => (x.id === m.id ? data : x)));
                    }}
                  >
                    ✓
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mutual matches */}
      {mutualMatches.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-brand-900 mb-4">Mutual matches</h2>
          <div className="space-y-3">
            {mutualMatches.map((m) => (
              <Link
                key={m.id}
                href={`/matches/${m.id}`}
                className="card flex items-center justify-between hover:shadow-card-hover transition-shadow"
              >
                <p className="font-semibold text-brand-900">{m.project?.title}</p>
                <span className="text-brand-600 text-sm">Chat →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const user = getUser();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-10">
        <h1 className="text-2xl font-bold text-brand-900 mb-8">
          {user?.role === "student" ? "Student" : "Researcher"} Dashboard
        </h1>
        {user?.role === "student" ? <StudentDashboard /> : <ResearcherDashboard />}
      </main>
    </div>
  );
}
