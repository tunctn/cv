import { Add01Icon } from "@hugeicons-pro/core-stroke-rounded";

import { Icon } from "#/components/icon";
import { m } from "#/paraglide/messages.js";

export const NewCvTile = ({
  creating,
  onCreate,
}: {
  creating: boolean;
  onCreate: () => void;
}) => (
  <div>
    <button
      aria-label={m.new_tile_title()}
      className="group/new hover:bg-surface focus-visible:ring-ring/50 flex w-full cursor-pointer flex-col overflow-hidden rounded-[24px] border border-dashed border-[#dcdcdc] px-5 pt-5 text-start transition-colors outline-none hover:border-[#bdbdbd] focus-visible:ring-3 disabled:cursor-default disabled:opacity-60 sm:px-7 sm:pt-7"
      disabled={creating}
      onClick={onCreate}
      type="button"
    >
      <div className="flex aspect-[794/1123] w-full items-center justify-center">
        <span className="bg-foreground text-background flex size-12 items-center justify-center rounded-full transition-transform group-hover/new:scale-105">
          <Icon className="size-5" icon={Add01Icon} />
        </span>
      </div>
    </button>
    <div className="mt-3 px-1">
      <p className="text-[15px] font-medium">
        {creating ? m.common_creating() : m.new_tile_title()}
      </p>
      <p className="text-muted-foreground text-[13px]">{m.new_tile_body()}</p>
    </div>
  </div>
);
