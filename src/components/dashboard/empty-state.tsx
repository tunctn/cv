import { Add01Icon } from "@hugeicons-pro/core-stroke-rounded";
import { Icon } from "#/components/icon";

import { Button } from "#/components/ui/button";
import { m } from "#/paraglide/messages.js";
import { ImportButton } from "./import-cv";

export function EmptyState({
  creating,
  onCreate,
  importing,
  onImport,
}: {
  creating: boolean;
  onCreate: () => void;
  importing: boolean;
  onImport: (file: File) => void;
}) {
  return (
    <div className="flex flex-col items-center rounded-[28px] bg-surface px-6 py-14 text-center sm:py-20">
      <img
        alt=""
        className="h-auto w-full max-w-[180px]"
        decoding="async"
        height={427}
        src="/illustrations/blank-sheet.webp"
        width={400}
      />
      <h2 className="mt-6 font-semibold text-[22px] tracking-[-0.02em]">
        {m.empty_title()}
      </h2>
      <p className="mt-2 max-w-[360px] text-[15px] text-muted-foreground leading-relaxed">
        {m.empty_body()}
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
        <Button disabled={creating || importing} onClick={onCreate} size="lg">
          <Icon data-icon="inline-start" icon={Add01Icon} />
          {creating ? m.common_creating() : m.empty_create()}
        </Button>
        <ImportButton
          busy={importing}
          disabled={creating}
          onFile={onImport}
          size="lg"
        />
      </div>
    </div>
  );
}
