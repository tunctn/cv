import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { AdminShell } from "#/components/admin/ui";
import { getAdminAccess } from "#/lib/admin/functions";
import { m } from "#/paraglide/messages.js";

/** /admin: only for ADMIN_EMAILS; everyone else gets a plain 404. */
export const Route = createFileRoute("/admin")({
  // Rendered in the browser only: dates and "x ago" use the admin's own
  // time zone, and nothing here needs server rendering.
  ssr: false,
  beforeLoad: async () => {
    const admin = await getAdminAccess();
    if (!admin) {
      throw notFound();
    }
    return { admin };
  },
  head: () => ({
    meta: [
      { title: m.admin_meta_title() },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const { admin } = Route.useRouteContext();
  return (
    <AdminShell email={admin.email}>
      <Outlet />
    </AdminShell>
  );
}
