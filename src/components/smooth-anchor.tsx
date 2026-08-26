"use client";

import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type SmoothAnchorProps = ComponentProps<"a"> & {
  href: `#${string}` | `/${string}#${string}`;
};

const STICKY_HEADER_OFFSET_PX = 64;

function resolveTargetId(href: string): string | null {
  const hashIndex = href.indexOf("#");
  if (hashIndex === -1) return null;
  const id = href.slice(hashIndex + 1);
  return id || null;
}

function isSamePageAnchor(href: string): boolean {
  if (href.startsWith("#")) return true;
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(href, window.location.href);
    return (
      url.pathname === window.location.pathname && Boolean(url.hash.slice(1))
    );
  } catch {
    return false;
  }
}

function scrollToId(id: string) {
  const target = document.getElementById(id);
  if (!target) return;

  const top = Math.max(
    0,
    target.getBoundingClientRect().top +
      window.scrollY -
      STICKY_HEADER_OFFSET_PX,
  );
  window.scrollTo({ top, behavior: "smooth" });
  window.history.replaceState(null, "", `#${id}`);
}

/** Smooth-scrolls even when the URL hash is already the same target. */
export function SmoothAnchor({
  href,
  className,
  onClick,
  children,
  ...rest
}: SmoothAnchorProps) {
  return (
    <a
      href={href}
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (!isSamePageAnchor(href)) return;

        const id = resolveTargetId(href);
        if (!id) return;

        event.preventDefault();
        scrollToId(id);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
