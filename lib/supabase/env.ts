export type SupabaseKeyType = "legacy-anon" | "publishable" | "missing";

function trimEnv(value: string | undefined): string {
  return value?.trim() ?? "";
}

export function supabasePublicKey(): string {
  return (
    trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    trimEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  );
}

export function supabaseKeyType(): SupabaseKeyType {
  const anon = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const publishable = trimEnv(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (!anon && !publishable) return "missing";

  const key = anon || publishable;
  if (key.startsWith("sb_publishable_")) return "publishable";
  if (key.startsWith("eyJ")) return "legacy-anon";

  // Accept non-prefixed keys; infer type from which env var supplied the value.
  if (anon) return "legacy-anon";
  return "publishable";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL) && supabasePublicKey());
}

export function supabaseUrl(): string {
  return trimEnv(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return supabasePublicKey();
}

/**
 * Service role key — SERVER ONLY. Never import in client components.
 * Throws if called in browser or if key is missing.
 */
export function supabaseServiceRoleKey(): string {
  if (typeof window !== "undefined") {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY must never be accessed in the browser.");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return key;
}

export function hasServiceRoleKey(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
