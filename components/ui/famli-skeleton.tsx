import { cn } from "@/lib/utils";

export function FamliSkeleton({ className }: { className?: string }) {
  return <div className={cn("famli-skeleton", className)} aria-hidden />;
}

export function PageSkeleton() {
  return (
    <div className="famli-page" role="status" aria-live="polite" aria-label="Laden">
      <FamliSkeleton className="h-4 w-40" />
      <FamliSkeleton className="h-10 w-72" />
      <FamliSkeleton className="h-16 w-full" />
      <FamliSkeleton className="h-24 w-full" />
      <span className="sr-only">Pagina wordt geladen</span>
    </div>
  );
}
