"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { CircleCheckIcon, SendIcon, ThumbsUpIcon, Link2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RiskAnalysisPanel } from "@/components/submit/risk-analysis-panel";
import { RiskLevelBadge } from "@/components/claims/badges";
import { DeleteClaimButton } from "@/components/claims/delete-claim-button";
import { useAutomation } from "@/hooks/use-automation";
import { CATEGORY_OPTIONS, RISK_LEVEL_META } from "@/lib/meta";
import { PLATFORM_OPTIONS, PLATFORM_PLACEHOLDER } from "@/lib/platform-meta";
import { analyzeClaim } from "@/lib/risk-analysis";
import { createClaim, findSimilarForVote, saveClaim, voteSameClaim } from "@/lib/claim-store";
import { saveSubmission } from "@/lib/mock-submissions";
import { claimFormSchema, type ClaimFormValues } from "@/lib/validation";
import type { Claim, ClaimCategory, Platform, RiskFlag, RiskLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const CATEGORY_ITEMS = CATEGORY_OPTIONS.filter((option) => option.value !== "all");

export function ClaimForm() {
  const [lastClaim, setLastClaim] = useState<Claim | null>(null);
  const [similarMatches, setSimilarMatches] = useState<
    { id: string; title: string; body: string; score: number }[]
  >([]);
  const [pendingValues, setPendingValues] = useState<ClaimFormValues | null>(null);
  const [votedMatchId, setVotedMatchId] = useState<string | null>(null);
  const { runAutomation } = useAutomation();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClaimFormValues>({
    resolver: zodResolver(claimFormSchema),
    defaultValues: {
      claimText: "",
      platform: "",
      category: "",
      sourceUrl: "",
    },
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const claimTextValue = useWatch({ control, name: "claimText" }) ?? "";
  const sourceUrlValue = useWatch({ control, name: "sourceUrl" }) ?? "";
  const platformValue = useWatch({ control, name: "platform" }) ?? "";
  const categoryValue = useWatch({ control, name: "category" }) ?? "";

  const engaged = claimTextValue.trim().length > 0;
  const liveAnalysis = useMemo(
    () => analyzeClaim({ claimText: claimTextValue, sourceUrl: sourceUrlValue }),
    [claimTextValue, sourceUrlValue]
  );

  async function onSubmit(values: ClaimFormValues) {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const matches = findSimilarForVote(values.claimText, 3);
    if (matches.length > 0) {
      setSimilarMatches(matches);
      setPendingValues(values);
      setVotedMatchId(null);
      return;
    }

    await createNewClaim(values);
  }

  async function createNewClaim(values: ClaimFormValues) {
    const analysis = analyzeClaim(values);
    const sourceUrl = values.sourceUrl.trim() === "" ? null : values.sourceUrl.trim();

    saveSubmission({
      claimText: values.claimText,
      platform: values.platform as Platform,
      category: values.category as ClaimCategory,
      sourceUrl,
    });

    const claim = createClaim({
      claimText: values.claimText,
      category: values.category as ClaimCategory,
      sourceUrl,
      riskFlags: analysis.flags as RiskFlag[],
      riskLevel: analysis.riskLevel as RiskLevel,
      platform: values.platform,
    });

    const queued: Claim = {
      ...claim,
      automationStatus: "queued",
    };
    saveClaim(queued);
    setLastClaim(queued);
    setSimilarMatches([]);
    setPendingValues(null);
    setVotedMatchId(null);

    toast.success("Claim saved to the local queue.", {
      description: `${analysis.flags.length} triage signal${
        analysis.flags.length === 1 ? "" : "s"
      } · ${RISK_LEVEL_META[analysis.riskLevel].label} · status Unverified`,
    });

    runAutomation(queued.id).catch((err: unknown) => {
      console.error("[VerityQueue] Automation error for claim", queued.id, err);
    });
  }

  function voteOnMatch(matchId: string) {
    const updated = voteSameClaim(matchId);
    if (updated) {
      setVotedMatchId(matchId);
      toast.success("Marked as the same claim.", {
        description: "Your report adds to the public same-claim count — not a truth judgment.",
      });
    }
  }

  function continueAsNewClaim() {
    if (pendingValues) void createNewClaim(pendingValues);
  }

  function dismissSimilar() {
    setSimilarMatches([]);
    setPendingValues(null);
    setVotedMatchId(null);
  }

  function resetForm() {
    reset({
      claimText: "",
      platform: "",
      category: "",
      sourceUrl: "",
    });
    setLastClaim(null);
    setSimilarMatches([]);
    setPendingValues(null);
    setVotedMatchId(null);
  }

  if (votedMatchId && similarMatches.length > 0) {
    const match = similarMatches.find((m) => m.id === votedMatchId);
    return (
      <div
        className="rounded-xl border border-blue-200 bg-blue-50/70 p-6 shadow-sm sm:p-8"
        data-testid="submit-same-claim-voted"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-white text-blue-600 ring-1 ring-blue-200">
          <ThumbsUpIcon aria-hidden className="size-6" />
        </div>
        <h2 className="mt-4 font-heading text-xl font-normal text-blue-900">
          Same claim recorded
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-blue-800/80">
          You marked an existing public claim as the one you wanted to post. The
          same-claim count is a community signal — never a truth judgment. The
          original claim text and review history are unchanged.
        </p>
        {match && (
          <blockquote className="mt-4 rounded-lg border border-blue-200 bg-white/70 p-4 text-sm text-navy">
            “{match.title}”
          </blockquote>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            render={<Link href={`/claims/${votedMatchId}`} />}
            nativeButton={false}
            className="h-9 bg-navy font-semibold text-white hover:bg-navy-deep"
            data-testid="view-same-claim"
          >
            View claim &amp; evidence
          </Button>
          <Button
            type="button"
            onClick={resetForm}
            variant="outline"
            className="h-9 bg-white"
          >
            Submit a different claim
          </Button>
          <Button
            render={<Link href="/feed" />}
            nativeButton={false}
            variant="outline"
            className="h-9 bg-white"
          >
            Browse the public feed
          </Button>
        </div>
      </div>
    );
  }

  if (similarMatches.length > 0 && pendingValues) {
    return (
      <div
        className="rounded-xl border border-amber-200 bg-amber-50/70 p-6 shadow-sm sm:p-8"
        data-testid="submit-similar-found"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-white text-amber-600 ring-1 ring-amber-200">
          <Link2Icon aria-hidden className="size-6" />
        </div>
        <h2 className="mt-4 font-heading text-xl font-normal text-amber-900">
          Similar claims already on the desk
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-amber-800/80">
          These public claims look like what you wanted to post. Vote “Same
          claim” to add your report to the count, or continue and post a new
          claim if yours is different.
        </p>
        <ul className="mt-5 space-y-3">
          {similarMatches.map((match) => (
            <li
              key={match.id}
              className="rounded-lg border border-amber-200 bg-white/80 p-4"
              data-testid={`similar-match-${match.id}`}
            >
              <p className="text-sm font-medium text-navy">{match.title}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => voteOnMatch(match.id)}
                  className="h-9 rounded-full bg-navy px-4 text-xs font-semibold text-white hover:bg-navy-deep"
                  data-testid={`vote-similar-${match.id}`}
                >
                  <ThumbsUpIcon aria-hidden className="size-3.5" />
                  Same claim — vote
                </Button>
                <Button
                  render={<Link href={`/claims/${match.id}`} />}
                  nativeButton={false}
                  variant="outline"
                  className="h-9 rounded-full bg-white px-4 text-xs"
                >
                  Open claim
                </Button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3 border-t border-amber-200 pt-5">
          <Button
            type="button"
            onClick={continueAsNewClaim}
            className="h-10 bg-navy px-5 font-semibold text-white hover:bg-navy-deep"
            data-testid="continue-new-claim"
          >
            <SendIcon aria-hidden className="size-4" />
            Post as a new claim anyway
          </Button>
          <Button
            type="button"
            onClick={dismissSimilar}
            variant="outline"
            className="h-10 bg-white"
          >
            Edit my claim text
          </Button>
        </div>
      </div>
    );
  }

  if (lastClaim) {
    return (
      <div
        className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-6 shadow-sm sm:p-8"
        data-testid="submit-success"
      >
        <div className="flex size-12 items-center justify-center rounded-full bg-white text-emerald-600 ring-1 ring-emerald-200">
          <CircleCheckIcon aria-hidden className="size-6" />
        </div>
        <h2 className="mt-4 font-heading text-xl font-normal text-emerald-900">
          Claim saved to the local queue
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-emerald-800/80">
          Stored on the shared public queue — visible to everyone. Status: <strong>Unverified</strong>. The automated evidence desk is
          gathering references — it will not change this status. Flags below
          are triage signals — not truth judgments.
        </p>
        <blockquote className="mt-4 rounded-lg border border-emerald-200 bg-white/70 p-4 text-sm text-navy">
          “{lastClaim.body}”
        </blockquote>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <RiskLevelBadge level={lastClaim.riskLevel} />
          {lastClaim.riskFlags.map((flag) => (
            <span
              key={flag.code}
              className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800"
            >
              {flag.label}
            </span>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            render={<Link href={`/claims/${lastClaim.id}`} />}
            nativeButton={false}
            className="h-9 bg-navy font-semibold text-white hover:bg-navy-deep"
            data-testid="view-claim"
          >
            View claim &amp; evidence
          </Button>
          <Button
            type="button"
            onClick={resetForm}
            variant="outline"
            className="h-9 bg-white"
          >
            Submit another claim
          </Button>
          <Button
            render={<Link href="/feed" />}
            nativeButton={false}
            variant="outline"
            className="h-9 bg-white"
          >
            Browse the public feed
          </Button>
          <div className="ml-auto">
            <DeleteClaimButton
              claimId={lastClaim.id}
              onDeleted={resetForm}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-7"
    >
      <div className="space-y-1.5">
        <Label htmlFor="claim-text" className="text-navy">
          Claim text <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="claim-text"
          rows={6}
          placeholder="Paste the claim exactly as it circulated…"
          aria-invalid={errors.claimText ? true : undefined}
          aria-describedby={errors.claimText ? "claim-text-error" : undefined}
          className={cn("min-h-32", errors.claimText && "border-destructive")}
          {...register("claimText")}
        />
        {errors.claimText && (
          <p id="claim-text-error" role="alert" className="text-xs font-medium text-destructive">
            {errors.claimText.message}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="claim-platform" className="text-navy">
            Platform <span className="text-destructive">*</span>
          </Label>
          <Select
            value={platformValue === "" ? null : platformValue}
            onValueChange={(value) =>
              setValue("platform", value ?? "", {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            itemToStringLabel={(value) =>
              PLATFORM_OPTIONS.find((option) => option.value === value)?.label ??
              String(value)
            }
          >
            <SelectTrigger
              id="claim-platform"
              aria-invalid={errors.platform ? true : undefined}
              aria-describedby={errors.platform ? "claim-platform-error" : undefined}
              className={cn("h-9 w-full", errors.platform && "border-destructive")}
            >
              <SelectValue placeholder={PLATFORM_PLACEHOLDER} />
            </SelectTrigger>
            <SelectContent>
              {PLATFORM_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.platform && (
            <p id="claim-platform-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.platform.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="claim-category" className="text-navy">
            Category <span className="text-destructive">*</span>
          </Label>
          <Select
            value={categoryValue === "" ? null : categoryValue}
            onValueChange={(value) =>
              setValue("category", value ?? "", {
                shouldValidate: true,
                shouldDirty: true,
              })
            }
            itemToStringLabel={(value) =>
              CATEGORY_ITEMS.find((option) => option.value === value)?.label ??
              String(value)
            }
          >
            <SelectTrigger
              id="claim-category"
              aria-invalid={errors.category ? true : undefined}
              aria-describedby={errors.category ? "claim-category-error" : undefined}
              className={cn("h-9 w-full", errors.category && "border-destructive")}
            >
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_ITEMS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p id="claim-category-error" role="alert" className="text-xs font-medium text-destructive">
              {errors.category.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="claim-source" className="text-navy">
          Source URL{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input
          id="claim-source"
          type="url"
          inputMode="url"
          placeholder="https://…"
          aria-invalid={errors.sourceUrl ? true : undefined}
          aria-describedby={errors.sourceUrl ? "claim-source-error" : undefined}
          className={cn("h-9", errors.sourceUrl && "border-destructive")}
          {...register("sourceUrl")}
        />
        {errors.sourceUrl && (
          <p id="claim-source-error" role="alert" className="text-xs font-medium text-destructive">
            {errors.sourceUrl.message}
          </p>
        )}
      </div>

      <RiskAnalysisPanel
        engaged={engaged}
        flags={liveAnalysis.flags}
        riskLevel={liveAnalysis.riskLevel}
        uppercaseRatioPercent={Math.round(liveAnalysis.uppercaseRatio * 100)}
      />

      <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Claim text, platform, and category are required. Submissions join
          the shared public queue so every visitor sees the same claims.
        </p>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-10 shrink-0 bg-navy px-5 font-semibold text-white hover:bg-navy-deep"
        >
          {isSubmitting ? (
            <>
              <span
                aria-hidden
                className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
              Saving…
            </>
          ) : (
            <>
              <SendIcon aria-hidden className="size-4" />
              Submit claim
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
