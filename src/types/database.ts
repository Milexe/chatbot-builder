export type PlanId = "free" | "pro" | "business";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  plan: PlanId;
  messages_used_this_month: number;
  messages_period_start: string;
};

export type BotRow = {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  system_prompt: string;
  welcome_message: string;
  primary_color: string;
  allowed_origins: string[];
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export type DocumentRow = {
  id: string;
  bot_id: string;
  owner_id: string;
  file_name: string;
  storage_path: string | null;
  mime_type: string | null;
  byte_size: number | null;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
