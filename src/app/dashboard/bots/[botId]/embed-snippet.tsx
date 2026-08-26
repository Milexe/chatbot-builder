"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

export function EmbedSnippet({ botId }: { botId: string }) {
  const [copied, setCopied] = useState(false);
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const origin =
    envOrigin ||
    (typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000");

  const snippet = `<script\n  src="${origin}/widget.js"\n  data-bot-id="${botId}"\n  async\n></script>`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Paste this before <code className="text-xs">&lt;/body&gt;</code> on your
        site. Limits: owner monthly plan + 15 messages per visitor session + rate
        limit. Lock domains under Settings → Allowed embed origins (empty =
        any site).
      </p>
      <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed">
        {snippet}
      </pre>
      <Button type="button" size="sm" variant="outline" onClick={copy}>
        {copied ? "Copied" : "Copy snippet"}
      </Button>
    </div>
  );
}
