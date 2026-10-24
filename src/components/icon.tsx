import { HugeiconsIcon, type HugeiconsIconProps } from "@hugeicons/react";

export type { IconSvgElement } from "@hugeicons/react";

/** One stroke weight for every icon; reads right next to Inter at 14–16px. */
export const ICON_STROKE = 1.75;

/**
 * Hugeicons Pro (stroke rounded) icon. Size it with a `size-*` class like
 * any svg; extra props (data-icon, aria-*, style) land on the <svg>.
 */
export function Icon({
  strokeWidth = ICON_STROKE,
  "aria-hidden": ariaHidden = true,
  ...props
}: HugeiconsIconProps) {
  return (
    <HugeiconsIcon
      aria-hidden={ariaHidden}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}
