export function passwordResetRedirectTo(siteUrl: string): string {
  const base = siteUrl.replace(/\/$/, "") || "http://localhost:3000";
  return `${base}/auth/callback?next=/login/nieuw-wachtwoord`;
}
