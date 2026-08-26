"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

function scrollToPageTop() {
  window.history.replaceState(null, "", window.location.pathname);
  // Instant jump — smooth scroll was stopping short of the true top.
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/** Brand mark that scrolls to the true top when already on the home page. */
export function BrandLink({
  className,
  children = "Chatbot Builder",
}: {
  className?: string;
  children?: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <Link
      href="/"
      className={cn(className)}
      onClick={(event) => {
        if (pathname !== "/") return;
        event.preventDefault();
        scrollToPageTop();
      }}
    >
      {children}
    </Link>
  );
}
