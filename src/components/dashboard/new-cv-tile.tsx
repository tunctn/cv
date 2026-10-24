import { Add01Icon } from "@hugeicons-pro/core-stroke-rounded";
import { Icon } from "#/components/icon";
import { m } from "#/paraglide/messages.js";

export function NewCvTile({
  creating,
  onCreate,
}: {
  creating: boolean;
  onCreate: () => void;
}) {
  return (
    <div>
      <button
        className="group/new flex w-full cursor-pointer flex-col overflow-hidden rounded-[24px] border border-[#dcdcdc] border-dashed px-5 pt-5 text-start outline-none transition-colors hover:border-[#bdbdbd] hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default disabled:opacity-60 sm:px-7 sm:pt-7"
        disabled={creating}
        onClick={onCreate}
        type="button"
      >
        <div className="flex aspect-[794/1123] w-full items-center justify-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-foreground text-background transition-transform group-hover/new:scale-105">
            <Icon className="size-5" icon={Add01Icon} />
          </span>
        </div>
      </button>
      <div className="mt-3 px-1">
        <p className="font-medium text-[15px]">
          {creating ? m.common_creating() : m.new_tile_title()}
        </p>
        <p className="text-[13px] text-muted-foreground">{m.new_tile_body()}</p>
      </div>
    </div>
  );
}
