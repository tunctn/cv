import { HugeiconsIcon } from "@hugeicons/react";
import type { HugeiconsIconProps } from "@hugeicons/react";

export type { IconSvgElement } from "@hugeicons/react";

/** One stroke weight for every icon; reads right next to Inter at 14–16px. */
export const ICON_STROKE = 1.75;

export const Icon = ({
  strokeWidth = ICON_STROKE,
  "aria-hidden": ariaHidden = true,
  ...props
}: HugeiconsIconProps) => (
  <HugeiconsIcon
    aria-hidden={ariaHidden}
    strokeWidth={strokeWidth}
    {...props}
  />
);
