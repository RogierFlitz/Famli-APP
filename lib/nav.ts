import {
  CalendarDays,
  CheckSquare,
  Home,
  Settings,
  Users,
  Wallet,
  FileText,
} from "lucide-react";

export const primaryNav = [
  { href: "/vandaag", label: "Vandaag", icon: Home },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/regelen", label: "Regelen", icon: CheckSquare },
  { href: "/kosten", label: "Kosten", icon: Wallet },
  { href: "/kinderen", label: "Kinderen", icon: Users },
] as const;

export const secondaryNav = [
  { href: "/documenten", label: "Documenten", icon: FileText },
  { href: "/instellingen", label: "Instellingen", icon: Settings },
] as const;
