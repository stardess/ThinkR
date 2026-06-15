"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuth, getUser } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const user = getUser();

  function handleSignout() {
    clearAuth();
    router.push("/");
  }

  const navLinks =
    user?.role === "student"
      ? [
          { href: "/discover", label: "Discover" },
          { href: "/dashboard", label: "Dashboard" },
        ]
      : [
          { href: "/dashboard", label: "Dashboard" },
        ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href={user ? "/dashboard" : "/"} className="text-xl font-bold text-brand-900">
          ThinkR
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                pathname === l.href
                  ? "bg-brand-50 text-brand-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {l.label}
            </Link>
          ))}

          {user ? (
            <div className="ml-4 flex items-center gap-3">
              <span className="text-xs text-slate-500 max-w-[140px] truncate">{user.name}</span>
              <button
                onClick={handleSignout}
                className="btn-secondary py-1.5 px-3 text-xs"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-primary py-2 px-4 ml-4 text-sm">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
