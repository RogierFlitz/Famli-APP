/**
 * Famli design tokens — single source of truth.
 * Keep `app/globals.css` `:root` variables in sync with this file.
 * Public SVGs in `public/famli-*.svg` use the same mark geometry and colours.
 *
 * Palette from the Famli brand sheet:
 * Blauw #3B82F6, Koraal #FF8A7A, Geel #FBBF24, Navy #0F172A, Grijs #64748B, Licht #F8FAFC.
 */
export const famliBrand = {
  name: "Famli",
  wordmark: "famli",
  sloganNl: "Samen ouders. Alles geregeld.",
  sloganEn: "Family life, simplified.",
  onboardingLine: "Minder onthouden. Minder afstemmen.",
  onboardingBody:
    "Organiseer jullie agenda, wisseldagen, afspraken en kosten op één rustige plek.",
  metadata: {
    title: "Famli | Samen ouders. Alles geregeld.",
    description:
      "Famli brengt jullie gezinsagenda, wisseldagen, afspraken, kosten en belangrijke informatie samen op één overzichtelijke plek.",
  },
} as const;

export const famliColor = {
  blue: "#3B82F6",
  coral: "#FF8A7A",
  yellow: "#FBBF24",
  navy: "#0F172A",
  gray: "#64748B",
  light: "#F8FAFC",
  primary: "#3B82F6",
  brand: "#3B82F6",
  brandHover: "#2563EB",
  brandSoft: "#DBEAFE",
  onBrand: "#FFFFFF",
  bg: "#F8FAFC",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  ink: "#0F172A",
  muted: "#64748B",
  border: "rgba(15, 23, 42, 0.08)",
  parent1: "#3B82F6",
  parent2: "#FF8A7A",
  child: "#FBBF24",
  school: "#94A3B8",
  sport: "#60A5FA",
  important: "#FF8A7A",
} as const;

export const famliRadius = {
  sm: "12px",
  md: "16px",
  lg: "24px",
  xl: "32px",
  pill: "999px",
  icon: "22%",
} as const;

export const famliShadow = {
  none: "none",
  rest: "0 1px 0 rgba(15, 23, 42, 0.04)",
  lift: "0 18px 40px -28px rgba(15, 23, 42, 0.28)",
} as const;

export const famliSpace = {
  page: "1.5rem",
  card: "1.25rem",
  stack: "0.75rem",
  control: "3rem",
} as const;

export const famliType = {
  family: "var(--font-famli), ui-sans-serif, system-ui, sans-serif",
  trackingWordmark: "-0.02em",
} as const;

export const famliClass = {
  card: "famli-card",
  input: "famli-input",
  btn: "famli-btn",
  btnPrimary: "famli-btn famli-btn-primary",
  btnSecondary: "famli-btn famli-btn-secondary",
  btnBrand: "famli-btn famli-btn-brand",
} as const;

export const famliCopy = {
  changeRequest: "Wijziging voorstellen",
  decline: "Niet deze keer",
  atParent: (label: string) => `Bij ${label.toLowerCase()}`,
} as const;
