import type { SupabaseClient } from "@supabase/supabase-js";

import {
  BOT_ALLOWED_ORIGINS_MAX,
  EMBED_RATE_LIMIT_MAX_REQUESTS,
  EMBED_RATE_LIMIT_WINDOW_MS,
  EMBED_SESSION_MESSAGE_LIMIT,
} from "@/lib/limits";

export class EmbedLimitError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "EmbedLimitError";
    this.status = status;
  }
}

function rateBucketKey(botId: string, ip: string): string {
  return `${botId}:${ip}`;
}

/** Fixed-window rate limit per bot + IP. Uses service-role client. */
export async function assertEmbedRateLimit(
  admin: SupabaseClient,
  botId: string,
  ip: string,
): Promise<void> {
  const key = rateBucketKey(botId, ip || "unknown");
  const now = Date.now();

  const { data: existing } = await admin
    .from("embed_rate_buckets")
    .select("bucket_key, request_count, window_started_at")
    .eq("bucket_key", key)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin.from("embed_rate_buckets").insert({
      bucket_key: key,
      request_count: 1,
      window_started_at: new Date(now).toISOString(),
    });
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  const windowStarted = new Date(existing.window_started_at as string).getTime();
  const elapsed = now - windowStarted;

  if (elapsed > EMBED_RATE_LIMIT_WINDOW_MS) {
    const { error } = await admin
      .from("embed_rate_buckets")
      .update({
        request_count: 1,
        window_started_at: new Date(now).toISOString(),
      })
      .eq("bucket_key", key);
    if (error) {
      throw new Error(error.message);
    }
    return;
  }

  if ((existing.request_count as number) >= EMBED_RATE_LIMIT_MAX_REQUESTS) {
    throw new EmbedLimitError(
      "Too many requests. Please wait a moment and try again.",
      429,
    );
  }

  const { error } = await admin
    .from("embed_rate_buckets")
    .update({
      request_count: (existing.request_count as number) + 1,
    })
    .eq("bucket_key", key);

  if (error) {
    throw new Error(error.message);
  }
}

export type EmbedSessionState = {
  messageCount: number;
  limit: number;
  conversationId: string | null;
};

/**
 * Ensure session exists and is under the per-session message cap.
 * Increments count when `consume` is true (after accepting the user message).
 */
export async function assertAndTouchEmbedSession(
  admin: SupabaseClient,
  botId: string,
  sessionId: string,
  consume: boolean,
): Promise<EmbedSessionState> {
  const { data: existing } = await admin
    .from("embed_sessions")
    .select("id, bot_id, message_count, conversation_id")
    .eq("id", sessionId)
    .maybeSingle();

  if (existing && existing.bot_id !== botId) {
    throw new EmbedLimitError("Invalid session for this bot.", 400);
  }

  const currentCount = (existing?.message_count as number | undefined) ?? 0;
  const conversationId =
    (existing?.conversation_id as string | null | undefined) ?? null;

  if (consume && currentCount >= EMBED_SESSION_MESSAGE_LIMIT) {
    throw new EmbedLimitError(
      "Session message limit reached. Refresh the page to start a new session.",
      429,
    );
  }

  const nextCount = consume ? currentCount + 1 : currentCount;
  const now = new Date().toISOString();

  if (!existing) {
    const { error } = await admin.from("embed_sessions").insert({
      id: sessionId,
      bot_id: botId,
      message_count: consume ? 1 : 0,
      created_at: now,
      last_seen_at: now,
    });
    if (error) {
      throw new Error(error.message);
    }
    return {
      messageCount: consume ? 1 : 0,
      limit: EMBED_SESSION_MESSAGE_LIMIT,
      conversationId: null,
    };
  }

  if (consume) {
    const { error } = await admin
      .from("embed_sessions")
      .update({
        message_count: nextCount,
        last_seen_at: now,
      })
      .eq("id", sessionId);
    if (error) {
      throw new Error(error.message);
    }
  } else {
    await admin
      .from("embed_sessions")
      .update({ last_seen_at: now })
      .eq("id", sessionId);
  }

  return {
    messageCount: nextCount,
    limit: EMBED_SESSION_MESSAGE_LIMIT,
    conversationId,
  };
}

