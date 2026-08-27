import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next";

const AUTH_NEXT_COOKIE = "cbb_auth_next";

/** OAuth return URL — exchange PKCE code for a session cookie (server-side). */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError =
    searchParams.get("error_description") ?? searchParams.get("error");

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${AUTH_NEXT_COOKIE}=([^;]+)`),
  );
  const cookieNext = cookieMatch
    ? safeNextPath(decodeURIComponent(cookieMatch[1]))
    : "/dashboard";
  const next = safeNextPath(searchParams.get("next") || cookieNext);

  if (oauthError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(oauthError)}`,
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";

      const redirectUrl = isLocalEnv
        ? `${origin}${next}`
        : forwardedHost
          ? `https://${forwardedHost}${next}`
          : `${origin}${next}`;

      const response = NextResponse.redirect(redirectUrl);
      response.cookies.set(AUTH_NEXT_COOKIE, "", { path: "/", maxAge: 0 });
      return response;
    }

    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Missing OAuth code. Try signing in with Google again.")}`,
  );
}
