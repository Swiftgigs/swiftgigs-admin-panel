"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ReactNode } from "react";
import {
  BadgeDollarSign, BriefcaseBusiness, Headset, LayoutDashboard, LogOut, Menu, Newspaper, ShieldAlert, Users, UserCog, Wrench, X,
} from "lucide-react";
import { useApi } from "@/lib/api";
import type { Admin } from "@/lib/types";
import { SessionContext } from "@/components/session";
import { FeedbackProvider, Spinner, cx } from "@/components/ui";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/verifications", label: "Verification issues", icon: ShieldAlert },
  { href: "/users", label: "Users", icon: Users },
  { href: "/jobs", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/customer-care", label: "Customer care", icon: Headset },
  { href: "/services", label: "Services", icon: Wrench },
  { href: "/blog", label: "Blog", icon: Newspaper },
  { href: "/fees", label: "Fees", icon: BadgeDollarSign },
  { href: "/team", label: "Admin team", icon: UserCog, superOnly: true },
];

function NavLinks({ admin, onNavigate }: { admin: Admin; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {NAV.filter((item) => !item.superOnly || admin.role === "super_admin").map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-sidebar-accent text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/" aria-label="Swiftgigs Admin" className="flex items-center px-2">
      {/* The icon is the "S", so the wordmark continues as "wiftgigs". */}
      <Image src="/logo-icon.png" alt="" width={32} height={32} className="size-8" />
      <span aria-hidden className="-ml-1 font-display text-lg font-bold tracking-tight text-primary">wiftgigs</span>
      <span className="ml-2.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">Admin</span>
    </Link>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: admin, error, loading } = useApi<Admin>("admin/me");

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    // Hard navigation: drops client state and stops in-flight prefetches for pages that now require a session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
  };

  if (loading || !admin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        {error ? (
          <div className="text-center">
            <p className="mb-3 text-sm text-destructive">{error}</p>
            <button className="text-sm font-medium text-primary underline" onClick={logout}>Back to sign in</button>
          </div>
        ) : <Spinner label="Loading your workspace…" />}
      </div>
    );
  }

  const sidebarFooter = (
    <div className="border-t border-border pt-3">
      <div className="mb-2 px-3">
        <p className="truncate text-sm font-semibold text-ink">{admin.name}</p>
        <p className="truncate text-xs text-muted-foreground">{admin.email}</p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-primary/70">{admin.role.replace("_", " ")}</p>
      </div>
      <button onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
        <LogOut className="size-4" aria-hidden />Sign out
      </button>
    </div>
  );

  return (
    <SessionContext.Provider value={admin}>
      <FeedbackProvider>
        <div className="flex min-h-screen">
          <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col justify-between border-r border-border bg-sidebar p-4 lg:flex">
            <div className="space-y-6">
              <Brand />
              <NavLinks admin={admin} />
            </div>
            {sidebarFooter}
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-sidebar/90 px-4 py-3 backdrop-blur lg:hidden">
              <Brand />
              <button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="rounded-md p-2 hover:bg-muted"><Menu className="size-5" /></button>
            </header>

            {menuOpen && (
              <div className="fixed inset-0 z-40 lg:hidden">
                <button aria-label="Close menu" className="absolute inset-0 bg-ink/40" onClick={() => setMenuOpen(false)} />
                <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col justify-between bg-sidebar p-4 shadow-xl">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Brand />
                      <button onClick={() => setMenuOpen(false)} aria-label="Close menu" className="rounded-md p-2 hover:bg-muted"><X className="size-5" /></button>
                    </div>
                    <NavLinks admin={admin} onNavigate={() => setMenuOpen(false)} />
                  </div>
                  {sidebarFooter}
                </div>
              </div>
            )}

            <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
          </div>
        </div>
      </FeedbackProvider>
    </SessionContext.Provider>
  );
}

