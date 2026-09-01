"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { SESSION_COOKIE, type SessionPayload } from "@/lib/domain/types";
import { assertRateLimit } from "@/lib/security/rate-limit";
import { safeRedirectPath } from "@/lib/security/redirect";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passwordResetRedirectTo } from "@/lib/auth/password-reset";

async function setSessionCookie(payload: SessionPayload) {
  const store = await cookies();
  store.set(SESSION_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function startDemo(userId: string) {
  if (isSupabaseConfigured()) {
    redirect("/login?error=Demo%20modus%20is%20uitgeschakeld%20in%20productie.");
  }
  await setSessionCookie({ userId, source: "demo" });
  redirect("/vandaag");
}

export async function startDemoEmma() {
  await startDemo("22222222-2222-4222-a222-222222222222");
}

export async function startDemoRogier() {
  await startDemo("33333333-3333-4333-a333-333333333333");
}

export async function startDemoSanne() {
  await startDemo("44444444-4444-4444-a444-444444444444");
}

export async function signUpLocal(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!firstName || !email) {
    redirect("/signup?error=Vul%20je%20voornaam%20en%20e-mailadres%20in.");
  }

  assertRateLimit("login", email);

  if (isSupabaseConfigured()) {
    const password = String(formData.get("password") ?? "");
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName, last_name: lastName } },
    });
    if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    redirect("/onboarding");
  }

  const { userId } = await getRepository().createLocalUser({ firstName, lastName, email });
  await setSessionCookie({ userId, source: "local" });
  redirect("/onboarding");
}

export async function signInLocal(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = safeRedirectPath(String(formData.get("next") ?? ""));

  assertRateLimit("login", email);

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
    redirect(next);
  }

  redirect("/login?error=Zonder%20Supabase%20gebruik%20je%20de%20demo%20of%20maak%20je%20een%20lokaal%20account.");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/login/wachtwoord-vergeten?error=Vul%20je%20e-mailadres%20in.");
  try {
    assertRateLimit("password_reset", email);
  } catch {
    redirect("/login/wachtwoord-vergeten?error=Te%20veel%20pogingen.%20Probeer%20het%20later.");
  }

  if (!isSupabaseConfigured()) {
    redirect("/login/wachtwoord-vergeten?error=Wachtwoord%20resetten%20kan%20alleen%20op%20de%20live%20site.");
  }

  const supabase = await createSupabaseServerClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: passwordResetRedirectTo(siteUrl),
  });
  if (error) {
    redirect("/login/wachtwoord-vergeten?error=Versturen%20lukt%20nu%20niet.%20Probeer%20het%20later.");
  }
  redirect("/login/wachtwoord-vergeten?sent=1");
}

export async function updatePasswordFromReset(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) {
    redirect("/login/nieuw-wachtwoord?error=Gebruik%20minstens%208%20tekens.");
  }
  if (password !== confirm) {
    redirect("/login/nieuw-wachtwoord?error=De%20wachtwoorden%20komen%20niet%20overeen.");
  }
  if (!isSupabaseConfigured()) {
    redirect("/login?error=Wachtwoord%20reset%20vereist%20Supabase%20Auth.");
  }
  try {
    assertRateLimit("password_reset", "update");
  } catch {
    redirect("/login/nieuw-wachtwoord?error=Te%20veel%20pogingen.%20Probeer%20het%20later.");
  }
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect("/login/wachtwoord-vergeten?error=De%20resetlink%20is%20ongeldig%20of%20verlopen.");
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/login/nieuw-wachtwoord?error=${encodeURIComponent(error.message)}`);
  redirect("/login?reset=1");
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/");
}
