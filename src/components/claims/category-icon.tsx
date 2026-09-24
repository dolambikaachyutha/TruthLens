import type { SVGProps } from "react";
import {
  CircleDollarSignIcon,
  HeartPulseIcon,
  LandmarkIcon,
  LayersIcon,
} from "lucide-react";

const icons = {
  landmark: LandmarkIcon,
  heart: HeartPulseIcon,
  finance: CircleDollarSignIcon,
  layers: LayersIcon,
} as const;

export type CategoryIconName = keyof typeof icons;

export function CategoryIcon({
  name,
  ...props
}: { name: CategoryIconName } & SVGProps<SVGSVGElement>) {
  const Icon = icons[name];
  return <Icon aria-hidden="true" {...props} />;
}
