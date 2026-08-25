import { cn } from "@/lib/utils";
import { famliClass } from "@/lib/brand/tokens";

export function FamliCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(famliClass.card, className)}>{children}</div>;
}

export const famliControlClass = famliClass.input;
export const famliPrimaryButtonClass = famliClass.btnPrimary;
export const famliSecondaryButtonClass = famliClass.btnSecondary;
export const famliBrandButtonClass = famliClass.btnBrand;
