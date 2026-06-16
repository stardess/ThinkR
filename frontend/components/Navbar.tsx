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

interface Toast {
  id: number;
  message: string;
  href: string;
}

function badgeTotal(role: string | undefined, s: NotificationSummary): number {
  if (role === "student") {
    return (s.incoming_requests || 0) + (s.new_matches || 0) + (s.unread_messages || 0);
  }
  return (s.pending_swipes || 0) + (s.new_matches || 0) + (s.unread_messages || 0);
}

// Compare two summaries and return toast messages for any category that grew.
function diffToasts(
  role: string | undefined,
  prev: NotificationSummary,
  next: NotificationSummary
): string[] {
  const out: string[] = [];
  if (role === "student") {
    if (next.incoming_requests > prev.incoming_requests)
      out.push("📩 A researcher invited you to apply!");
    if (next.new_matches > prev.new_matches) out.push("🎉 It's a match! Open your chats.");
  } else {
    if (next.pending_swipes > prev.pending_swipes)
      out.push("👀 A student is interested in your project!");
    if (next.new_matches > prev.new_matches) out.push("🎉 New mutual match!");
  }
  if (next.unread_messages > prev.unread_messages) out.push("💬 You have a new message.");
  return out;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();
  const [notifCount, setNotifCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevSummary = useRef<NotificationSummary | null>(null);
  const toastSeq = useRef(0);

  function pushToast(message: string) {
    const id = ++toastSeq.current;
    setToasts((t) => [...t, { id, message, href: "/dashboard" }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 6000);
  }

  useEffect(() => {
    if (!user) return;

    // Seed the baseline from this session so we don't toast pre-existing state.
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
        const summary = data as NotificationSummary;
        setNotifCount(badgeTotal(user.role, summary));

        if (prevSummary.current) {
          for (const msg of diffToasts(user.role, prevSummary.current, summary)) {
            pushToast(msg);
          }
        }
        prevSummary.current = summary;
        try {
          sessionStorage.setItem(SEEN_KEY, JSON.stringify(summary));
        } catch {
          /* ignore */
        }
      } catch {
        // silently ignore — notifications are non-critical
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

  const navLinks =
    user?.role === "student"
      ? [
          { href: "/discover", label: "Discover" },
          { href: "/dashboard", label: "Dashboard" },
        ]
      : [{ href: "/dashboard", label: "Dashboard" }];

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center">
            <Image
              src="/thinkr-logo.png"
              alt="Thinkr"
              width={108}
              height={40}
              priority
              className="h-8 w-auto"
            />
          </Link>

          <nav className="flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.label}
                {l.href === "/dashboard" && notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                )}
              </Link>
            ))}

            {user ? (
              <div className="ml-4 flex items-center gap-3">
                <span className="max-w-[140px] truncate text-xs text-slate-500">{user.name}</span>
                <button onClick={handleSignout} className="btn-secondary px-3 py-1.5 text-xs">
                  Sign out
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-primary ml-4 px-4 py-2 text-sm">
                Sign in
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Live notification toasts */}
      <div className="pointer-events-none fixed right-4 top-20 z-[60] flex w-full max-w-xs flex-col gap-2">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => router.push(t.href)}
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
