"use client";

import { useEffect, useRef } from "react";

import { removeChatbotBuilderWidgetDom } from "@/lib/demo-widget-dom";

/**
 * Mounts exactly one embed widget for the landing demo.
 * Guards against React Strict Mode double-mount creating two launchers.
 */
export function DemoWidgetMount({
  botId,
  widgetOrigin,
}: {
  botId: string;
  widgetOrigin: string;
}) {
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    removeChatbotBuilderWidgetDom();

    const script = document.createElement("script");
    script.src = `${widgetOrigin.replace(/\/$/, "")}/widget.js`;
    script.async = true;
    script.dataset.botId = botId;
    script.dataset.cbbDemoWidget = "true";
    document.body.appendChild(script);

    return () => {
      mountedRef.current = false;
      script.remove();
      removeChatbotBuilderWidgetDom();
    };
  }, [botId, widgetOrigin]);

  return null;
}
