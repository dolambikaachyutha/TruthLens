import type { Metadata } from "next";
import { Gilda_Display, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const gildaDisplay = Gilda_Display({
  variable: "--font-serif",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TruthLens — See the signal. Follow the evidence.",
    template: "%s · TruthLens",
  },
  description:
    "TruthLens is an open civic-tech misinformation triage platform. Human reviewers investigate claims with traceable evidence. No automated verdicts.",
  applicationName: "TruthLens",
  keywords: [
    "misinformation",
    "fact-checking",
    "claim review",
    "civic tech",
    "evidence-based",
    "media literacy",
  ],
  openGraph: {
    title: "TruthLens — See the signal. Follow the evidence.",
    description:
      "An open triage platform where human reviewers investigate claims with evidence — never automated verdicts.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${gildaDisplay.variable} h-full antialiased`}
    >
      <body className="flex min-h-svh flex-col bg-background text-foreground">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-10 opacity-[0.45] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='2.5' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
            backgroundSize: "150px 150px",
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Skip to main content
        </a>
        <TooltipProvider>
          <SiteHeader />
          <main
            id="main-content"
            tabIndex={-1}
            className="relative z-0 flex flex-1 flex-col outline-none"
          >
            {children}
          </main>
          <SiteFooter />
          <Toaster position="bottom-right" closeButton />
        </TooltipProvider>
      </body>
    </html>
  );
}
