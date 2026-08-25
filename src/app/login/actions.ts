"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthActionState = {
  ok: boolean;
  message: string;
};

const MIN_PASSWORD_LENGTH = 8;

function getAppOrigin(headerStore: Headers): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    headerStore.get("origin") ??
    "http://localhost:3000"
  );
}

function parseCredentials(formData: FormData): {
  email: string;
  password: string;
  error?: string;
} {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !email.includes("@")) {
    return { email, password, error: "Enter a valid email address." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      email,
      password,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  return { email, password };
}

export async function submitEmailAuth(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const intent = String(formData.get("intent") ?? "signin");
  const parsed = parseCredentials(formData);
  if (parsed.error) {
    return { ok: false, message: parsed.error };
  }

  const supabase = await createClient();

  if (intent === "signup") {
    const { data, error } = await supabase.auth.signUp({
      email: parsed.email,
      password: parsed.password,
    });

    if (error) {
      return { ok: false, message: error.message };
    }
    if (data.session) {
      redirect("/dashboard");
    }

    return {
      ok: false,
      message:
        "Signed up but no session was returned. In Supabase Auth → Providers → Email, turn Confirm email off for this MVP.",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.email,
    password: parsed.password,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  redirect("/dashboard");
}

export async function signInWithGoogle() {
  const headerStore = await headers();
  const origin = getAppOrigin(headerStore);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(error?.message ?? "Google sign-in failed")}`,
    );
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
