"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MenuIcon, XIcon } from "lucide-react";
import { LogoGlyph } from "@/components/layout/logo-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/feed", label: "Feed" },
  { href: "/review", label: "Review" },
  { href: "/methodology", label: "Methodology" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/feed") return pathname === "/feed" || pathname.startsWith("/claims");
  return pathname === href;
}

export function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <header className="sticky top-0 z-50 border-b border-border/15 bg-background/95 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center justify-between gap-4 md:h-[4.5rem]">
        <Link
          href="/"
          className="group flex min-w-[140px] items-center gap-3 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={() => setMenuOpen(false)}
          aria-label="TruthLens - Home"
        >
          <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-foreground text-background transition-transform duration-300 group-hover:scale-105">
            <LogoGlyph className="size-5" />
          </span>
          <span className="hidden flex-col leading-none sm:flex">
            <span className="font-mono text-sm font-bold tracking-[0.12em] text-foreground uppercase">
              TruthLens
            </span>
            <span className="mt-1 hidden text-[10px] tracking-wide text-muted-foreground uppercase lg:block">
              See the signal
            </span>
          </span>
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-0 lg:flex xl:gap-1"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
              className={cn(
                "inline-flex h-10 items-center rounded-md px-2.5 font-mono text-[11px] font-bold tracking-[0.16em] uppercase transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 xl:px-3 xl:text-xs",
                isActive(pathname, link.href)
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden min-w-[180px] justify-end lg:flex">
          <Button
            render={<Link href="/submit" />}
            nativeButton={false}
            className="h-11 rounded-full bg-primary px-6 font-mono text-xs font-semibold tracking-[0.12em] text-primary-foreground uppercase shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
          >
            Submit
          </Button>
        </div>

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          onClick={() => setMenuOpen((open) => !open)}
          className="inline-flex size-11 items-center justify-center rounded-full border border-border/50 text-foreground transition-colors hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"
        >
          {menuOpen ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            id="mobile-nav"
            key="mobile-nav"
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
            className="overflow-hidden border-t border-border/15 bg-background/98 backdrop-blur-xl lg:hidden"
          >
            <nav aria-label="Mobile" className="container-page flex flex-col gap-1 py-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(pathname, link.href) ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2.5 font-mono text-xs font-bold tracking-[0.14em] uppercase transition-colors",
                    isActive(pathname, link.href)
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground/80 hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Button
                render={<Link href="/submit" />}
                nativeButton={false}
                onClick={() => setMenuOpen(false)}
                className="mt-2 h-11 w-full rounded-full bg-primary font-mono text-xs font-semibold tracking-[0.12em] text-primary-foreground uppercase"
              >
                Submit a claim
              </Button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
