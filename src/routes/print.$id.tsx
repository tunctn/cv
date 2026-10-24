import { createFileRoute, notFound } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { z } from "zod";

import { PagedCv } from "#/components/cv/paged";
import { PAPER_SIZES, resolveStyle } from "#/lib/cv/engine";
import { getPrintCv } from "#/lib/cv/print";
import { getTemplate } from "#/lib/cv/templates";

export const Route = createFileRoute("/print/$id")({
  validateSearch: z.object({
    token: z.string().catch(""),
    breaks: z
      .object({ main: z.array(z.string()), side: z.array(z.string()) })
      .optional()
      .catch(undefined),
  }),
  loaderDeps: ({ search }) => ({ token: search.token }),
  loader: async ({ params, deps }) => {
    const cv = await getPrintCv({ data: { id: params.id, token: deps.token } });
    if (!cv) {
      throw notFound();
    }
    return cv;
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: PrintPage,
});

/** Exactly the editor's pages, one per printed sheet. The exporter waits for data-cv-ready. */
function PrintPage() {
  const { template, data } = Route.useLoaderData();
  const def = getTemplate(template);
  const paper = PAPER_SIZES[resolveStyle(def, data).paper];
  const { breaks } = Route.useSearch();
  const [pages, setPages] = useState(0);
  const onReady = useCallback((n: number) => setPages(n), []);
  return (
    <div
      className="cv-print w-fit"
      data-cv-pages={pages || undefined}
      data-cv-ready={pages ? "" : undefined}
      dir="ltr"
    >
      <style>
        {`@page { size: ${paper.width}px ${paper.height}px; margin: 0 } html, body { margin: 0; background: white } .cv-print .cv-sheet:not(:last-child) { break-after: page }`}
      </style>
      <PagedCv breaks={breaks} cv={data} def={def} onReady={onReady} />
    </div>
  );
}
