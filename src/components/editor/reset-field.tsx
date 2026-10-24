import { UndoIcon } from "@hugeicons-pro/core-stroke-rounded";

import { Icon } from "#/components/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import { m } from "#/paraglide/messages.js";

export const ResetField = ({
  label,
  onReset,
  show,
}: {
  label: string;
  onReset: () => void;
  show: boolean;
}) => {
  if (!show) {
    return null;
  }
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={m.ed_reset_field({ label })}
            className="text-muted-foreground hover:bg-surface hover:text-foreground focus-visible:ring-foreground/15 flex size-5 cursor-pointer items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2"
            onClick={onReset}
            type="button"
          />
        }
      >
        <Icon className="size-3.5" icon={UndoIcon} />
      </TooltipTrigger>
      <TooltipContent>{m.ed_reset_to_default()}</TooltipContent>
    </Tooltip>
  );
};
