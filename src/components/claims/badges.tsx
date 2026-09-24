import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CATEGORY_META, RISK_LEVEL_META, STATUS_META } from "@/lib/meta";
import type { ClaimCategory, ClaimStatus, RiskLevel } from "@/lib/types";
import { CategoryIcon } from "@/components/claims/category-icon";

export function StatusBadge({
  status,
  className,
}: {
  status: ClaimStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <Badge
      variant="outline"
      className={cn(
        "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-4xl border border-transparent px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase transition-all duration-150 hover:-translate-y-px hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        meta.badgeClass,
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {meta.label}
    </Badge>
  );
}

export function CategoryBadge({
  category,
  className,
}: {
  category: ClaimCategory;
  className?: string;
}) {
  const meta = CATEGORY_META[category];
  return (
    <Badge
      variant="outline"
      className={cn(
        "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-4xl border border-transparent px-2.5 py-0.5 text-[11px] font-semibold uppercase transition-all duration-150 hover:-translate-y-px hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        meta.badgeClass,
        className
      )}
    >
      <CategoryIcon name={meta.icon} className="size-3" />
      {meta.label}
    </Badge>
  );
}

export function RiskLevelBadge({
  level,
  className,
}: {
  level: RiskLevel;
  className?: string;
}) {
  const meta = RISK_LEVEL_META[level];
  return (
    <Badge
      variant="outline"
      className={cn(
        "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-4xl border border-transparent px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase transition-all duration-150 hover:-translate-y-px hover:shadow-md focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        meta.badgeClass,
        className
      )}
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", meta.dotClass)} />
      {meta.label}
    </Badge>
  );
}
