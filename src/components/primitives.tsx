import { useCallback, useEffect, useRef, useState } from "react";
import { PagedCv } from "#/components/cv/paged";
import { Label } from "#/components/ui/label";
import { BRAND } from "#/lib/brand";
import { PAPER_SIZES, resolveStyle } from "#/lib/cv/engine";
import type { CV } from "#/lib/cv/schema";
import { getTemplate } from "#/lib/cv/templates";
import { LinksDisabled } from "#/lib/cv/templates/shared";
import { cn } from "#/lib/utils";

/** A labelled form control. Pass the control's `id` as `htmlFor`. */
export function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid min-w-0 grid-cols-1 gap-1.5", className)}>
      <Label className="font-medium text-[13px]" htmlFor={htmlFor}>
        {label}
      </Label>
      {children}
    </div>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-[-0.02em]",
        className
      )}
    >
      <img
        alt=""
        className="block size-7 shrink-0"
        height={28}
        src={BRAND.logo}
        width={28}
      />
      <span className="text-[15px] leading-none">{BRAND.name}</span>
    </span>
  );
}

/** The first page of a CV, scaled down to the width of its container. */
export function CvThumb({
  cv,
  template,
  className,
}: {
  cv: CV;
  template: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const def = getTemplate(template);
  const paper = PAPER_SIZES[resolveStyle(def, cv).paper];
  const [scale, setScale] = useState(0);
  // Pages are measured on the client; fade in once laid out and scaled so the
  // first paint never shows content jumping into place.
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(([e]) =>
      setScale(e.contentRect.width / paper.width)
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, [paper.width]);
  return (
    <div
      aria-hidden
      className={cn("relative overflow-hidden bg-white", className)}
      dir="ltr"
      ref={ref}
      style={{ aspectRatio: `${paper.width} / ${paper.height}` }}
    >
      <div
        className={cn(
          "pointer-events-none absolute top-0 left-0 origin-top-left select-none transition-opacity duration-300 ease-out",
          ready && scale > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{ transform: `scale(${scale})`, width: paper.width }}
      >
        <LinksDisabled.Provider value>
          <PagedCv cv={cv} def={def} firstPageOnly onReady={onReady} />
        </LinksDisabled.Provider>
      </div>
    </div>
  );
}

export function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
