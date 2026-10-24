import { createFileRoute, Link, getRouteApi } from "@tanstack/react-router";

import { CostChart, SignupChart } from "#/components/admin/cost-chart";
import {
  fmtBytes,
  fmtInt,
  fmtUsd,
  PageTitle,
  Panel,
  Stat,
  Tag,
  UserAvatar,
} from "#/components/admin/ui";
import { getAdminOverview } from "#/lib/admin/functions";
import { m } from "#/paraglide/messages.js";

const routeApi = getRouteApi("/admin/");

const Overview = () => {
  const o = routeApi.useLoaderData();
  return (
    <>
      <PageTitle
        description={m.admin_overview_body()}
        title={m.admin_nav_overview()}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          hint={m.admin_users_split({
            registered: fmtInt(o.users.registered),
            guests: fmtInt(o.users.guests),
          })}
          label={m.admin_stat_users()}
          value={fmtInt(o.users.total)}
        />
        <Stat
          hint={m.admin_new_registered({
            count: fmtInt(o.users.newRegistered7),
          })}
          label={m.admin_stat_new7()}
          value={fmtInt(o.users.new7)}
        />
        <Stat
          hint={m.admin_cvs_split({
            new7: fmtInt(o.cvs.new7),
            shared: fmtInt(o.cvs.shared),
          })}
          label={m.admin_stat_cvs()}
          value={fmtInt(o.cvs.total)}
        />
        <Stat
          hint={m.admin_ai_split({
            week: fmtInt(o.ai.chats7),
            errors: fmtInt(o.ai.errors7),
          })}
          label={m.admin_stat_ai_messages()}
          value={fmtInt(o.ai.chats)}
        />
        <Stat label={m.admin_cost_today()} value={fmtUsd(o.ai.costToday)} />
        <Stat label={m.admin_cost_7d()} value={fmtUsd(o.ai.cost7)} />
        <Stat
          hint={m.admin_searches({ count: fmtInt(o.ai.searches30) })}
          label={m.admin_cost_30d()}
          value={fmtUsd(o.ai.cost30)}
        />
        <Stat
          hint={m.admin_files_hint({
            count: fmtInt(o.files.total),
            size: fmtBytes(o.files.bytes),
          })}
          label={m.admin_cost_all()}
          value={fmtUsd(o.ai.costAll)}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          action={
            <Link
              className="text-muted-foreground hover:text-foreground text-[13px]"
              to="/admin/usage"
            >
              {m.admin_see_all()}
            </Link>
          }
          title={m.admin_cost_chart_title()}
        >
          <CostChart days={o.days} />
        </Panel>
        <div className="flex flex-col gap-3">
          <Panel title={m.admin_signups_title()}>
            <SignupChart days={o.days} />
            <p className="text-muted-foreground px-4 pb-4 text-[12.5px]">
              {m.admin_active7({ count: fmtInt(o.users.active7) })}
              {o.users.banned > 0
                ? ` · ${m.admin_banned_count({ count: fmtInt(o.users.banned) })}`
                : ""}
            </p>
          </Panel>
          <Panel title={m.admin_top_spenders()}>
            {o.topSpenders.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-center text-[13px]">
                {m.admin_empty()}
              </p>
            ) : (
              <ul className="divide-y">
                {o.topSpenders.map((s) => (
                  <li key={s.userId}>
                    <Link
                      className="hover:bg-foreground/[0.03] flex items-center gap-3 px-4 py-2.5"
                      params={{ id: s.userId ?? "" }}
                      to="/admin/users/$id"
                    >
                      <UserAvatar name={s.name || s.email} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px]">
                          {s.isAnonymous ? m.admin_guest() : s.email}
                        </span>
                        <span className="text-muted-foreground block text-[12px]">
                          {m.admin_requests_count({ count: s.requests })}
                        </span>
                      </span>
                      {s.isAnonymous ? <Tag>{m.admin_guest()}</Tag> : null}
                      <span className="text-[13.5px] tabular-nums">
                        {fmtUsd(s.cost)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
};

export const Route = createFileRoute("/admin/")({
  loader: () => getAdminOverview(),
  component: Overview,
});
