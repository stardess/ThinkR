"use client";

import { ResearchProject } from "@/lib/types";

interface Props {
  project: ResearchProject;
  mode?: "discover" | "interested" | "passed";
  onPass?: () => void;
  onInterest?: () => void;
}

const AVATAR_COLORS = [
  "#6366f1", "#0ea5e9", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#14b8a6", "#ec4899",
];

function avatarColor(name: string): string {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const words = name.replace(/[^A-Za-z ]/g, "").trim().split(/\s+/);
  return words
    .slice(0, 2)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase() || "RL";
}

function scoreInfo(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "STRONG MATCH", color: "#10b981" };
  if (score >= 60) return { label: "GOOD MATCH",   color: "#38bdf8" };
  if (score >= 40) return { label: "FAIR MATCH",   color: "#f59e0b" };
  return               { label: "LOW MATCH",    color: "#64748b" };
}

const RING_R    = 26;
const RING_CIRC = 2 * Math.PI * RING_R;

export default function ProjectCard({ project, mode = "discover", onPass, onInterest }: Props) {
  const researcher = project.researcher;
  const labName  = researcher?.lab_name || researcher?.department || "Research Lab";
  const bgColor  = avatarColor(labName);
  const initials = getInitials(labName);

  const score      = project.compatibility_score;
  const info       = score !== undefined ? scoreInfo(score) : null;
  const ringOffset = score !== undefined ? RING_CIRC - (score / 100) * RING_CIRC : RING_CIRC;

  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-card transition-all duration-200 flex overflow-hidden">

      {/* ── Main content ── */}
      <div className="flex-1 p-5 flex gap-4 min-w-0">

        {/* Lab avatar */}
        <div
          className="w-11 h-11 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-xs tracking-wide"
          style={{ backgroundColor: bgColor }}
        >
          {initials}
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0">

          {/* Title + meta */}
          <h3 className="font-semibold text-slate-900 text-sm leading-snug">
            {project.title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {researcher?.user?.name ?? "Professor"}
            {researcher?.institution ? ` · ${researcher.institution}` : ""}
            {researcher?.department  ? ` / ${researcher.department}`  : ""}
          </p>

          {/* Research area chips */}
          {researcher?.research_areas && researcher.research_areas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {researcher.research_areas.slice(0, 3).map((area) => (
                <span key={area} className="tag-green">{area}</span>
              ))}
              {researcher.research_areas.length > 3 && (
                <span className="tag-green">+{researcher.research_areas.length - 3}</span>
              )}
            </div>
          )}

          {/* Description */}
          <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
            {project.description_plain}
          </p>

          {/* Detail row */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
            <span>{project.remote_option ? "🌐 Remote" : "🏫 On-site"}</span>
            {project.hours_per_week    && <span>⏱ {project.hours_per_week}h / week</span>}
            {project.min_academic_year && <span>🎓 {project.min_academic_year}+</span>}
            {project.duration          && <span>📅 {project.duration}</span>}
          </div>

          {/* Required skills */}
          {project.required_skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {project.required_skills.slice(0, 6).map((s) => (
                <span key={s} className="tag">{s}</span>
              ))}
              {project.required_skills.length > 6 && (
                <span className="tag">+{project.required_skills.length - 6} more</span>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
            {mode === "discover" && (
              <>
                <button
                  onClick={onPass}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-500 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <span className="text-pass font-bold">✕</span> Pass
                </button>
                <button
                  onClick={onInterest}
                  className="flex items-center gap-1.5 px-5 py-1.5 rounded-xl text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-sm"
                >
                  <span>✓</span> Interested
                </button>
              </>
            )}

            {mode === "interested" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-match bg-emerald-50 px-3 py-1.5 rounded-full">
                ✓ You expressed interest
              </span>
            )}

            {mode === "passed" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full">
                Passed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Match score panel ── */}
      {score !== undefined && (
        <div className="w-[116px] flex-shrink-0 bg-[#0B1929] rounded-r-2xl flex flex-col items-center justify-center gap-2 p-4">
          {/* Ring */}
          <div className="relative w-16 h-16">
            <svg
              width="64" height="64" viewBox="0 0 64 64"
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx="32" cy="32" r={RING_R}
                fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5"
              />
              <circle
                cx="32" cy="32" r={RING_R}
                fill="none"
                stroke={info?.color ?? "#64748b"}
                strokeWidth="5"
                strokeDasharray={RING_CIRC}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-white font-bold text-base leading-none">
                {Math.round(score)}%
              </span>
            </div>
          </div>

          {/* Label */}
          <span
            className="text-[10px] font-bold text-center leading-tight"
            style={{ color: info?.color ?? "#64748b" }}
          >
            {info?.label}
          </span>
        </div>
      )}
    </div>
  );
}
