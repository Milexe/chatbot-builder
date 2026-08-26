"use client";

import { useEffect } from "react";

import { removeChatbotBuilderWidgetDom } from "@/lib/demo-widget-dom";

/** Removes any leftover landing demo widget when authenticated app routes mount. */
export function RemoveDemoWidget() {
  useEffect(() => {
    removeChatbotBuilderWidgetDom();
  }, []);

  return null;
}