export async function linkEmbedSessionConversation(
  admin: SupabaseClient,
  sessionId: string,
  conversationId: string,
): Promise<void> {
  const { error } = await admin
    .from("embed_sessions")
    .update({
      conversation_id: conversationId,
      last_seen_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(error.message);
  }
}

export function getRequestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

const MAX_ALLOWED_ORIGINS = BOT_ALLOWED_ORIGINS_MAX;

/** Extract browser site origin from Origin, falling back to Referer. */
export function getRequestOrigin(request: Request): string | null {
  const headerOrigin = request.headers.get("origin");
  if (headerOrigin && headerOrigin !== "null") {
    return headerOrigin;
  }

  // Same-origin GET often omits Origin; Referer still identifies the host page.
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Normalize a user-entered host, URL, or `*` (allow any site).
 * Bare hosts without a scheme default to https, except localhost / 127.0.0.1 → http.
 */
export function normalizeOriginInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed === "*") return "*";

  const hasScheme = /^https?:\/\//i.test(trimmed);
  let candidate = trimmed;
  if (!hasScheme) {
    const host = trimmed.split("/")[0]?.toLowerCase() ?? "";
    const isLocal =
      host === "localhost" ||
      host.startsWith("localhost:") ||
      host === "127.0.0.1" ||
      host.startsWith("127.0.0.1:");
    candidate = `${isLocal ? "http" : "https"}://${trimmed}`;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Parse textarea / comma-separated origin list for bot settings.
 * Empty input or a lone `*` → open embed (any website).
 * An origin already covers every path on that host (no per-page list needed).
 */
export function parseAllowedOriginsText(text: string): {
  origins: string[];
  error?: string;
} {
  const parts = text
    .split(/[\n,]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > MAX_ALLOWED_ORIGINS) {
    return {
      origins: [],
      error: `At most ${MAX_ALLOWED_ORIGINS} allowed origins.`,
    };
  }

  if (parts.some((part) => part === "*")) {
    return { origins: [] };
  }

  const origins: string[] = [];
  for (const part of parts) {
    const origin = normalizeOriginInput(part);
    if (!origin || origin === "*") {
      return {
        origins: [],
        error: `Invalid origin: ${part}`,
      };
    }
    if (!origins.includes(origin)) {
      origins.push(origin);
    }
  }

  return { origins };
}

export function isEmbedOriginAllowed(
  requestOrigin: string | null,
  allowedOrigins: string[],
): boolean {
  if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
    return true;
  }
  if (!requestOrigin || requestOrigin === "null") {
    return false;
  }
  const needle = requestOrigin.toLowerCase();
  return allowedOrigins.some((origin) => origin.toLowerCase() === needle);
}

/** Reject embed calls when the bot has an allowlist and the page origin is not on it. */
export function assertEmbedOrigin(
  request: Request,
  allowedOrigins: string[],
): void {
  if (allowedOrigins.length === 0 || allowedOrigins.includes("*")) {
    return;
  }
  const origin = getRequestOrigin(request);
  if (!isEmbedOriginAllowed(origin, allowedOrigins)) {
    throw new EmbedLimitError(
      "This bot is not allowed on this website.",
      403,
    );
  }
}

export function embedCorsHeaders(
  request?: Request,
  allowedOrigins?: string[],
): HeadersInit {
  const requestOrigin = request ? getRequestOrigin(request) : null;
  const allowAll =
    !allowedOrigins ||
    allowedOrigins.length === 0 ||
    allowedOrigins.includes("*");

  let allowOrigin = "*";
  if (requestOrigin && requestOrigin !== "null") {
    if (allowAll || isEmbedOriginAllowed(requestOrigin, allowedOrigins)) {
      allowOrigin = requestOrigin;
    } else {
      // Do not reflect an unauthorized Origin (browser will hide the body).
      allowOrigin = "null";
    }
  } else if (allowAll) {
    allowOrigin = "*";
  }

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}
