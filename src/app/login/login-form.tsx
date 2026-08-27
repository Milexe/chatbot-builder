"use client";

import { useActionState, useState, useTransition } from "react";

import {
  submitEmailAuth,
  type AuthActionState,
} from "@/app/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

const initialState: AuthActionState = { ok: false, message: "" };

type Mode = "signin" | "signup";

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [googleError, setGoogleError] = useState("");
  const [googlePending, startGoogle] = useTransition();
  const next =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "/dashboard";

  function handleGoogleSignIn() {
    setGoogleError("");
    startGoogle(async () => {
      document.cookie = `cbb_auth_next=${encodeURIComponent(next)}; Path=/; Max-Age=600; SameSite=Lax`;
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Keep this path exact — query strings often fail Supabase Redirect URL
          // matching and fall back to Site URL (production).
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setGoogleError(error.message);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        disabled={googlePending}
        onClick={handleGoogleSignIn}
      >
        <GoogleIcon />
        {googlePending ? "Redirecting…" : "Continue with Google"}
      </Button>
      {googleError ? (
        <p className="text-sm text-destructive" role="status">
          {googleError}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or email</span>
        <Separator className="flex-1" />
      </div>

      <EmailPasswordForm key={mode} mode={mode} nextPath={next} />

      <p className="text-center text-sm text-muted-foreground">
        {mode === "signin" ? (
          <>
            No account?{" "}
            <button
              type="button"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              onClick={() => setMode("signup")}
            >
              Create one
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              type="button"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              onClick={() => setMode("signin")}
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

function EmailPasswordForm({
  mode,
  nextPath,
}: {
  mode: Mode;
  nextPath: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [clientError, setClientError] = useState("");
  const [state, formAction, pending] = useActionState(
    submitEmailAuth,
    initialState,
  );

  const errorMessage = clientError || (!state.ok ? state.message : "");
  const successMessage = state.ok ? state.message : "";

  return (
    <form
      className="flex flex-col gap-4"
      action={formAction}
      onSubmit={(event) => {
        setClientError("");
        if (mode === "signup" && password !== confirmPassword) {
          event.preventDefault();
          setClientError("Passwords do not match.");
        }
      }}
    >
      <input type="hidden" name="intent" value={mode} />
      <input type="hidden" name="next" value={nextPath} />
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
          disabled={pending}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          placeholder="At least 8 characters"
          required
          minLength={8}
          disabled={pending}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {mode === "signup" ? (
        <div className="grid gap-2">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="Repeat password"
            required
            minLength={8}
            disabled={pending}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>
      ) : null}
      <Button type="submit" disabled={pending}>
        {pending
          ? mode === "signin"
            ? "Signing in…"
            : "Creating account…"
          : mode === "signin"
            ? "Sign in"
            : "Create account"}
      </Button>
      {errorMessage ? (
        <p className="text-sm text-destructive" role="status">
          {errorMessage}
        </p>
      ) : null}
      {successMessage ? (
        <p className="text-sm text-muted-foreground" role="status">
          {successMessage}
        </p>
      ) : null}
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden className="size-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
