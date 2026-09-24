import Link from "next/link";
import { InfoIcon } from "lucide-react";
import { LogoMark } from "@/components/layout/logo-mark";

const footerNav = [
  { href: "/feed", label: "Public feed" },
  { href: "/submit", label: "Submit a claim" },
  { href: "/review", label: "Reviewer workspace" },
  { href: "/methodology", label: "Methodology" },
];

const principleLinks = [
  { href: "/methodology", label: "Risk signals" },
  { href: "/methodology", label: "Review statuses" },
  { href: "/methodology", label: "Evidence notes" },
];

export function SiteFooter() {
  return (
    <footer
      role="contentinfo"
      className="relative overflow-hidden border-t border-neutral-800/60 bg-neutral-950 pt-20 pb-10 text-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(37,99,235,0.06),transparent)]"
      />
      <div className="container-page relative">
        <div className="mb-14 grid gap-10 border-b border-neutral-800/60 pb-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <Link href="/" className="group mb-5 inline-flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white transition-transform duration-300 group-hover:scale-105">
                <LogoMark className="size-5" />
              </span>
              <span className="font-mono text-sm font-bold tracking-[0.14em] text-white uppercase">
                TruthLens
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-neutral-400">
              A public triage desk for circulating claims. Signals first, evidence
              always, verdicts only from reviewers.
            </p>
            <p className="mt-5 max-w-sm text-xs leading-relaxed text-neutral-500">
              No login required · Claims and review history are public
            </p>
          </div>

          <nav aria-label="Footer" className="lg:col-span-3">
            <h4 className="section-label mb-4 text-blue-400/90">Navigate</h4>
            <ul className="space-y-0.5">
              {footerNav.map((link, i) => (
                <li key={link.label} className={i > 0 ? "border-t border-neutral-800/40" : ""}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 py-2 text-sm text-neutral-400 transition-colors hover:text-white"
                  >
                    <span className="size-1 shrink-0 rounded-full bg-neutral-700 transition-colors group-hover:bg-blue-400" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="lg:col-span-4">
            <h4 className="section-label mb-4 text-blue-400/90">Good to know</h4>
            <p className="flex gap-2 text-sm leading-relaxed text-neutral-400">
              <InfoIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-blue-400" />
              <span>
                Risk flags are triage signals, not factual verdicts. No claim is
                ever labeled true or false by automation.
              </span>
            </p>
            <ul className="mt-5 space-y-0.5">
              {principleLinks.map((link, i) => (
                <li key={link.label} className={i > 0 ? "border-t border-neutral-800/40" : ""}>
                  <Link
                    href={link.href}
                    className="group flex items-center gap-2 py-2 text-sm text-neutral-400 transition-colors hover:text-white"
                  >
                    <span className="size-1 shrink-0 rounded-full bg-neutral-700 transition-colors group-hover:bg-blue-400" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <p className="font-mono text-[11px] tracking-[0.15em] text-neutral-600 uppercase">
            © 2026 TruthLens · Built for civic transparency
          </p>
          <p className="font-mono text-[11px] tracking-[0.15em] text-neutral-600 uppercase">
            See the signal. Follow the evidence.
          </p>
        </div>
      </div>
    </footer>
  );
}
