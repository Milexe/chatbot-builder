"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireProfilePlan, requireUser } from "@/lib/auth/session";
import { parseAllowedOriginsText } from "@/lib/embed-guards";
import { slugify, uniqueSlug } from "@/lib/slug";

export type BotActionState = {
  ok: boolean;
  message: string;
};

const DEFAULT_COLOR = "#111827";

function parseBotFields(formData: FormData): {
  name: string;
  welcomeMessage: string;
  primaryColor: string;
  allowedOrigins: string[];
  error?: string;
} {
  const name = String(formData.get("name") ?? "").trim();
  const welcomeMessage = String(formData.get("welcome_message") ?? "").trim();
  const primaryColor = String(formData.get("primary_color") ?? DEFAULT_COLOR).trim();
  const allowedOriginsRaw = String(formData.get("allowed_origins") ?? "");
  const parsedOrigins = parseAllowedOriginsText(allowedOriginsRaw);

  if (!name) {
    return {
      name,
      welcomeMessage,
      primaryColor,
      allowedOrigins: [],
      error: "Name is required.",
    };
  }
  if (name.length > 80) {
    return {
      name,
      welcomeMessage,
      primaryColor,
      allowedOrigins: [],
      error: "Name must be 80 characters or fewer.",
    };
  }
  if (welcomeMessage.length > 500) {
    return {
      name,
      welcomeMessage,
      primaryColor,
      allowedOrigins: [],
      error: "Welcome message must be 500 characters or fewer.",
    };
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(primaryColor)) {
    return {
      name,
      welcomeMessage,
      primaryColor,
      allowedOrigins: [],
      error: "Color must be a hex value like #111827.",
    };
  }
  if (parsedOrigins.error) {
    return {
      name,
      welcomeMessage,
      primaryColor,
      allowedOrigins: [],
      error: parsedOrigins.error,
    };
  }

  return {
    name,
    welcomeMessage:
      welcomeMessage || "Hi! Ask me anything about our docs.",
    primaryColor,
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

  const { count, error: countError } = await supabase
    .from("bots")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", user.id);

  if (countError) {
    return { ok: false, message: countError.message };
  }
  if ((count ?? 0) >= plan.limits.bots) {
    return {
      ok: false,
      message: `Your ${plan.name} plan allows ${plan.limits.bots} bot${plan.limits.bots === 1 ? "" : "s"}.`,
    };
  }

  const { data: existingBots } = await supabase
    .from("bots")
    .select("slug")
    .eq("owner_id", user.id);

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
    .select("id, slug, owner_id")
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
  return { ok: true, message: "Bot updated." };
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
    redirect(`/dashboard/bots/${botId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
