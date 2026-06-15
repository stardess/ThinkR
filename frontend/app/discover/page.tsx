"use client";

import { useEffect, useState, useCallback } from "react";
import Navbar from "@/components/Navbar";
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

      // Optimistically remove from stack
      setProjects((prev) => prev.slice(1));

      if (direction === "right") {
        setFeedback({ text: "Interested! 🎉", color: "text-match" });
      } else {
        setFeedback({ text: "Passed", color: "text-slate-400" });
      }
      setTimeout(() => setFeedback(null), 1200);

      try {
        await matchesApi.swipe(top.id, direction);
      } catch {
        // Silently fail — could show a toast in production
      }
    },
    [projects]
  );

  const topThree = projects.slice(0, 3);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar filters */}
        <aside className="hidden lg:flex flex-col gap-5 w-64 flex-shrink-0 border-r border-slate-100 bg-white px-6 py-8">
          <h2 className="font-semibold text-sm text-slate-500 uppercase tracking-wider">Filters</h2>

          <label className="flex items-center gap-3 cursor-pointer">
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
              className="input"
              placeholder="Any"
              value={filters.maxHours}
              onChange={(e) => setFilters({ ...filters, maxHours: e.target.value })}
            />
          </div>

          <button
            className="btn-secondary text-sm py-2"
            onClick={() => setFilters({ remoteOnly: false, maxHours: "" })}
          >
            Clear filters
          </button>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              <span className="font-medium">← →</span> Arrow keys also work to swipe
            </p>
          </div>
        </aside>

        {/* Main swipe area */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
          {loading ? (
            <div className="text-slate-400 text-sm animate-pulse">Loading opportunities…</div>
          ) : projects.length === 0 ? (
            <div className="card text-center max-w-sm">
              <div className="text-4xl mb-4">🎓</div>
              <h3 className="font-semibold text-brand-900 mb-2">You&apos;ve seen everything!</h3>
              <p className="text-sm text-slate-500">
                Check back later for new research opportunities, or update your preferences to
                broaden your pool.
              </p>
            </div>
          ) : (
            <>
              {/* Feedback toast */}
              {feedback && (
                <div
                  className={`absolute top-8 text-lg font-bold ${feedback.color} pointer-events-none transition-opacity`}
                >
                  {feedback.text}
                </div>
              )}

              {/* Card stack */}
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

              {/* Action buttons */}
              <div className="flex items-center gap-6 mt-8">
                <button
                  aria-label="Pass"
                  className="btn-icon w-16 h-16 bg-white shadow-card text-pass text-2xl hover:scale-110 border border-slate-100"
                  onClick={() => handleSwipe("left")}
                >
                  ✕
                </button>
                <button
                  aria-label="Interested"
                  className="btn-icon w-20 h-20 bg-brand-600 shadow-card text-white text-3xl hover:scale-110"
                  onClick={() => handleSwipe("right")}
                >
                  ✓
                </button>
              </div>

              <p className="mt-4 text-xs text-slate-400">
                {projects.length} opportunit{projects.length === 1 ? "y" : "ies"} remaining
              </p>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
