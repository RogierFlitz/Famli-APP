import Link from "next/link";

import { FamliLogo } from "@/components/brand/logo";

export function LandingHeader({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
      <FamliLogo />
      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <Link href="/vandaag" className="famli-btn famli-btn-primary min-h-11 px-4">
            Naar Vandaag
          </Link>
        ) : (
          <>
            <Link
              href="/login"
              className="hidden min-h-11 items-center px-3 text-sm font-medium text-[color:var(--famli-muted)] transition-colors hover:text-[color:var(--famli-ink)] sm:inline-flex"
            >
              Inloggen
            </Link>
            <Link href="/signup" className="famli-btn famli-btn-primary min-h-11 px-4">
              Start met je gezin
            </Link>
          </>
        )}
      </div>
    </header>
  );
}
