"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ResearchProject } from "@/lib/types";

interface SwipeCardProps {
  project: ResearchProject;
  isTop: boolean;
  stackIndex: number; // 0 = top card
  onSwipe: (direction: "left" | "right") => void;
}

const SWIPE_THRESHOLD = 90; // px to trigger a swipe
const MAX_ROTATION = 12; // degrees

export default function SwipeCard({ project, isTop, stackIndex, onSwipe }: SwipeCardProps) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState<"left" | "right" | null>(null);
  const startRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  const rotation = (pos.x / window.innerWidth) * MAX_ROTATION;
  const likeOpacity = Math.min(1, Math.max(0, pos.x / 80));
  const passOpacity = Math.min(1, Math.max(0, -pos.x / 80));

  const triggerSwipe = useCallback(
    (dir: "left" | "right") => {
      setExiting(dir);
      setTimeout(() => onSwipe(dir), 350);
    },
    [onSwipe]
  );

  // Keyboard support
  useEffect(() => {
    if (!isTop) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") triggerSwipe("right");
      if (e.key === "ArrowLeft") triggerSwipe("left");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isTop, triggerSwipe]);

  // Mouse handlers
  function onMouseDown(e: React.MouseEvent) {
    if (!isTop) return;
    setDragging(true);
    startRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging) return;
    setPos({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  }

  function onMouseUp() {
    if (!dragging) return;
    setDragging(false);
    if (Math.abs(pos.x) > SWIPE_THRESHOLD) {
      triggerSwipe(pos.x > 0 ? "right" : "left");
    } else {
      setPos({ x: 0, y: 0 });
    }
  }

  // Touch handlers
  function onTouchStart(e: React.TouchEvent) {
    if (!isTop) return;
    const t = e.touches[0];
    setDragging(true);
    startRef.current = { x: t.clientX - pos.x, y: t.clientY - pos.y };
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging) return;
    const t = e.touches[0];
    setPos({ x: t.clientX - startRef.current.x, y: t.clientY - startRef.current.y });
  }

  function onTouchEnd() {
    if (!dragging) return;
    setDragging(false);
    if (Math.abs(pos.x) > SWIPE_THRESHOLD) {
      triggerSwipe(pos.x > 0 ? "right" : "left");
    } else {
      setPos({ x: 0, y: 0 });
    }
  }

  const stackOffset = stackIndex * 8;
  const stackScale = 1 - stackIndex * 0.04;

  let transform = `translateY(${stackOffset}px) scale(${stackScale})`;
  let transition = "transform 0.2s ease";

  if (isTop) {
    if (exiting === "right") {
      transform = `translateX(150%) rotate(${MAX_ROTATION}deg)`;
      transition = "transform 0.35s ease";
    } else if (exiting === "left") {
      transform = `translateX(-150%) rotate(-${MAX_ROTATION}deg)`;
      transition = "transform 0.35s ease";
    } else {
      transform = `translate(${pos.x}px, ${pos.y}px) rotate(${rotation}deg)`;
      transition = dragging ? "none" : "transform 0.3s ease";
    }
  }

  const researcher = project.researcher;

  return (
    <div
      ref={cardRef}
      style={{ transform, transition, zIndex: 10 - stackIndex }}
      className="absolute inset-0 select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className="w-full h-full rounded-3xl bg-white shadow-card overflow-hidden flex flex-col"
        style={{ cursor: isTop ? (dragging ? "grabbing" : "grab") : "default" }}
      >
        {/* Swipe overlays */}
        <div
          className="absolute inset-0 rounded-3xl bg-match/10 border-4 border-match z-10 flex items-start justify-start p-6 pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          <span className="rounded-xl border-4 border-match text-match font-black text-2xl px-4 py-1 rotate-[-20deg]">
            INTERESTED ✓
          </span>
        </div>
        <div
          className="absolute inset-0 rounded-3xl bg-pass/10 border-4 border-pass z-10 flex items-start justify-end p-6 pointer-events-none"
          style={{ opacity: passOpacity }}
        >
          <span className="rounded-xl border-4 border-pass text-pass font-black text-2xl px-4 py-1 rotate-[20deg]">
            PASS ✗
          </span>
        </div>

        {/* Header band */}
        <div className="bg-gradient-to-r from-brand-900 to-brand-700 px-6 pt-6 pb-8 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-brand-200 uppercase tracking-wider">
                {researcher?.lab_name || researcher?.department || "Research Lab"}
              </p>
              <h2 className="text-xl font-bold mt-1 leading-tight">{project.title}</h2>
            </div>
            {project.compatibility_score !== undefined && (
              <div className="flex-shrink-0 text-center">
                <div className="text-2xl font-extrabold">{Math.round(project.compatibility_score)}%</div>
                <div className="text-xs text-brand-300">match</div>
              </div>
            )}
          </div>
          {/* Researcher meta */}
          {researcher && (
            <div className="mt-4 flex items-center gap-2 text-xs text-brand-200">
              <span>{researcher.user?.name || "Professor"}</span>
              {researcher.institution && (
                <>
                  <span>·</span>
                  <span>{researcher.institution}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-5">
            {project.description_plain}
          </p>

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 text-xs">
            {project.remote_option && (
              <span className="tag-green">🌐 Remote OK</span>
            )}
            {project.hours_per_week && (
              <span className="tag-sky">⏱ {project.hours_per_week}h / week</span>
            )}
            {project.min_academic_year && (
              <span className="tag">Min. {project.min_academic_year}</span>
            )}
            {project.start_date && (
              <span className="tag">📅 {project.start_date}</span>
            )}
          </div>

          {project.required_skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Required skills
              </p>
              <div className="flex flex-wrap gap-2">
                {project.required_skills.map((s) => (
                  <span key={s} className="tag">{s}</span>
                ))}
              </div>
            </div>
          )}

          {project.preferred_skills.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Preferred skills
              </p>
              <div className="flex flex-wrap gap-2">
                {project.preferred_skills.map((s) => (
                  <span key={s} className="tag-sky">{s}</span>
                ))}
              </div>
            </div>
          )}

          {researcher?.research_areas && researcher.research_areas.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Research areas
              </p>
              <div className="flex flex-wrap gap-2">
                {researcher.research_areas.map((a) => (
                  <span key={a} className="tag-green">{a}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
