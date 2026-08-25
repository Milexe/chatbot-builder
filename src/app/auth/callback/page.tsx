"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

function safeNextPath(value: string | null): string {
  if (value && value.startsWith("/") && !value.startsWith("//")) {
    return value;
  }
  return "/dashboard";
}

/** OAuth return URL (Google). */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Completing sign-in…");

  useEffect(() => {
    let cancelled = false;

    async function completeOAuth() {
      const supabase = createClient();
      const url = new URL(window.location.href);
      const next = safeNextPath(url.searchParams.get("next"));

      const oauthError =
        url.searchParams.get("error_description") ??
        url.searchParams.get("error");
      if (oauthError) {
        if (!cancelled) {
          setMessage(oauthError);
          router.replace(`/login?error=${encodeURIComponent(oauthError)}`);
        }
        return;
      }

      const code = url.searchParams.get("code");
      if (!code) {
        if (!cancelled) {
          const message = "Missing OAuth code. Try signing in with Google again.";
          setMessage(message);
          router.replace(`/login?error=${encodeURIComponent(message)}`);
        }
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        if (!cancelled) {
          setMessage(error.message);
          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
        }
        return;
      }

      if (!cancelled) {
        router.replace(next);
        router.refresh();
      }
    }

    void completeOAuth();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <p className="max-w-md text-center text-sm text-muted-foreground">
        {message}
      </p>
    </main>
  );
}
