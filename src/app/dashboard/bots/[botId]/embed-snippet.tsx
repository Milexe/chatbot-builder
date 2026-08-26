"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

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
        Paste before <code className="text-xs">&lt;/body&gt;</code>.
      </p>
      <div className="relative">
        <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-3 pr-12 text-xs leading-relaxed">
          {snippet}
        </pre>
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          className="absolute top-2 right-2"
          onClick={copy}
          aria-label={copied ? "Copied" : "Copy snippet"}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </Button>
      </div>
    </div>
  );
}
