import {
  ArrowLeft02Icon,
  Home01Icon,
  RefreshIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useRouter } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";

import { Icon } from "#/components/icon";
import { SiteFooter } from "#/components/site-footer";
import { SiteHeader } from "#/components/site-header";
import { Button } from "#/components/ui/button";
import { BRAND } from "#/lib/brand";
import { getViewer } from "#/lib/cv/functions";
import { m } from "#/paraglide/messages.js";

type Kind = "page" | "share" | "cv";

const kindFor = (pathname: string): Kind => {
  if (pathname.startsWith("/s/")) {
    return "share";
  }
  if (pathname.startsWith("/cv/")) {
    return "cv";
  }
  return "page";
};

const useTitle = (title: string) => {
  useEffect(() => {
    document.title = title;
  }, [title]);
};

const useViewer = () => {
  const { data } = useQuery({
    queryKey: ["viewer"],
    queryFn: () => getViewer(),
    staleTime: 60_000,
  });
  return data ?? null;
};

const StatusFrame = ({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) => {
  const viewer = useViewer();
  return (
    <div className="bg-background flex min-h-dvh flex-col">
      <SiteHeader viewer={viewer} />
      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:py-24">
        <div className="flex max-w-[440px] flex-col items-center text-center">
          <div className="relative flex size-[220px] items-center justify-center">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-[radial-gradient(closest-side,var(--surface-2),transparent)]"
            />
            <img
              alt=""
              className="relative h-auto w-[176px] select-none"
              decoding="async"
              draggable={false}
              height={414}
              src="/illustrations/not-found.webp"
              width={400}
            />
          </div>
          <h1 className="mt-4 text-[28px] leading-tight font-semibold tracking-[-0.025em] text-balance sm:text-[32px]">
            {title}
          </h1>
          <p className="text-muted-foreground mt-3 text-[15px] leading-relaxed text-pretty">
            {body}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

const HomeButton = ({ variant }: { variant: "default" | "outline" }) => (
  <Button
    nativeButton={false}
    render={<Link to="/" />}
    size="lg"
    variant={variant}
  >
    <Icon data-icon="inline-start" icon={Home01Icon} />
    {m.nf_home()}
  </Button>
);

export const NotFoundPage = () => {
  const { pathname } = useLocation();
  const kind = kindFor(pathname);
  useTitle(m.nf_meta_title({ brand: BRAND.name }));
  const copy = {
    page: { title: m.nf_title(), body: m.nf_body() },
    share: { title: m.nf_share_title(), body: m.nf_share_body() },
    cv: { title: m.nf_cv_title(), body: m.nf_cv_body() },
  }[kind];

  return (
    <StatusFrame body={copy.body} title={copy.title}>
      {kind === "share" ? (
        <>
          <Button nativeButton={false} render={<Link to="/" />} size="lg">
            {m.shared_make_own()}
          </Button>
          <HomeButton variant="outline" />
        </>
      ) : null}
      {kind === "cv" ? (
        <>
          <Button nativeButton={false} render={<Link to="/cvs" />} size="lg">
            <Icon data-icon="inline-start" icon={ArrowLeft02Icon} />
            {m.common_my_cvs()}
          </Button>
          <HomeButton variant="outline" />
        </>
      ) : null}
      {kind === "page" ? <HomeButton variant="default" /> : null}
    </StatusFrame>
  );
};

export const ErrorPage = ({ error, reset }: ErrorComponentProps) => {
  const router = useRouter();
  useTitle(m.err_meta_title({ brand: BRAND.name }));
  const retry = useCallback(() => {
    reset();
    router.invalidate();
  }, [reset, router]);
  return (
    <StatusFrame body={m.err_body()} title={m.err_title()}>
      <Button onClick={retry} size="lg">
        <Icon data-icon="inline-start" icon={RefreshIcon} />
        {m.err_retry()}
      </Button>
      <HomeButton variant="outline" />
      {import.meta.env.DEV ? (
        <pre className="bg-surface text-muted-foreground mt-6 w-full overflow-x-auto rounded-[12px] p-3 text-left text-[12px]">
          {error instanceof Error ? error.message : String(error)}
        </pre>
      ) : null}
    </StatusFrame>
  );
};
