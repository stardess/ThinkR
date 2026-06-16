"use client";

import Link from "next/link";
import Sidebar from "@/components/Sidebar";

export interface ShellTab {
  label: string;
  href?: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
}

/**
 * Jobright-style application shell: fixed left icon rail + a section header
 * (bold title, breadcrumb tabs, optional actions) + main content with an
 * optional right rail.
 */
export default function AppShell({
  title,
  tabs,
  actions,
  right,
  children,
  contentClassName = "",
  fullBleed = false,
}: {
  title: string;
  tabs?: ShellTab[];
  actions?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  contentClassName?: string;
  /** Skip the default padded content container (used by the swipe feed). */
  fullBleed?: boolean;
}) {
  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-canvas/85 px-6 py-4 backdrop-blur lg:px-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex items-end gap-6">
              <h1 className="section-title">{title}</h1>
              {tabs && tabs.length > 0 && (
                <nav className="flex items-center gap-5 pb-0.5">
                  {tabs.map((t) => {
                    const cls = `tab ${t.active ? "tab-active" : ""}`;
                    const inner = (
                      <>
                        {t.label}
                        {t.count != null && t.count > 0 && (
                          <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            {t.count}
                          </span>
                        )}
                      </>
                    );
                    return t.href ? (
                      <Link key={t.label} href={t.href} className={cls}>
                        {inner}
                      </Link>
                    ) : (
                      <button key={t.label} onClick={t.onClick} className={cls}>
                        {inner}
                      </button>
                    );
                  })}
                </nav>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </header>

        {fullBleed ? (
          <div className="flex flex-1 flex-col">{children}</div>
        ) : (
          <div className="flex flex-1 gap-6 px-6 py-6 lg:px-10">
            <main className={`min-w-0 flex-1 ${contentClassName}`}>{children}</main>
            {right && <aside className="hidden w-72 flex-shrink-0 xl:block">{right}</aside>}
          </div>
        )}
      </div>
    </div>
  );
}
