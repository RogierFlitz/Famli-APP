"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FamliAppIcon, FamliLogo } from "@/components/brand/logo";
import { primaryNav, secondaryNav } from "@/lib/nav";
import { cn } from "@/lib/utils";
import type { FamilySnapshot } from "@/lib/domain/types";
import { signOut } from "@/lib/auth/actions";
import { AddMenu } from "@/components/compose/add-menu";
import { FamilySearch } from "@/components/search/family-search";

export function AppShell({
  snapshot,
  children,
}: {
  snapshot: FamilySnapshot;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const unread = snapshot.notifications.filter((item) => !item.readAt).length;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-[color:var(--famli-border)] bg-[color:var(--famli-card)] lg:flex lg:flex-col">
        <div className="px-5 py-6">
          <Link href="/vandaag" aria-label="Famli, naar Vandaag">
            <FamliLogo />
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {primaryNav.map((item) => (
            <NavLink key={item.href} href={item.href} active={pathname.startsWith(item.href)} icon={item.icon} label={item.label} badge={item.href === "/regelen" ? unread : 0} />
          ))}
          <div className="mt-auto mb-3 space-y-1 border-t border-[color:var(--famli-border)] pt-3">
            {secondaryNav.map((item) => (
              <NavLink key={item.href} href={item.href} active={pathname.startsWith(item.href)} icon={item.icon} label={item.label} />
            ))}
          </div>
        </nav>
        <div className="border-t border-[color:var(--famli-border)] px-4 py-4">
          <p className="text-sm font-medium">{snapshot.currentProfile.firstName}</p>
          <p className="text-xs text-[color:var(--famli-muted)]">{snapshot.family.name}</p>
          <form action={signOut}>
            <button className="mt-2 text-xs text-[color:var(--famli-muted)] underline-offset-2 hover:underline">
              Uitloggen
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center gap-3 px-4 pt-[max(1rem,env(safe-area-inset-top))] lg:hidden">
          <Link href="/vandaag" aria-label="Famli, naar Vandaag">
            <FamliAppIcon className="size-8 shrink-0" />
          </Link>
          <FamilySearch snapshot={snapshot} />
        </header>
        <div className="hidden px-10 pt-6 lg:block">
          <FamilySearch snapshot={snapshot} />
        </div>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-4 lg:px-10 lg:pb-10 lg:pt-6">
          {children}
        </main>
        <div className="lg:hidden">
          <AddMenu snapshot={snapshot} />
        </div>
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[color:var(--famli-border)] bg-[color:var(--famli-card)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <ul className="grid grid-cols-5">
            {primaryNav.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px]",
                      active ? "text-[color:var(--famli-brand)]" : "text-[color:var(--famli-muted)]",
                    )}
                  >
                    <Icon className="size-5" />
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
}: {
  href: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition",
        active
          ? "bg-[color:var(--famli-bg)] text-[color:var(--famli-ink)]"
          : "text-[color:var(--famli-muted)] hover:bg-[color:var(--famli-bg)]/70 hover:text-[color:var(--famli-ink)]",
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {badge > 0 ? (
        <span className="grid size-5 place-items-center rounded-full bg-[color:var(--famli-brand)] text-[10px] text-white">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
