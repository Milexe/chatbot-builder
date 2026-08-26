"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfilePlan, requireUser } from "@/lib/auth/session";
import {
  DEFAULT_BOT_COLOR,
  DEFAULT_BOT_NAME,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_WELCOME_MESSAGE,
} from "@/lib/bot-defaults";
import { parseAllowedOriginsText } from "@/lib/embed-guards";
import { slugify, uniqueSlug } from "@/lib/slug";

export type BotActionState = {
  ok: boolean;
  message: string;
};

function parseBotFields(formData: FormData): {
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  systemPrompt: string;
  allowedOrigins: string[];
  error?: string;
} {
  const name =
    String(formData.get("name") ?? "").trim() || DEFAULT_BOT_NAME;
  const welcomeMessage =
    String(formData.get("welcome_message") ?? "").trim() ||
    DEFAULT_WELCOME_MESSAGE;
  const primaryColorRaw = String(formData.get("primary_color") ?? "").trim();
  const primaryColor = primaryColorRaw || DEFAULT_BOT_COLOR;
  const systemPrompt =
    String(formData.get("system_prompt") ?? "").trim() ||
    DEFAULT_SYSTEM_PROMPT;
  const allowedOriginsRaw = String(formData.get("allowed_origins") ?? "");
  const parsedOrigins = parseAllowedOriginsText(allowedOriginsRaw);

  if (name.length > 80) {
    return {
      name,
      welcomeMessage,
      primaryColor,
      systemPrompt,
      allowedOrigins: [],
      error: "Name must be 80 characters or fewer.",
    };
  }
  if (welcomeMessage.length > 500) {
    return {
      name,
      welcomeMessage,
      primaryColor,
      systemPrompt,
      allowedOrigins: [],
      error: "Welcome message must be 500 characters or fewer.",
    };
  }
  if (systemPrompt.length > 4000) {
    return {
      name,
      welcomeMessage,
      primaryColor,
      systemPrompt,
      allowedOrigins: [],
      error: "System prompt must be 4000 characters or fewer.",
    };
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
    return {
      name,
      welcomeMessage,
      primaryColor,
      systemPrompt,
      allowedOrigins: [],
      error: `Color must be a hex value like ${DEFAULT_BOT_COLOR}.`,
    };
  }
  if (parsedOrigins.error) {
    return {
      name,
      welcomeMessage,
      primaryColor,
      systemPrompt,
      allowedOrigins: [],
      error: parsedOrigins.error,
    };
  }

  return {
    name,
    welcomeMessage,
    primaryColor,
    systemPrompt,
    allowedOrigins: parsedOrigins.origins,
  };
}

export async function createBot(
  _prev: BotActionState,
  formData: FormData,
): Promise<BotActionState> {
  const { supabase, user } = await requireUser();
  const { plan } = await requireProfilePlan(supabase, user.id);
  const fields = parseBotFields(formData);
  if (fields.error) {
    return { ok: false, message: fields.error };
  }

  const { data: existingBots, error: botsError } = await supabase
    .from("bots")
    .select("slug")
    .eq("owner_id", user.id);

  if (botsError) {
    return { ok: false, message: botsError.message };
  }
  if ((existingBots?.length ?? 0) >= plan.limits.bots) {
    return {
      ok: false,
      message: `Your ${plan.name} plan allows ${plan.limits.bots} bot${plan.limits.bots === 1 ? "" : "s"}.`,
    };
  }

  const slug = uniqueSlug(
    slugify(fields.name),
    (existingBots ?? []).map((bot) => bot.slug as string),
  );

  const { data, error } = await supabase
    .from("bots")
    .insert({
      owner_id: user.id,
      name: fields.name,
      slug,
      welcome_message: fields.welcomeMessage,
      primary_color: fields.primaryColor,
      system_prompt: fields.systemPrompt,
      allowed_origins: fields.allowedOrigins,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  redirect(`/dashboard/bots/${data.id}`);
}

export async function updateBot(
  botId: string,
  _prev: BotActionState,
  formData: FormData,
): Promise<BotActionState> {
  const { supabase, user } = await requireUser();
  const fields = parseBotFields(formData);
  if (fields.error) {
    return { ok: false, message: fields.error };
  }

  const { data: bot } = await supabase
    .from("bots")
    .select("id")
    .eq("id", botId)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!bot) {
    return { ok: false, message: "Bot not found." };
  }

  const { data: existingBots } = await supabase
    .from("bots")
    .select("slug")
    .eq("owner_id", user.id)
    .neq("id", botId);

  const nextSlug = uniqueSlug(
    slugify(fields.name),
    (existingBots ?? []).map((row) => row.slug as string),
  );

  const { error } = await supabase
    .from("bots")
    .update({
      name: fields.name,
      slug: nextSlug,
      welcome_message: fields.welcomeMessage,
      primary_color: fields.primaryColor,
      system_prompt: fields.systemPrompt,
      allowed_origins: fields.allowedOrigins,
      updated_at: new Date().toISOString(),
    })
    .eq("id", botId)
    .eq("owner_id", user.id);

  if (error) {
    return { ok: false, message: error.message };
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/bots/${botId}`);
  return { ok: true, message: "Saved." };
}

export async function setBotPaused(botId: string, paused: boolean) {
  const { supabase, user } = await requireUser();

  const { error } = await supabase
    .from("bots")
    .update({
      is_public: !paused,
      updated_at: new Date().toISOString(),
    })
    .eq("id", botId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(
      `/dashboard/bots/${botId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/bots/${botId}`);
}

export async function deleteBot(botId: string) {
  const { supabase, user } = await requireUser();

  const { data: docs } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("bot_id", botId)
    .eq("owner_id", user.id);

  const paths = (docs ?? [])
    .map((doc) => doc.storage_path as string | null)
    .filter((path): path is string => Boolean(path));

  if (paths.length > 0) {
    await supabase.storage.from("documents").remove(paths);
  }

  const { error } = await supabase
    .from("bots")
    .delete()
    .eq("id", botId)
    .eq("owner_id", user.id);

  if (error) {
    redirect(
      `/dashboard/bots/${botId}?error=${encodeURIComponent(error.message)}`,
    );
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
