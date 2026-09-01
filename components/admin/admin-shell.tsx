"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_ROLE_LABEL } from "@/lib/admin/roles";
import type { AdminActor } from "@/lib/admin/types";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/gebruikers", label: "Gebruikers" },
  { href: "/admin/gezinnen", label: "Gezinnen" },
  { href: "/admin/support", label: "Support" },
  { href: "/admin/auditlog", label: "Auditlog" },
  { href: "/admin/instellingen", label: "Instellingen" },
];

export function AdminShell({ actor, children }: { actor: AdminActor; children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh bg-slate-100 text-slate-900 lg:grid lg:grid-cols-[220px_1fr]">
      <aside className="hidden border-r border-slate-200 bg-slate-900 text-slate-100 lg:flex lg:flex-col">
        <div className="px-5 py-6">
          <p className="text-xs uppercase tracking-wider text-slate-400">Famli intern</p>
          <p className="mt-1 text-lg font-semibold">Beheer</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                pathname.startsWith(item.href) ? "bg-slate-800 text-white" : "text-slate-300 hover:bg-slate-800/70",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-800 px-4 py-4 text-sm">
          <p className="font-medium">{actor.name}</p>
          <p className="text-xs text-slate-400">{ADMIN_ROLE_LABEL[actor.role]}</p>
          <form action="/admin/logout" method="post">
            <button className="mt-2 text-xs text-slate-400 underline-offset-2 hover:underline">Uitloggen</button>
          </form>
        </div>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <p className="font-semibold">Famli beheer</p>
          <form action="/admin/logout" method="post">
            <button className="text-xs text-slate-500">Uitloggen</button>
          </form>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 lg:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-full px-3 py-1 text-xs",
                pathname.startsWith(item.href) ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
