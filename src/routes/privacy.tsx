import { createFileRoute } from "@tanstack/react-router";

import { LegalPage } from "#/components/legal-page";
import { PrivacyBody } from "#/content/legal/privacy";
import { m } from "#/paraglide/messages.js";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: m.meta_title_privacy() }] }),
  component: () => (
    <LegalPage title={m.privacy_title()} updated="2026-10-23">
      <PrivacyBody />
    </LegalPage>
  ),
});
