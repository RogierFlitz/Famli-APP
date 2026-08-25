"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRepository } from "@/lib/data";
import { SESSION_COOKIE, type SessionPayload } from "@/lib/domain/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

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
  await setSessionCookie({ userId, source: "demo" });
  redirect("/vandaag");
}

export async function startDemoEmma() {
  await startDemo("22222222-2222-4222-a222-222222222222");
}

export async function startDemoRogier() {
  await startDemo("33333333-3333-4333-a333-333333333333");
}

export async function signUpLocal(formData: FormData) {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!firstName || !email) {
    redirect("/signup?error=Vul%20je%20voornaam%20en%20e-mailadres%20in.");
  }

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

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
    redirect("/vandaag");
  }

  redirect("/login?error=Zonder%20Supabase%20gebruik%20je%20de%20demo%20of%20maak%20je%20een%20lokaal%20account.");
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
