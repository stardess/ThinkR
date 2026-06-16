"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/AppShell";
import SwipeCard from "@/components/SwipeCard";
import { discoverApi, matchesApi } from "@/lib/api";
import { ResearchProject } from "@/lib/types";

export default function DiscoverPage() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ remoteOnly: false, maxHours: "" });
  const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);

  async function loadProjects() {
    setLoading(true);
    try {
      const params: Record<string, unknown> = {};
      if (filters.remoteOnly) params.remote_only = true;
      if (filters.maxHours) params.max_hours = Number(filters.maxHours);
      const { data } = await discoverApi.getProjects(params);
      setProjects(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, [filters.remoteOnly, filters.maxHours]);

  const handleSwipe = useCallback(
    async (direction: "left" | "right") => {
      const top = projects[0];
      if (!top) return;
      setProjects((prev) => prev.slice(1));
      setFeedback(
        direction === "right"
          ? { text: "Interested! 🎉", color: "text-match" }
          : { text: "Passed", color: "text-slate-400" }
      );
      setTimeout(() => setFeedback(null), 1200);
      try {
        await matchesApi.swipe(top.id, direction);
      } catch {
        /* ignore */
      }
    },
    [projects]
  );

  const topThree = projects.slice(0, 3);

  const rightRail = (
    <div className="space-y-4">
      <div className="job-card !p-5 space-y-4">
        <p className="text-sm font-semibold text-slate-700">Filters</p>
        <label className="flex cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-brand-600"
            checked={filters.remoteOnly}
            onChange={(e) => setFilters({ ...filters, remoteOnly: e.target.checked })}
          />
          <span className="text-sm text-slate-700">Remote only</span>
        </label>
        <div>
          <label className="label">Max hours / week</label>
          <input
            type="number"
            min={1}
            max={40}
            className="input !py-2"
            placeholder="Any"
            value={filters.maxHours}
            onChange={(e) => setFilters({ ...filters, maxHours: e.target.value })}
          />
        </div>
        <button className="btn-secondary w-full !py-2 text-sm" onClick={() => setFilters({ remoteOnly: false, maxHours: "" })}>
          Clear filters
        </button>
      </div>
      <div className="job-card !p-5">
        <p className="text-xs text-slate-400">
          <span className="font-semibold text-slate-600">← →</span> arrow keys, drag, or the buttons all swipe.
          Tap <span className="font-semibold text-brand-600">Why NN% match?</span> on a card to see the breakdown.
        </p>
      </div>
    </div>
  );

  return (
    <AppShell title="Discover" right={rightRail} contentClassName="flex flex-col items-center justify-center">
      {loading ? (
        <p className="animate-pulse text-sm text-slate-400">Loading opportunities…</p>
      ) : projects.length === 0 ? (
        <div className="job-card max-w-sm text-center">
          <div className="mb-4 text-4xl">🎓</div>
          <h3 className="mb-2 font-semibold text-brand-900">You&apos;ve seen everything!</h3>
          <p className="text-sm text-slate-500">
            Check back later for new research opportunities, or adjust your filters to broaden the pool.
          </p>
        </div>
      ) : (
        <div className="flex w-full flex-col items-center">
          {feedback && (
            <div className={`pointer-events-none absolute top-2 text-lg font-bold ${feedback.color}`}>
              {feedback.text}
            </div>
          )}
          <div className="relative w-full max-w-sm" style={{ height: 540 }}>
            {topThree.map((project, i) => (
              <SwipeCard
                key={project.id}
                project={project}
                isTop={i === 0}
                stackIndex={i}
                onSwipe={i === 0 ? handleSwipe : () => {}}
              />
            ))}
          </div>
          <div className="mt-8 flex items-center gap-6">
            <button
              aria-label="Pass"
              className="btn-icon h-16 w-16 border border-slate-200 bg-white text-2xl text-pass shadow-card hover:scale-110"
              onClick={() => handleSwipe("left")}
            >
              ✕
            </button>
            <button
              aria-label="Interested"
              className="btn-icon h-20 w-20 bg-brand-600 text-3xl text-white shadow-card hover:scale-110"
              onClick={() => handleSwipe("right")}
            >
              ✓
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            {projects.length} opportunit{projects.length === 1 ? "y" : "ies"} remaining
          </p>
        </div>
      )}
    </AppShell>
  );
}
