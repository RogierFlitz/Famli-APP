const ALLOWED_REDIRECT_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/onboarding",
  "/vandaag",
  "/agenda",
  "/regelen",
  "/kosten",
  "/kinderen",
  "/vakanties",
  "/instellingen",
  "/instellingen/beveiliging",
]);

/** Reject open redirects — only same-origin relative paths allowed. */
export function safeRedirectPath(raw: string | null | undefined, fallback = "/vandaag"): string {
  if (!raw || typeof raw !== "string") return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://") || trimmed.includes("\\")) return fallback;
  const path = trimmed.split("?")[0]?.split("#")[0] ?? fallback;
  if (ALLOWED_REDIRECT_PATHS.has(path) || path.startsWith("/kinderen/") || path.startsWith("/invite/")) {
    return trimmed.startsWith("/") ? trimmed : fallback;
  }
  return fallback;
}
