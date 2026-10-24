import {
  Add01Icon,
  Copy01Icon,
  Delete02Icon,
  MoreHorizontalIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import {
  createFileRoute,
  Link,
  redirect,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "#/components/dashboard/empty-state";
import { GuestBanner } from "#/components/dashboard/guest-banner";
import {
  FileDropOverlay,
  ImportButton,
  useCvImport,
} from "#/components/dashboard/import-cv";
import { NewCvTile } from "#/components/dashboard/new-cv-tile";
import { Icon } from "#/components/icon";
import { CvThumb } from "#/components/primitives";
import { openSignupGate } from "#/components/signup-gate";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { deleteCv, duplicateCv, getViewer, listCvs } from "#/lib/cv/functions";
import { getTemplate } from "#/lib/cv/templates";
import { isGuestLimit, limitOf } from "#/lib/guest";
import { startCv } from "#/lib/start-cv";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

export const Route = createFileRoute("/cvs")({
  loader: async () => {
    const viewer = await getViewer();
    if (!viewer) {
      throw redirect({ to: "/" });
    }
    return { viewer, cvs: await listCvs() };
  },
  head: () => ({ meta: [{ title: m.meta_title_cvs() }] }),
  component: Dashboard,
});

function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) {
    return m.time_just_now();
  }
  if (s < 3600) {
    return m.time_minutes_ago({ count: Math.floor(s / 60) });
  }
  if (s < 86_400) {
    return m.time_hours_ago({ count: Math.floor(s / 3600) });
  }
  return new Date(iso).toLocaleDateString(getLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface CvRef {
  id: string;
  title: string;
}

type CvSummary = Awaited<ReturnType<typeof listCvs>>[number];

function Dashboard() {
  const { viewer, cvs } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [toDelete, setToDelete] = useState<CvRef | null>(null);
  const importer = useCvImport();

  const create = useCallback(async () => {
    setCreating(true);
    try {
      const { id } = await startCv();
      navigate({ to: "/cv/$id", params: { id } });
    } catch (e) {
      if (!isGuestLimit(e)) {
        toast.error((e as Error).message);
      }
      setCreating(false);
    }
  }, [navigate]);

  const closeDialog = useCallback((open: boolean) => {
    if (!open) {
      setToDelete(null);
    }
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!toDelete) {
      return;
    }
    await deleteCv({ data: { id: toDelete.id } });
    setToDelete(null);
    router.invalidate();
  }, [router, toDelete]);

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader viewer={viewer} />
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-6 pb-24 sm:px-6 sm:pt-10">
        {viewer.isAnonymous && cvs.length > 0 ? (
          <div className="mb-10 sm:mb-12">
            <GuestBanner />
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-semibold text-[28px] tracking-[-0.03em] sm:text-[32px]">
              {m.common_my_cvs()}
            </h1>
            {cvs.length > 0 ? (
              <p className="mt-1 text-[14px] text-muted-foreground">
                {m.cvs_last_edited({
                  count:
                    cvs.length === 1
                      ? m.cvs_count_one()
                      : m.cvs_count_other({ count: cvs.length }),
                  when: timeAgo(cvs[0].updatedAt),
                })}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ImportButton
              busy={importer.busy}
              className="max-sm:px-2.5"
              disabled={creating}
              onFile={importer.run}
            />
            <Button disabled={creating || importer.busy} onClick={create}>
              <Icon data-icon="inline-start" icon={Add01Icon} />
              {creating ? m.common_creating() : m.cvs_new()}
            </Button>
          </div>
        </div>

        {cvs.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              creating={creating}
              importing={importer.busy}
              onCreate={create}
              onImport={importer.run}
            />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-5 md:grid-cols-3 lg:grid-cols-4">
            {cvs.map((c) => (
              <CvCard cv={c} key={c.id} onDelete={setToDelete} />
            ))}
            <NewCvTile creating={creating} onCreate={create} />
          </div>
        )}
      </main>
      <SiteFooter />
      <FileDropOverlay disabled={importer.busy} onFile={importer.run} />

      <AlertDialog onOpenChange={closeDialog} open={!!toDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {m.cvs_delete_title({ title: toDelete?.title ?? "" })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {m.cvs_delete_body()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{m.common_cancel()}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} variant="destructive">
              {m.common_delete()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CvCard({
  cv: c,
  onDelete,
}: {
  cv: CvSummary;
  onDelete: (cv: CvRef) => void;
}) {
  const router = useRouter();
  const duplicate = useCallback(async () => {
    try {
      await duplicateCv({ data: { id: c.id } });
      router.invalidate();
    } catch (e) {
      const limit = limitOf(e);
      if (limit) {
        openSignupGate("cv", limit);
      } else {
        toast.error((e as Error).message);
      }
    }
  }, [c.id, router]);
  const askDelete = useCallback(() => onDelete(c), [c, onDelete]);
  return (
    <div className="group relative">
      <Link
        className="block rounded-[24px] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        params={{ id: c.id }}
        to="/cv/$id"
      >
        {/* Templates are laid out left to right in every UI language. */}
        <div
          className="overflow-hidden rounded-[24px] border border-transparent bg-surface px-5 pt-5 transition-colors group-hover:bg-surface-2 sm:px-7 sm:pt-7"
          dir="ltr"
        >
          <CvThumb
            className="rounded-t-md shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.06)] transition-shadow duration-300 group-hover:shadow-[0_2px_6px_rgba(0,0,0,0.08),0_16px_40px_rgba(0,0,0,0.10)]"
            cv={c.data}
            template={c.template}
          />
        </div>
      </Link>
      <div className="mt-3 flex items-start gap-2 px-1">
        <Link className="min-w-0 flex-1" params={{ id: c.id }} to="/cv/$id">
          <p className="truncate font-medium text-[15px]">{c.title}</p>
          <p className="text-[13px] text-muted-foreground">
            {getTemplate(c.template).name} · {timeAgo(c.updatedAt)}
          </p>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button aria-label={m.cvs_more()} size="icon-sm" variant="ghost">
                <Icon icon={MoreHorizontalIcon} />
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={duplicate}>
              <Icon icon={Copy01Icon} /> {m.cvs_duplicate()}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={askDelete} variant="destructive">
              <Icon icon={Delete02Icon} /> {m.common_delete()}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
