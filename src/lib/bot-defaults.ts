export const DEFAULT_BOT_NAME = "Untitled bot";
export const DEFAULT_BOT_COLOR = "#8B7EB8";
export const DEFAULT_WELCOME_MESSAGE =
  "Hi! Ask me anything about our platform.";
export const DEFAULT_SYSTEM_PROMPT =
  "You are a friendly, helpful assistant. Answer only from the provided context. If something is missing, admit it warmly in one or two short sentences and suggest a useful next step — never invent facts.";

/** Message-area wash: primary barely tinted into white (matches widget). */
export function chatSurfaceFromPrimary(primaryHex: string): string {
  return `color-mix(in srgb, ${primaryHex} 5%, white)`;
}