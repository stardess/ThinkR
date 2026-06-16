"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getUser } from "@/lib/auth";
import { notificationsApi } from "@/lib/api";
import { NotificationSummary } from "@/lib/types";

const POLL_MS = 15_000;
const SEEN_KEY = "thinkr_notif_seen";

// ─── Icons (inline stroke SVGs) ────────────────────────────────────────────
const ic = "h-5 w-5";
const Icon = {
  discover: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><polygon points="15.5 8.5 10.5 10.5 8.5 15.5 13.5 13.5" />
    </svg>
  ),
  home: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  ),
  users: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  user: (
    <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: boolean;
}

function badgeTotal(role: string | undefined, s: NotificationSummary): number {
  if (role === "student")
    return (s.incoming_requests || 0) + (s.new_matches || 0) + (s.unread_messages || 0);
  return (s.pending_swipes || 0) + (s.new_matches || 0) + (s.unread_messages || 0);
}

function diffToasts(role: string | undefined, prev: NotificationSummary, next: NotificationSummary): string[] {
  const out: string[] = [];
  if (role === "student") {
    if (next.incoming_requests > prev.incoming_requests) out.push("📩 A researcher invited you to apply!");
    if (next.new_matches > prev.new_matches) out.push("🎉 It's a match! Open your chats.");
  } else {
    if (next.pending_swipes > prev.pending_swipes) out.push("👀 A student is interested in your project!");
    if (next.new_matches > prev.new_matches) out.push("🎉 New mutual match!");
  }
  if (next.unread_messages > prev.unread_messages) out.push("💬 You have a new message.");
  return out;
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();
  const [count, setCount] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const prevSummary = useRef<NotificationSummary | null>(null);
  const toastSeq = useRef(0);

  useEffect(() => {
    if (!user) return;
    if (prevSummary.current === null) {
      try {
        const stored = sessionStorage.getItem(SEEN_KEY);
        if (stored) prevSummary.current = JSON.parse(stored);
      } catch {
        /* ignore */
      }
    }
    const fetchNotifs = async () => {
      try {
        const { data } = await notificationsApi.getSummary();
        const s = data as NotificationSummary;
        setCount(badgeTotal(user.role, s));
        if (prevSummary.current) {
          for (const msg of diffToasts(user.role, prevSummary.current, s)) {
            const id = ++toastSeq.current;
            setToasts((t) => [...t, { id, message: msg }]);
            window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 6000);
          }
        }
        prevSummary.current = s;
        try {
          sessionStorage.setItem(SEEN_KEY, JSON.stringify(s));
        } catch {
          /* ignore */
        }
      } catch {
        /* notifications are non-critical */
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, POLL_MS);
    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSignout() {
    clearAuth();
    try {
      sessionStorage.removeItem(SEEN_KEY);
    } catch {
      /* ignore */
    }
    router.push("/");
  }

  const items: NavItem[] =
    user?.role === "student"
      ? [
          { href: "/discover", label: "Discover", icon: Icon.discover },
          { href: "/dashboard", label: "Matches", icon: Icon.home, badge: true },
          { href: "/profile", label: "Profile", icon: Icon.user },
        ]
      : [
          { href: "/dashboard", label: "Dashboard", icon: Icon.home, badge: true },
          { href: "/dashboard/students", label: "Students", icon: Icon.users },
        ];

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <>
      <aside className="sticky top-0 z-40 flex h-screen w-20 flex-shrink-0 flex-col items-center border-r border-slate-200 bg-white py-4">
        <Link href={user ? "/dashboard" : "/"} className="mb-6 px-1">
          <Image src="/thinkr-logo.png" alt="Thinkr" width={120} height={44} priority className="h-7 w-auto" />
        </Link>

        <nav className="flex w-full flex-col items-center gap-1 px-2">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`nav-link relative w-full ${isActive(it.href) ? "nav-link-active" : ""}`}
            >
              {it.icon}
              {it.label}
              {it.badge && count > 0 && (
                <span className="absolute right-2.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-auto flex w-full flex-col items-center gap-2 px-2">
          {user && (
            <>
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700"
                title={user.name}
              >
                {user.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <button onClick={handleSignout} className="nav-link w-full" title="Sign out">
                <svg className={ic} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Sign out
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Live notification toasts */}
      <div className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-xs flex-col gap-2">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => router.push("/dashboard")}
            className="pointer-events-auto animate-slideInRight rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-medium text-brand-900 shadow-card-hover transition-transform hover:scale-[1.02]"
          >
            {t.message}
            <span className="mt-0.5 block text-xs font-normal text-brand-600">View →</span>
          </button>
        ))}
      </div>
    </>
  );
}
