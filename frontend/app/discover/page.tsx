"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
import ProjectCard from "@/components/ProjectCard";
import { discoverApi, matchesApi } from "@/lib/api";
import { ResearchProject } from "@/lib/types";

type Tab = "recommended" | "interested" | "passed";

// ── Skeleton loader ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl flex overflow-hidden animate-pulse">
      <div className="flex-1 p-5 flex gap-4">
        <div className="w-11 h-11 rounded-xl bg-slate-100 flex-shrink-0" />
        <div className="flex-1 space-y-3 py-0.5">
          <div className="h-3.5 bg-slate-100 rounded w-1/2" />
          <div className="h-3   bg-slate-100 rounded w-1/3" />
          <div className="flex gap-2 mt-1">
            {[60, 80, 56].map((w) => (
              <div key={w} className="h-5 bg-slate-100 rounded-full" style={{ width: w }} />
            ))}
          </div>
          <div className="h-3 bg-slate-100 rounded w-full" />
          <div className="h-3 bg-slate-100 rounded w-4/5" />
          <div className="flex gap-2 mt-2">
            {[52, 64, 48].map((w) => (
              <div key={w} className="h-5 bg-slate-100 rounded-full" style={{ width: w }} />
            ))}
          </div>
        </div>
      </div>
      <div className="w-[116px] bg-slate-100 rounded-r-2xl" />
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyState({ tab }: { tab: Tab }) {
  const content = {
    recommended: {
      icon: "🎓",
      title: "You've seen everything!",
      body: "Check back later for new opportunities, or update your profile to broaden your pool.",
    },
    interested: {
      icon: "💡",
      title: "No interests yet",
      body: "Hit Interested on any project and it will appear here.",
    },
    passed: {
      icon: "📋",
      title: "Nothing passed yet",
      body: "Projects you pass will be saved here.",
    },
  } as const;

  const { icon, title, body } = content[tab];

  return (
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-semibold text-slate-800 text-sm mb-2">{title}</h3>
      <p className="text-xs text-slate-500 max-w-xs leading-relaxed">{body}</p>
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────

function TabButton({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 h-full text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? "border-brand-600 text-brand-600"
          : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span
          className={`min-w-[18px] h-[18px] inline-flex items-center justify-center rounded-full text-[10px] font-bold px-1 ${
            active ? "bg-brand-600 text-white" : "bg-slate-800 text-white"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

// ── Filter chip ────────────────────────────────────────────────────────────────

function FilterChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-brand-600 text-white border-brand-600"
          : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
      }`}
    >
      {children}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const [activeTab, setActiveTab]   = useState<Tab>("recommended");
  const [projects, setProjects]     = useState<ResearchProject[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filters, setFilters]       = useState({ remoteOnly: false, maxHours: "", domain: "" });
  const [swiped, setSwiped]         = useState<Record<string, "left" | "right">>({});
  const [toast, setToast]           = useState<{ text: string; match: boolean } | null>(null);

  // ── Data loading ─────────────────────────────────────────────────────────────

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filters.remoteOnly)     params.remote_only = true;
      if (filters.maxHours)       params.max_hours   = Number(filters.maxHours);
      if (filters.domain.trim())  params.domain      = filters.domain.trim();
      const { data } = await discoverApi.getProjects(params);
      setProjects(data);
    } finally {
      setLoading(false);
    }
  }, [filters.remoteOnly, filters.maxHours, filters.domain]);

  useEffect(() => {
    if (activeTab === "recommended") {
      loadProjects();
    } else {
      setLoading(false);
    }
  }, [activeTab, loadProjects]);

  // ── Swipe handler ─────────────────────────────────────────────────────────────

  const handleSwipe = useCallback(
    async (projectId: string, direction: "left" | "right") => {
      setSwiped((prev) => ({ ...prev, [projectId]: direction }));
      setToast({
        text:  direction === "right" ? "Interested! ✓" : "Passed",
        match: direction === "right",
      });
      setTimeout(() => setToast(null), 1400);
      try {
        await matchesApi.swipe(projectId, direction);
      } catch {
        // silent — could show retry toast in production
      }
    },
    []
  );

  // ── Derived lists ─────────────────────────────────────────────────────────────

  const swipedIds      = new Set(Object.keys(swiped));
  const recommended    = projects.filter((p) => !swipedIds.has(p.id));
  const interestedList = projects.filter((p) => swiped[p.id] === "right");
  const passedList     = projects.filter((p) => swiped[p.id] === "left");

  const currentList =
    activeTab === "recommended" ? recommended
    : activeTab === "interested" ? interestedList
    : passedList;

  const hasFilter = filters.remoteOnly || !!filters.maxHours || !!filters.domain;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center h-14 gap-1">
            {/* Brand label */}
            <span className="text-[11px] font-bold text-slate-900 tracking-widest uppercase mr-2 flex-shrink-0">
              Research
            </span>
            <span className="text-slate-300 mr-3 text-sm">›</span>

            <TabButton
              label="Recommended"
              active={activeTab === "recommended"}
              onClick={() => setActiveTab("recommended")}
            />
            <TabButton
              label="Interested"
              active={activeTab === "interested"}
              count={interestedList.length}
              onClick={() => setActiveTab("interested")}
            />
            <TabButton
              label="Passed"
              active={activeTab === "passed"}
              count={passedList.length}
              onClick={() => setActiveTab("passed")}
            />

            {/* Search */}
            <div className="ml-auto relative flex-shrink-0">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs pointer-events-none">
                🔍
              </span>
              <input
                type="text"
                placeholder="Search domain or keyword…"
                value={filters.domain}
                onChange={(e) => setFilters((f) => ({ ...f, domain: e.target.value }))}
                className="border border-slate-200 rounded-xl bg-slate-50 pl-8 pr-4 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:border-brand-400 w-56 transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter chips ── */}
      <div className="bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center gap-2 flex-wrap">
          <FilterChip
            active={filters.remoteOnly}
            onClick={() => setFilters((f) => ({ ...f, remoteOnly: !f.remoteOnly }))}
          >
            🌐 Remote only{filters.remoteOnly ? " ✓" : ""}
          </FilterChip>

          {/* Max hours — inline number input chip */}
          <label
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium border cursor-text transition-all ${
              filters.maxHours
                ? "border-brand-400 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            ⏱ Max&nbsp;
            <input
              type="number"
              min={1}
              max={40}
              placeholder="any"
              value={filters.maxHours}
              onChange={(e) => setFilters((f) => ({ ...f, maxHours: e.target.value }))}
              className="w-9 bg-transparent outline-none font-semibold text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            {filters.maxHours && <span className="text-slate-400">h/wk</span>}
          </label>

          {hasFilter && (
            <button
              onClick={() => setFilters({ remoteOnly: false, maxHours: "", domain: "" })}
              className="text-xs text-brand-600 font-medium hover:text-brand-700 ml-1 transition-colors"
            >
              Clear all
            </button>
          )}

          {!loading && activeTab === "recommended" && (
            <span className="ml-auto text-xs text-slate-400">
              {recommended.length} opportunit{recommended.length !== 1 ? "ies" : "y"}
            </span>
          )}
        </div>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-fade-in">
          <div
            className={`px-5 py-2.5 rounded-full text-sm font-semibold text-white shadow-lg ${
              toast.match ? "bg-match" : "bg-slate-500"
            }`}
          >
            {toast.text}
          </div>
        </div>
      )}

      {/* ── Project list ── */}
      <main className="flex-1 py-6">
        <div className="max-w-4xl mx-auto px-6 space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          ) : currentList.length === 0 ? (
            <EmptyState tab={activeTab} />
          ) : (
            currentList.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                mode={activeTab === "recommended" ? "discover" : activeTab}
                onPass={() => handleSwipe(project.id, "left")}
                onInterest={() => handleSwipe(project.id, "right")}
              />
            ))
          )}
        </div>
      </main>
    </div>
  );
}
