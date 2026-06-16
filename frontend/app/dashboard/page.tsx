"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import MatchPanel from "@/components/MatchPanel";
import { matchesApi, researchersApi, studentsApi } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { tierFromScore } from "@/lib/tier";
import { Match, ResearchProject, StudentProfile } from "@/lib/types";

// ─── shared bits ────────────────────────────────────────────────────────────

function ProjectMeta({ p }: { p?: ResearchProject }) {
  if (!p) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {p.remote_option && <span className="meta-item">🌐 Remote OK</span>}
      {p.hours_per_week != null && <span className="meta-item">🕒 {p.hours_per_week}h / week</span>}
      {p.min_academic_year && <span className="meta-item">🎓 {p.min_academic_year}+</span>}
      {p.start_date && <span className="meta-item">📅 {p.start_date}</span>}
    </div>
  );
}

function labOf(p?: ResearchProject) {
  return p?.researcher?.lab_name || p?.researcher?.department || p?.researcher?.institution || "Research Lab";
}

// ─── Student dashboard ───────────────────────────────────────────────────────

function StudentDashboard() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([studentsApi.getMyProfile(), matchesApi.listMatches()])
      .then(([p, m]) => {
        setProfile(p.data);
        setMatches(m.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function respondToRequest(match: Match, accept: boolean) {
    setPendingId(match.id);
    try {
      const { data } = await matchesApi.swipe(match.project_id, accept ? "right" : "left");
      if (accept) {
        setMatches((prev) => prev.map((x) => (x.id === match.id ? { ...x, ...data } : x)));
        setBanner(`🎉 You're matched with ${match.project?.title}! Open the chat to say hi.`);
      } else {
        setMatches((prev) => prev.filter((x) => x.id !== match.id));
        setBanner("Request declined.");
      }
      window.setTimeout(() => setBanner(null), 4000);
    } finally {
      setPendingId(null);
    }
  }

  if (loading) return <p className="animate-pulse p-4 text-sm text-slate-400">Loading…</p>;

  const mutual = matches.filter((m) => m.is_mutual);
  const pending = matches.filter((m) => !m.is_mutual && m.student_interest);
  const incoming = matches.filter((m) => m.researcher_interest && !m.student_interest && !m.is_mutual);

  const fields = [
    profile?.skills?.length, profile?.interests?.length, profile?.major,
    profile?.academic_year, profile?.bio, profile?.hours_per_week, profile?.prior_experience?.length,
  ];
  const completion = Math.round((fields.filter(Boolean).length / fields.length) * 100);

  const rightRail = (
    <div className="space-y-4">
      <div className="job-card !p-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Profile strength</span>
          <span className="text-sm font-bold text-brand-600">{completion}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-brand-500 transition-all" style={{ width: `${completion}%` }} />
        </div>
        <p className="mt-3 text-xs text-slate-400">A complete profile improves your match scores.</p>
        <Link href="/profile" className="btn-secondary mt-3 w-full !py-2 text-sm">Edit profile</Link>
      </div>
      <div className="job-card !p-5">
        <p className="text-sm font-semibold text-slate-700">Keep exploring</p>
        <p className="mt-1 text-xs text-slate-400">New opportunities are ranked by fit.</p>
        <Link href="/discover" className="btn-primary mt-3 w-full !py-2 text-sm">Browse opportunities →</Link>
      </div>
    </div>
  );

  return (
    <AppShell
      title="Matches"
      tabs={[
        { label: "All", active: true },
        { label: "Requests", count: incoming.length },
        { label: "Mutual", count: mutual.length },
      ]}
      right={rightRail}
    >
      <div className="space-y-8">
        {banner && (
          <div className="animate-fadeIn rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-800">
            {banner}
          </div>
        )}

        {/* Incoming professor requests */}
        {incoming.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500" />
              </span>
              A researcher reached out · {incoming.length}
            </h2>
            <div className="space-y-3">
              {incoming.map((m) => (
                <div key={m.id} className="job-card flex items-stretch gap-5 border-l-4 border-l-amber-400">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="truncate text-lg font-bold text-brand-900">{m.project?.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {m.project?.researcher?.user?.name || "A researcher"} · {labOf(m.project)} invited you to apply
                    </p>
                    <ProjectMeta p={m.project} />
                    <div className="mt-auto flex gap-2 pt-4">
                      <button
                        disabled={pendingId === m.id}
                        onClick={() => respondToRequest(m, false)}
                        className="btn-secondary !px-5 !py-2 text-sm disabled:opacity-40"
                      >
                        Decline
                      </button>
                      <button
                        disabled={pendingId === m.id}
                        onClick={() => respondToRequest(m, true)}
                        className="btn-primary !px-5 !py-2 text-sm disabled:opacity-40"
                      >
                        Accept ✓
                      </button>
                    </div>
                  </div>
                  {m.compatibility_score != null && (
                    <MatchPanel
                      score={m.compatibility_score}
                      tier={tierFromScore(m.compatibility_score)}
                      ringSize={78}
                      className="w-40 flex-shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Mutual matches */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            Mutual matches{mutual.length > 0 ? ` · ${mutual.length}` : ""}
          </h2>
          {mutual.length === 0 ? (
            <p className="text-sm text-slate-400">No mutual matches yet — keep swiping on Discover!</p>
          ) : (
            <div className="space-y-3">
              {mutual.map((m) => (
                <div key={m.id} className="job-card flex items-stretch gap-5">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-lg font-bold text-brand-900">{m.project?.title}</h3>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        Matched
                      </span>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {m.project?.researcher?.user?.name || "Researcher"} · {labOf(m.project)}
                    </p>
                    <ProjectMeta p={m.project} />
                    <div className="mt-auto pt-4">
                      <Link href={`/matches/${m.id}`} className="btn-primary !px-5 !py-2 text-sm">
                        Open chat →
                      </Link>
                    </div>
                  </div>
                  {m.compatibility_score != null && (
                    <MatchPanel
                      score={m.compatibility_score}
                      tier={tierFromScore(m.compatibility_score)}
                      ringSize={78}
                      className="w-40 flex-shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Waiting for response */}
        {pending.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Waiting for response</h2>
            <div className="space-y-3">
              {pending.map((m) => (
                <div key={m.id} className="job-card flex items-center justify-between gap-5 opacity-80">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-brand-900">{m.project?.title}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{labOf(m.project)}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                    Pending
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}

// ─── Researcher dashboard ────────────────────────────────────────────────────

function ResearcherDashboard() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([researchersApi.listMyProjects(), matchesApi.listMatches()])
      .then(([p, m]) => {
        setProjects(p.data);
        setMatches(m.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function toggleProject(id: string) {
    await researchersApi.toggleProject(id);
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p)));
  }

  if (loading) return <p className="animate-pulse p-4 text-sm text-slate-400">Loading…</p>;

  const interested = matches.filter((m) => m.student_interest && !m.researcher_interest);
  const mutual = matches.filter((m) => m.is_mutual);
  const activeCount = projects.filter((p) => p.is_active).length;

  const rightRail = (
    <div className="space-y-4">
      <div className="job-card !p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-700">At a glance</p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><div className="text-2xl font-extrabold text-brand-900">{activeCount}</div><div className="text-[11px] text-slate-400">Active</div></div>
          <div><div className="text-2xl font-extrabold text-brand-600">{interested.length}</div><div className="text-[11px] text-slate-400">Inbound</div></div>
          <div><div className="text-2xl font-extrabold text-match">{mutual.length}</div><div className="text-[11px] text-slate-400">Matched</div></div>
        </div>
      </div>
      <div className="job-card !p-5 space-y-2">
        <Link href="/dashboard/students" className="btn-primary w-full !py-2 text-sm">Browse students →</Link>
        <Link href="/onboarding/researcher" className="btn-secondary w-full !py-2 text-sm">+ New project</Link>
      </div>
    </div>
  );

  return (
    <AppShell
      title="Dashboard"
      tabs={[
        { label: "Inbound", count: interested.length, active: true },
        { label: "Projects", count: projects.length },
        { label: "Mutual", count: mutual.length },
      ]}
      actions={<Link href="/dashboard/students" className="btn-primary !py-2 !px-4 text-sm">Browse students</Link>}
      right={rightRail}
    >
      <div className="space-y-8">
        {/* Inbound student interest */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
            Students who swiped right{interested.length > 0 ? ` · ${interested.length}` : ""}
          </h2>
          {interested.length === 0 ? (
            <p className="text-sm text-slate-400">No inbound interest yet. Try Browse Students to reach out proactively.</p>
          ) : (
            <div className="space-y-3">
              {interested.map((m) => (
                <div key={m.id} className="job-card flex items-stretch gap-5">
                  <div className="flex min-w-0 flex-1 flex-col">
                    <h3 className="truncate text-lg font-bold text-brand-900">
                      {m.student?.user?.name || "Anonymous student"}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {[m.student?.academic_year, m.student?.major].filter(Boolean).join(" · ") || "Profile hidden"}
                      {" — interested in "}
                      <span className="text-slate-700">{m.project?.title}</span>
                    </p>
                    {m.student?.skills && m.student.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.student.skills.slice(0, 6).map((s) => (
                          <span key={s} className="tag text-xs">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto flex gap-2 pt-4">
                      <button
                        onClick={async () => {
                          await matchesApi.researcherSwipe(m.id, "left");
                          setMatches((prev) => prev.filter((x) => x.id !== m.id));
                        }}
                        className="btn-secondary !px-5 !py-2 text-sm"
                      >
                        Pass
                      </button>
                      <button
                        onClick={async () => {
                          const { data } = await matchesApi.researcherSwipe(m.id, "right");
                          setMatches((prev) => prev.map((x) => (x.id === m.id ? data : x)));
                        }}
                        className="btn-primary !px-5 !py-2 text-sm"
                      >
                        Accept ✓
                      </button>
                    </div>
                  </div>
                  {m.compatibility_score != null && (
                    <MatchPanel
                      score={m.compatibility_score}
                      tier={tierFromScore(m.compatibility_score)}
                      ringSize={78}
                      className="w-40 flex-shrink-0"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Mutual matches */}
        {mutual.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Mutual matches · {mutual.length}</h2>
            <div className="space-y-3">
              {mutual.map((m) => (
                <Link key={m.id} href={`/matches/${m.id}`} className="job-card flex items-center justify-between gap-5">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-brand-900">
                      {m.student?.user?.name || "Student"} · <span className="text-slate-500">{m.project?.title}</span>
                    </h3>
                  </div>
                  <span className="whitespace-nowrap text-sm font-semibold text-brand-600">Open chat →</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Projects */}
        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">Your projects</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-400">
              No projects yet.{" "}
              <Link href="/onboarding/researcher" className="text-brand-600 underline">Create your first one →</Link>
            </p>
          ) : (
            <div className="space-y-3">
              {projects.map((p) => (
                <div key={p.id} className="job-card flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-brand-900">{p.title}</h3>
                    <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{p.description_plain}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.required_skills.slice(0, 5).map((s) => (
                        <span key={s} className="tag text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleProject(p.id)}
                    className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
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
        </section>
      </div>
    </AppShell>
  );
}

export default function DashboardPage() {
  const user = getUser();
  return user?.role === "student" ? <StudentDashboard /> : <ResearcherDashboard />;
}
