"use client";

import { useEffect, useState } from "react";

function isLauncherVisible(): boolean {
  const root = document.getElementById("chatbot-builder-widget-root");
  const shadow = root?.shadowRoot;
  if (!shadow) return false;

  const wrap = shadow.querySelector(".wrap") as HTMLElement | null;
  const launcher = shadow.querySelector(".launcher") as HTMLElement | null;
  if (!wrap || !launcher) return false;
  if (wrap.style.visibility === "hidden") return false;
  if (wrap.style.display === "none") return false;

  const styles = window.getComputedStyle(launcher);
  return styles.display !== "none" && styles.visibility !== "hidden";
}

/**
 * Corner hint — frosted label, only after the embed launcher is visible.
 */
export function DemoWidgetHint() {
  const [launcherReady, setLauncherReady] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    function onVisibility(event: Event) {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setChatOpen(Boolean(detail?.open));
      if (!detail?.open && isLauncherVisible()) {
        setLauncherReady(true);
      }
    }

    function onReady() {
      if (isLauncherVisible()) {
        setLauncherReady(true);
      }
    }

    window.addEventListener("chatbot-builder:visibility", onVisibility);
    window.addEventListener("chatbot-builder:ready", onReady);

    const timer = window.setInterval(() => {
      if (isLauncherVisible()) {
        setLauncherReady(true);
        window.clearInterval(timer);
      }
    }, 120);

    return () => {
      window.removeEventListener("chatbot-builder:visibility", onVisibility);
      window.removeEventListener("chatbot-builder:ready", onReady);
      window.clearInterval(timer);
    };
  }, []);

  if (!launcherReady || chatOpen) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-[4.25rem] right-[4.25rem] z-[2147482990] sm:bottom-[4.5rem] sm:right-[4.5rem]"
      aria-hidden
    >
      <div className="origin-bottom-right -rotate-[16deg] rounded-xl bg-background/45 px-3 py-2 backdrop-blur-md supports-backdrop-filter:bg-background/35">
        <div className="flex flex-col items-end gap-0.5">
          <p className="font-heading text-sm font-semibold tracking-tight text-primary">
            Try live chat!
          </p>
          <span className="animate-cbb-nudge mr-0.5 font-heading text-3xl font-bold leading-none text-primary">
            ↘
          </span>
        </div>
      </div>
    </div>
  );
}
