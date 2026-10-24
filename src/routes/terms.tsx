import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "#/components/legal-page";
import { TermsBody } from "#/content/legal/terms";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: m.meta_title_terms() }] }),
  component: () => (
    <LegalPage title={m.terms_title()} updated="2026-10-23">
      <TermsBody />
    </LegalPage>
  ),
});
