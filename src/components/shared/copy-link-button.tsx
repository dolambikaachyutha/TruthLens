"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckIcon, LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Copies a shareable link to a claim page, confirming in place so the row
 * never shifts. Falls back to a legacy copy path when the async clipboard
 * API is unavailable.
 */
export function CopyLinkButton({
  claimId,
  className,
}: {
  claimId: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const reduceMotion = useReducedMotion();

  const handleCopy = async () => {
    const url = `${window.location.origin}/claims/${claimId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <span role="status" className="sr-only" aria-live="polite">
        {copied ? "Link copied to clipboard" : ""}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Link copied" : "Copy link to this claim"}
        className={cn(
          "inline-flex min-h-8 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          className
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {copied ? (
            <motion.span
              key="copied"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.13 }}
              className="inline-flex items-center gap-1.5 text-emerald-600"
            >
              <CheckIcon aria-hidden className="size-3.5" />
              Copied
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={reduceMotion ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.13 }}
              className="inline-flex items-center gap-1.5"
            >
              <LinkIcon aria-hidden className="size-3.5" />
              Copy link
            </motion.span>
          )}
        </AnimatePresence>
      </button>
    </>
  );
}
