"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import MatchPanel from "@/components/MatchPanel";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import { matchesApi, researchersApi, studentsApi } from "@/lib/api";
import { ResearchProject, StudentProfile } from "@/lib/types";

const TIER_STYLES: Record<string, string> = {
  green: "bg-green-100 text-green-800",
  blue: "bg-blue-100 text-blue-800",
  yellow: "bg-amber-100 text-amber-800",
  gray: "bg-slate-100 text-slate-600",
};

export default function StudentBrowsePage() {
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [passedIds, setPassedIds] = useState<Set<string>>(new Set());
  const [openScoreId, setOpenScoreId] = useState<string | null>(null);

  useEffect(() => {
    researchersApi.listMyProjects().then((res) => {
      const active = (res.data as ResearchProject[]).filter((p) => p.is_active);
      setProjects(active);
      const first = active[0]?.id ?? "";
      setSelectedProject(first);
      fetchStudents(first);
    });
  }, []);

  function fetchStudents(projectId: string) {
    setLoading(true);
    studentsApi
      .listStudents(projectId ? { project_id: projectId } : {})
      .then((res) => setStudents(res.data))
      .finally(() => setLoading(false));
  }

  function handleProjectChange(id: string) {
    setSelectedProject(id);
    setPassedIds(new Set());
    fetchStudents(id);
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }

  async function sendRequest(studentId: string) {
    if (!selectedProject) return;
    try {
      await matchesApi.professorRequest(studentId, selectedProject);
      setSentIds((prev) => new Set([...prev, studentId]));
      showToast("Request sent 👍", true);
    } catch (err: any) {
      showToast(err.response?.data?.detail || "Failed to send request", false);
    }
  }

  const visible = students.filter((s) => !passedIds.has(s.id));
  const selected = projects.find((p) => p.id === selectedProject);

  const rightRail = (
    <div className="space-y-4">
      <div className="job-card !p-5">
        <p className="mb-3 text-sm font-semibold text-slate-700">Match tiers</p>
        <div className="space-y-2 text-xs">
          {[
            { color: "green", label: "Strong Match", range: "≥ 85" },
            { color: "blue", label: "Good Match", range: "65–84" },
            { color: "yellow", label: "Partial Match", range: "40–64" },
            { color: "gray", label: "Low Match", range: "< 40" },
          ].map((t) => (
            <div key={t.color} className="flex items-center justify-between">
              <span className={`rounded-full px-2 py-0.5 font-medium ${TIER_STYLES[t.color]}`}>{t.label}</span>
              <span className="text-slate-400">{t.range}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="job-card !p-5">
        <p className="text-sm font-semibold text-slate-700">Tip</p>
        <p className="mt-1 text-xs text-slate-400">
          Click <span className="font-medium text-brand-600">Why?</span> on any candidate to see the full score breakdown.
        </p>
      </div>
    </div>
  );

  const projectSelector = projects.length > 0 && (
    <div className="filter-pill !py-1.5">
      <span className="text-slate-400">Match for:</span>
      <select
        value={selectedProject}
        onChange={(e) => handleProjectChange(e.target.value)}
        className="max-w-[220px] truncate bg-transparent font-semibold text-slate-800 focus:outline-none"
      >
        {projects.map((p) => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>
    </div>
  );

  return (
    <AppShell title="Students" actions={projectSelector} right={rightRail}>
      <p className="mb-4 text-sm text-slate-500">
        Candidates ranked by compatibility{selected ? ` with “${selected.title}”` : ""}. Pass or send a request.
      </p>

      {loading ? (
        <p className="animate-pulse text-sm text-slate-400">Loading students…</p>
      ) : visible.length === 0 ? (
        <div className="job-card space-y-2 py-16 text-center">
          <p className="font-medium text-slate-500">
            {students.length === 0 ? "No public student profiles yet." : "You've reviewed everyone!"}
          </p>
          {passedIds.size > 0 && (
            <button onClick={() => setPassedIds(new Set())} className="text-xs text-brand-600 hover:underline">
              Reset dismissed profiles
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((s) => {
            const isSent = sentIds.has(s.id);
            return (
              <div key={s.id} className="job-card flex items-stretch gap-5">
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="text-lg font-bold text-brand-900">{s.user?.name ?? "Anonymous"}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {[s.academic_year, s.major].filter(Boolean).join(" · ")}
                    {s.hours_per_week != null && ` · ${s.hours_per_week}h/wk · ${s.remote_preference ?? "flexible"}`}
                  </p>
                  {s.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.skills.slice(0, 7).map((sk) => (
                        <span key={sk} className="tag text-xs">{sk}</span>
                      ))}
                      {s.skills.length > 7 && (
                        <span className="text-xs text-slate-400">+{s.skills.length - 7}</span>
                      )}
                    </div>
                  )}
                  {s.bio && <p className="mt-2 line-clamp-2 text-sm text-slate-500">{s.bio}</p>}

                  {s.score_breakdown && s.score_breakdown.length > 0 && (
                    <button
                      onClick={() => setOpenScoreId((id) => (id === s.id ? null : s.id))}
                      className="mt-2 self-start text-xs font-semibold text-brand-600 hover:underline"
                    >
                      {openScoreId === s.id ? "Hide breakdown ▲" : "Why? ▼"}
                    </button>
                  )}
                  {openScoreId === s.id && s.score_breakdown && (
                    <div className="mt-2 animate-fadeIn rounded-xl bg-slate-50 p-3">
                      <ScoreBreakdown breakdown={s.score_breakdown} />
                    </div>
                  )}

                  <div className="mt-auto flex gap-2 pt-4">
                    {isSent ? (
                      <span className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-2 text-sm font-medium text-green-700">
                        ✓ Request sent
                      </span>
                    ) : (
                      <>
                        <button onClick={() => setPassedIds((p) => new Set([...p, s.id]))} className="btn-secondary !px-5 !py-2 text-sm">
                          Pass
                        </button>
                        <button onClick={() => sendRequest(s.id)} disabled={!selectedProject} className="btn-primary !px-5 !py-2 text-sm">
                          Send request ✓
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {s.compatibility_score != null && s.tier && (
                  <MatchPanel score={s.compatibility_score} tier={s.tier} ringSize={78} className="w-40 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl px-5 py-3 text-sm text-white shadow-lg ${
            toast.ok ? "bg-brand-900" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </AppShell>
  );
}
