"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { FamliAppIcon, FamliLogo } from "@/components/brand/logo";
import { primaryNav, secondaryNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { FamilySnapshot } from "@/lib/domain/types";
import { signOut } from "@/lib/auth/actions";
import { AddMenu } from "@/components/compose/add-menu";
import { FamilySearch } from "@/components/search/family-search";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { navBadges } from "@/lib/queries/smart-today";

export function AppShell({
  snapshot,
  children,
}: {
  snapshot: FamilySnapshot;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const badges = navBadges(snapshot);
  const initial = snapshot.currentProfile.firstName.slice(0, 1).toUpperCase();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="hidden border-r border-[color:var(--famli-border)] bg-[color:var(--famli-elevated)] lg:flex lg:flex-col">
        <div className="px-4 pb-4 pt-5">
          <Link href="/vandaag" aria-label="Famli, naar Vandaag" className="inline-flex">
            <FamliLogo />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 px-2.5">
          {primaryNav.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              active={pathname.startsWith(item.href)}
              icon={item.icon}
              label={item.label}
              badge={badges[item.href] ?? 0}
            />
          ))}
          <div className="mt-4 space-y-0.5 border-t border-[color:var(--famli-border)] pt-3">
            {secondaryNav.map((item) => (
              <NavLink key={item.href} href={item.href} active={pathname.startsWith(item.href)} icon={item.icon} label={item.label} />
            ))}
          </div>
        </nav>
        <div className="mt-auto flex items-center gap-3 border-t border-[color:var(--famli-border)] px-4 py-4">
          {snapshot.currentProfile.avatarUrl ? (
            <img
              src={snapshot.currentProfile.avatarUrl}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[color:var(--famli-surface)] text-sm font-semibold">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{snapshot.currentProfile.firstName}</p>
            <p className="truncate text-xs text-[color:var(--famli-muted)]">{snapshot.family.name}</p>
            <form action={signOut}>
              <button className="mt-1 min-h-8 text-xs text-[color:var(--famli-muted)] underline-offset-2 hover:underline">
                Uitloggen
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center gap-2 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] lg:hidden">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-[color:var(--famli-ink)]"
            aria-label="Menu openen"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" />
          </button>
          <Link href="/vandaag" aria-label="Famli, naar Vandaag">
            <FamliAppIcon className="size-8 shrink-0" />
          </Link>
          <FamilySearch snapshot={snapshot} />
          <NotificationBell snapshot={snapshot} />
        </header>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-[min(20rem,88vw)] bg-[color:var(--famli-elevated)] p-0">
            <SheetHeader className="px-4 pt-5">
              <SheetTitle className="sr-only">Navigatie</SheetTitle>
              <FamliLogo />
            </SheetHeader>
            <nav className="mt-4 flex flex-col gap-0.5 px-2.5">
              {[...primaryNav, ...secondaryNav].map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  active={pathname.startsWith(item.href)}
                  icon={item.icon}
                  label={item.label}
                  badge={badges[item.href] ?? 0}
                  onClick={() => setMenuOpen(false)}
                />
              ))}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="hidden items-center gap-2 px-8 pt-5 lg:flex">
          <FamilySearch snapshot={snapshot} />
          <NotificationBell snapshot={snapshot} />
          <AddMenu snapshot={snapshot} compact />
        </div>
        <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 lg:px-8 lg:pb-12 lg:pt-6">
          {children}
        </main>
        <div className="lg:hidden">
          <AddMenu snapshot={snapshot} />
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--famli-border)] bg-[color:var(--famli-elevated)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <ul className="grid grid-cols-6">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex min-h-16 flex-col items-center justify-center gap-1 text-[11px]",
                      active ? "font-medium text-[color:var(--famli-ink)]" : "text-[color:var(--famli-muted)]",
                    )}
                  >
                    <span className="relative">
                      <Icon className="size-5" />
                      {(badges[item.href] ?? 0) > 0 ? (
                        <span className="absolute -right-2 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[color:var(--famli-yellow)] px-1 text-[9px] font-semibold leading-none text-[color:var(--famli-ink)]">
                          {badges[item.href]}
                        </span>
                      ) : null}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}

function NavLink({
  href,
  active,
  icon: Icon,
  label,
  badge = 0,
  onClick,
}: {
  href: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
        active
          ? "bg-[color:color-mix(in_srgb,var(--famli-yellow)_42%,white)] font-medium text-[color:var(--famli-ink)]"
          : "text-[color:var(--famli-muted)] hover:bg-[color:var(--famli-surface)] hover:text-[color:var(--famli-ink)]",
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {badge > 0 ? (
        <span className="grid size-5 place-items-center rounded-full bg-[color:var(--famli-yellow)] text-[10px] font-semibold leading-none text-[color:var(--famli-ink)]">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
