import type { Metadata } from "next";
import Link from "next/link";
import { SearchXIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Claim not found",
};

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center justify-center py-24 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted text-navy ring-1 ring-border">
        <SearchXIcon aria-hidden className="size-7" />
      </div>
      <p className="section-label mt-6 text-cyan-signal">404</p>
      <h1 className="mt-3 font-heading text-3xl font-normal tracking-tight text-foreground">
        This claim isn’t on the desk
      </h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
        The ID may be mistyped, or the claim is no longer on the desk.
        Browse the public feed to pick up where you left off.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button
          render={<Link href="/feed" />}
          nativeButton={false}
          className="h-10 rounded-full bg-navy px-5 text-white hover:bg-navy-deep"
        >
          Back to public feed
        </Button>
        <Button
          render={<Link href="/" />}
          nativeButton={false}
          variant="outline"
          className="h-9 bg-white"
        >
          Go home
        </Button>
      </div>
    </div>
  );
}
