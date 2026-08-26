"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return desktop;
}

export function ResponsiveSheet({
  open,
  onOpenChange,
  title,
  children,
  wide = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const desktop = useDesktop();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={desktop ? "right" : "bottom"}
        className={cn(
          "overflow-y-auto bg-[color:var(--famli-card)] p-0",
          desktop ? (wide ? "sm:max-w-lg" : "sm:max-w-md") : "max-h-[90dvh] rounded-t-3xl border-[color:var(--famli-border)]",
        )}
      >
        <SheetHeader className="border-b border-[color:var(--famli-border)] px-5 py-4">
          <SheetTitle className="text-2xl font-semibold tracking-tight">{title}</SheetTitle>
        </SheetHeader>
        <div className="px-5 py-5">{children}</div>
      </SheetContent>
    </Sheet>
  );
}
