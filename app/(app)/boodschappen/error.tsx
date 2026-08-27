"use client";

import { ShoppingLoadError } from "@/components/shopping/shopping-load-error";

export default function BoodschappenError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <ShoppingLoadError />
      <div className="text-center">
        <button type="button" onClick={() => reset()} className="famli-btn famli-btn-primary">
          Opnieuw proberen
        </button>
      </div>
    </div>
  );
}
