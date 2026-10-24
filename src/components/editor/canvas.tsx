import {
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  Add01Icon,
  CenterFocusIcon,
  MinusSignIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type DropTarget,
  type EditorApi,
  EditorContext,
} from "#/components/cv/editing";
import { PagedCv } from "#/components/cv/paged";
import { Icon } from "#/components/icon";
import { Button } from "#/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import {
  PAPER_SIZES,
  type PageBreaks,
  resolveStyle,
  type TemplateDef,
} from "#/lib/cv/engine";
import { getIn, moveIn, type Path, setIn, splitIndex } from "#/lib/cv/paths";
import type { CV, OrderKey } from "#/lib/cv/schema";
import { LinksDisabled } from "#/lib/cv/templates/shared";
import { textDirection } from "#/lib/i18n";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

import { ClipOverlay, type ClipResult } from "./clip";
import { SelectionToolbar } from "./selection-toolbar";

export interface CanvasProps {
  clipping: boolean;
  cv: CV;
  def: TemplateDef;
  onAsk: (path: Path, label: string, text: string, prompt?: string) => void;
  /** Latest page breaks on screen, so the download reproduces them exactly. */
  onBreaks?: (breaks: PageBreaks) => void;
  onChange: (update: (cv: CV) => CV) => void;
  onClip: (clip: ClipResult | null) => void;
  onSelect: (path: Path | null) => void;
  /** Room covered by the floating chat card; pages centre in the rest. */
  reserve?: { side: "left" | "right"; px: number };
  selected: Path | null;
}

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 1.6;

function moveSection(cv: CV, from: OrderKey, to: OrderKey, after: boolean) {
  const order = cv.sectionOrder.filter((k) => k !== from);
  const at = order.indexOf(to) + (after ? 1 : 0);
  order.splice(at, 0, from);
  return { ...cv, sectionOrder: order };
}

/** Pages side by side, editable in place. */
export function Canvas({
  cv,
  def,
  onChange,
  selected,
  onSelect,
  clipping,
  onClip,
  onAsk,
  onBreaks,
  reserve,
}: CanvasProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const paper = PAPER_SIZES[resolveStyle(def, cv).paper];
  const [fit, setFit] = useState(0.8);
  const [zoom, setZoom] = useState<number | null>(null);
  const scale = zoom ?? fit;
  const [active, setActive] = useState<EditorApi["active"]>(null);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const [dragLabel, setDragLabel] = useState<string | null>(null);

  // Fit a whole page into the free room by default: its height, and on narrow
  // screens (phones) its width too, so page 1 is never cropped.
  const fitReserve = useRef(reserve);
  fitReserve.current = reserve;
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit when the card resizes too
  useEffect(() => {
    const el = viewport.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width === 0 || height === 0) {
        return; // hidden mobile tab; refit once it shows
      }
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const room = width - (wide ? (fitReserve.current?.px ?? 0) : 0);
      // The row has 24px padding; phones keep a 12px gutter each side.
      const byWidth = (room - (wide ? 48 : 24)) / paper.width;
      const byHeight = (height - 96) / paper.height;
      setFit(Math.min(1.1, Math.max(MIN_ZOOM, Math.min(byWidth, byHeight))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [paper.height, paper.width, reserve?.px]);

  const set = useCallback(
    (path: Path, value: string) => onChange((c) => setIn(c, path, value)),
    [onChange]
  );

  const isBlank = useCallback(
    (path: Path) => {
      // Only real list entries (e.g. "experience.2"), never the header.
      const value = path === "basics" ? undefined : getIn(cv, path);
      return (
        value !== undefined && typeof value === "object" && isBlankEntry(value)
      );
    },
    [cv]
  );
  const editor = useMemo<EditorApi>(
    () => ({
      interactive: true,
      set,
      selected,
      select: onSelect,
      active,
      setActive,
      drop,
      isBlank,
    }),
    [set, selected, onSelect, active, drop, isBlank]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  const onDragStart = useCallback(
    (e: DragStartEvent) => {
      setDragLabel(String(e.active.data.current?.label ?? m.ed_drag_item()));
      onSelect(String(e.active.id));
    },
    [onSelect]
  );

  const onDragMove = useCallback((e: DragMoveEvent) => {
    const { over, active: dragged } = e;
    if (
      !over ||
      over.id === dragged.id ||
      over.data.current?.list !== dragged.data.current?.list
    ) {
      setDrop(null);
      return;
    }
    const start = dragged.rect.current.translated;
    const centerY = start ? start.top + start.height / 2 : 0;
    const after = centerY > over.rect.top + over.rect.height / 2;
    setDrop((d) =>
      d?.path === over.id && d.after === after
        ? d
        : { path: String(over.id), after }
    );
  }, []);

  const onDragEnd = useCallback(
    (e: DragEndEvent) => {
      const target = drop;
      setDrop(null);
      setDragLabel(null);
      const from = String(e.active.id);
      if (!target || target.path === from) {
        return;
      }
      if (from.startsWith("sections.")) {
        onChange((c) =>
          moveSection(
            c,
            from.slice(9) as OrderKey,
            target.path.slice(9) as OrderKey,
            target.after
          )
        );
        onSelect(null);
        return;
      }
      const a = splitIndex(from);
      const b = splitIndex(target.path);
      if (!(a && b) || a.list !== b.list) {
        return;
      }
      let to = b.index + (target.after ? 1 : 0);
      if (a.index < to) {
        to -= 1;
      }
      onChange((c) => moveIn(c, a.list, a.index, to));
      onSelect(`${a.list}.${to}`);
    },
    [drop, onChange, onSelect]
  );

  const zoomOut = useCallback(
    () => setZoom(Math.max(MIN_ZOOM, Math.round((scale - 0.1) * 10) / 10)),
    [scale]
  );
  const zoomIn = useCallback(
    () => setZoom(Math.min(MAX_ZOOM, Math.round((scale + 0.1) * 10) / 10)),
    [scale]
  );
  // Infinite canvas: the page row is translated by `pan`; drag empty space
  // (or hold Space) to move it, scroll/trackpad to pan, ⌘/Ctrl + scroll to zoom.
  const [pan, setPan] = useState({ x: 48, y: 24 });
  const [centerKey, setCenterKey] = useState(0);
  const [panning, setPanning] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);
  const panStart = useRef<{
    x: number;
    y: number;
    px: number;
    py: number;
  } | null>(null);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const zoomFit = useCallback(() => {
    setZoom(null);
    setCenterKey((k) => k + 1);
  }, []);

  // Centre the pages until the user moves the canvas themselves (and again on
  // "fit" or a paper/template change). Pages render after measuring, so this
  // follows the row's size rather than running once.
  const userMoved = useRef(false);
  const reserveRef = useRef(reserve);
  reserveRef.current = reserve;
  // biome-ignore lint/correctness/useExhaustiveDependencies: recentre only on these triggers
  useLayoutEffect(() => {
    userMoved.current = false;
    const v = viewport.current;
    const c = content.current;
    if (!(v && c)) {
      return;
    }
    const center = () => {
      // biome-ignore lint/suspicious/noUnnecessaryConditions: the ref flips to true when the user pans, after this effect ran
      if (!userMoved.current) {
        const wide = window.matchMedia("(min-width: 1024px)").matches;
        const left =
          wide && reserveRef.current?.side === "left"
            ? reserveRef.current.px
            : 0;
        const right =
          wide && reserveRef.current?.side === "right"
            ? reserveRef.current.px
            : 0;
        const room = v.clientWidth - left - right;
        setPan({
          x: left + Math.max(wide ? 24 : -12, (room - c.offsetWidth) / 2),
          y: 8,
        });
      }
    };
    center();
    const ro = new ResizeObserver(center);
    ro.observe(c);
    ro.observe(v);
    return () => ro.disconnect();
  }, [centerKey, paper.width, def.id, reserve?.px]);

  // When the chat card switches sides, glide the canvas into the space it
  // freed, in step with the card (same 340ms ease-out-expo). FLIP on one
  // composited layer: jump to the new pan, offset back, then animate to zero.
  const world = useRef<HTMLDivElement>(null);
  const glide = useRef<{ x: number; y: number } | null>(null);
  const prevReserve = useRef(reserve);
  // biome-ignore lint/correctness/useExhaustiveDependencies: react only to the card switching sides
  useLayoutEffect(() => {
    const before = prevReserve.current;
    prevReserve.current = reserve;
    const v = viewport.current;
    if (!(before && reserve && v) || before.side === reserve.side) {
      return;
    }
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      return;
    }
    const centre = (r: { side: "left" | "right"; px: number }) => {
      const left = r.side === "left" ? r.px : 0;
      const right = r.side === "right" ? r.px : 0;
      return (left + v.clientWidth - right) / 2;
    };
    const dx = centre(reserve) - centre(before);
    glide.current = { x: dx, y: 0 };
    setPan((p) => ({ ...p, x: p.x + dx }));
  }, [reserve?.side, reserve?.px]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each pan change to play a pending glide
  useLayoutEffect(() => {
    const d = glide.current;
    const el = world.current;
    if (!(d && el)) {
      return;
    }
    glide.current = null;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    el.style.transition = "none";
    el.style.transform = `translate3d(${-d.x}px, ${-d.y}px, 0)`;
    el.getBoundingClientRect();
    const frame = requestAnimationFrame(() => {
      el.style.transition = "transform 340ms cubic-bezier(0.19, 1, 0.22, 1)";
      el.style.transform = "translate3d(0, 0, 0)";
    });
    const done = () => {
      el.style.transition = "";
      el.style.transform = "";
    };
    el.addEventListener("transitionend", done, { once: true });
    return () => cancelAnimationFrame(frame);
  }, [pan]);

  useEffect(() => {
    const v = viewport.current;
    if (!v) {
      return;
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const rect = v.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const prev = scaleRef.current;
        // Mouse wheels send big steps, trackpad pinches small ones.
        const speed = Math.abs(e.deltaY) > 40 ? 0.002 : 0.01;
        const next = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, prev * Math.exp(-e.deltaY * speed))
        );
        userMoved.current = true;
        const k = next / prev;
        setZoom(next);
        setPan((p) => ({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k }));
        return;
      }
      userMoved.current = true;
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    };
    v.addEventListener("wheel", onWheel, { passive: false });
    return () => v.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing =
        t?.isContentEditable ||
        t?.tagName === "INPUT" ||
        t?.tagName === "TEXTAREA";
      if (e.code === "Space" && !typing) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpaceDown(false);
      }
    };
    // Never let pan mode get stuck (key-up or pointer-up can be missed when
    // the window loses focus mid-gesture).
    const reset = () => {
      setSpaceDown(false);
      setPanning(false);
      panStart.current = null;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    window.addEventListener("pointerup", reset);
    document.addEventListener("visibilitychange", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
      window.removeEventListener("pointerup", reset);
      document.removeEventListener("visibilitychange", reset);
    };
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      // Events from portals (menus, popovers) bubble through React to here;
      // only real presses on the canvas itself may pan or deselect.
      if (!e.currentTarget.contains(target)) {
        return;
      }
      const onPage = Boolean(target.closest(".cv-sheet, .cv-toolbar, button"));
      if (e.button === 1 || spaceDown || !onPage) {
        e.currentTarget.setPointerCapture(e.pointerId);
        panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
        userMoved.current = true;
        setPanning(true);
        if (!onPage) {
          onSelect(null);
        }
      }
    },
    [onSelect, pan.x, pan.y, spaceDown]
  );
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const s0 = panStart.current;
    if (s0) {
      setPan({ x: s0.px + e.clientX - s0.x, y: s0.py + e.clientY - s0.y });
    }
  }, []);
  const onPointerUp = useCallback(() => {
    panStart.current = null;
    setPanning(false);
  }, []);

  const [pageCount, setPageCount] = useState(0);
  // Pages are measured, zoomed and centred after load; keep them invisible
  // until that settles, then fade in, so a reload never shows them jumping.
  const [revealed, setRevealed] = useState(false);
  useLayoutEffect(() => {
    if (revealed || pageCount === 0) {
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setRevealed(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [pageCount, revealed]);

  /** Glide so page `index` sits centred in the free room, top-aligned. */
  const goToPage = useCallback((index: number) => {
    const v = viewport.current;
    const wrap =
      content.current?.querySelectorAll<HTMLElement>("[data-page-wrap]")[index];
    if (!(v && wrap)) {
      return;
    }
    const wide = window.matchMedia("(min-width: 1024px)").matches;
    const r = reserveRef.current;
    const left = wide && r?.side === "left" ? r.px : 0;
    const right = wide && r?.side === "right" ? r.px : 0;
    const centre = (left + v.clientWidth - right) / 2;
    const x = centre - (wrap.offsetLeft + wrap.offsetWidth / 2);
    const y = 8 - wrap.offsetTop + 24;
    userMoved.current = true;
    setPan((p) => {
      glide.current = { x: x - p.x, y: y - p.y };
      return { x, y };
    });
  }, []);

  const renderSheet = useCallback(
    (sheet: ReactNode, index: number, count: number) => (
      <div className="flex shrink-0 flex-col gap-2" data-page-wrap key={index}>
        <p
          className="text-[12px] text-muted-foreground tabular-nums"
          dir={textDirection(getLocale())}
        >
          {count > 1
            ? m.ed_page_of({ page: index + 1, count })
            : m.ed_page_n({ page: index + 1 })}
        </p>
        <div
          className="rounded-[2px] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06),0_12px_32px_rgba(0,0,0,0.08)]"
          style={{ width: paper.width * scale, height: paper.height * scale }}
        >
          <div
            className="origin-top-left"
            style={{ transform: `scale(${scale})`, width: paper.width }}
          >
            {sheet}
          </div>
        </div>
      </div>
    ),
    [paper.width, paper.height, scale]
  );

  return (
    <div className="relative h-full min-h-0">
      <div
        className={cn(
          "relative h-full cursor-grab overflow-hidden bg-surface",
          panning ? "cursor-grabbing select-none" : null
        )}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={viewport}
      >
        {/* One composited layer for dots + pages, so glides only move a transform. */}
        <div className="absolute inset-0" ref={world}>
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-full"
            style={{
              backgroundImage:
                "radial-gradient(var(--canvas-dot) 1px, transparent 1px)",
              backgroundSize: `${20 * scale}px ${20 * scale}px`,
              backgroundPosition: `${pan.x}px ${pan.y}px`,
            }}
          />
          <DndContext
            onDragEnd={onDragEnd}
            onDragMove={onDragMove}
            onDragStart={onDragStart}
            sensors={sensors}
          >
            <div
              className={cn(
                "absolute top-0 left-0 flex w-max items-start gap-10 p-6 transition-opacity duration-200 ease-out [&_.cv-sheet]:cursor-default [&_.cv-toolbar]:cursor-default",
                revealed ? "opacity-100" : "opacity-0",
                spaceDown ? "pointer-events-none" : null
              )}
              dir="ltr"
              ref={content}
              style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
            >
              <PagedCv
                cv={cv}
                def={def}
                editor={editor}
                onBreaks={onBreaks}
                onReady={setPageCount}
                renderSheet={renderSheet}
              />
              {selected && !dragLabel ? (
                <EditorContext.Provider value={editor}>
                  {/* The pages stay left-to-right; the toolbar follows the UI language. */}
                  <div className="contents" dir={textDirection(getLocale())}>
                    <SelectionToolbar
                      container={content}
                      cv={cv}
                      key={selected}
                      onAsk={onAsk}
                      onChange={onChange}
                      onSelect={onSelect}
                      path={selected}
                    />
                  </div>
                </EditorContext.Provider>
              ) : null}
            </div>
            <DragOverlay dropAnimation={null}>
              {dragLabel ? (
                <span className="inline-flex rounded-full bg-primary px-3 py-1 font-medium text-[12px] text-primary-foreground shadow-lg">
                  {dragLabel}
                </span>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </div>

      {clipping ? (
        <ClipOverlay content={content} onDone={onClip} scale={scale} />
      ) : null}

      <div
        className={cn(
          "absolute bottom-4 flex items-center gap-2",
          reserve?.side === "right"
            ? "right-4 lg:right-auto lg:left-4"
            : "right-4"
        )}
      >
        {pageCount > 1 ? (
          <div className="flex items-center gap-0.5 rounded-full bg-background p-1 shadow-sm ring-1 ring-foreground/[0.07]">
            {Array.from({ length: pageCount }, (_, i) => (
              <PageButton
                cv={cv}
                def={def}
                index={i}
                // biome-ignore lint/suspicious/noArrayIndexKey: pages are positions
                key={i}
                onGo={goToPage}
              />
            ))}
          </div>
        ) : null}
        <div className="flex items-center gap-0.5 rounded-full bg-background p-1 shadow-sm ring-1 ring-foreground/[0.07]">
          <Button
            aria-label={m.ed_recentre()}
            onClick={zoomFit}
            size="icon-sm"
            title={m.ed_recentre()}
            variant="ghost"
          >
            <Icon icon={CenterFocusIcon} />
          </Button>
          <Button
            aria-label={m.ed_zoom_out()}
            onClick={zoomOut}
            size="icon-sm"
            variant="ghost"
          >
            <Icon icon={MinusSignIcon} />
          </Button>
          <button
            className={cn(
              "h-7 min-w-14 cursor-pointer rounded-full px-2 text-[12px] tabular-nums hover:bg-muted",
              zoom === null && "text-muted-foreground"
            )}
            onClick={zoomFit}
            title={m.ed_fit_screen()}
            type="button"
          >
            {Math.round(scale * 100)}%
          </button>
          <Button
            aria-label={m.ed_zoom_in()}
            onClick={zoomIn}
            size="icon-sm"
            variant="ghost"
          >
            <Icon icon={Add01Icon} />
          </Button>
        </div>
      </div>
    </div>
  );
}

const PREVIEW_W = 150;

/** A page-number button; hover shows a small preview, click glides to it. */
function PageButton({
  index,
  cv,
  def,
  onGo,
}: {
  index: number;
  cv: CV;
  def: TemplateDef;
  onGo: (index: number) => void;
}) {
  const go = useCallback(() => onGo(index), [index, onGo]);
  const paper = PAPER_SIZES[resolveStyle(def, cv).paper];
  const k = PREVIEW_W / paper.width;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={m.ed_go_to_page({ page: index + 1 })}
            className="h-7 min-w-7 cursor-pointer rounded-full px-2 text-[12px] tabular-nums hover:bg-muted"
            onClick={go}
            type="button"
          />
        }
      >
        {index + 1}
      </TooltipTrigger>
      <TooltipContent
        arrow={false}
        className="bg-transparent p-0 shadow-none"
        sideOffset={10}
      >
        <div
          className="overflow-hidden rounded-[6px] bg-white shadow-[0_2px_6px_rgba(0,0,0,0.08),0_16px_40px_rgba(0,0,0,0.16)] ring-1 ring-black/[0.06]"
          style={{ width: PREVIEW_W, height: paper.height * k }}
        >
          <div
            className="origin-top-left"
            dir="ltr"
            style={{ transform: `scale(${k})`, width: paper.width }}
          >
            <LinksDisabled.Provider value>
              <PagedCv cv={cv} def={def} onlyPage={index} />
            </LinksDisabled.Provider>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/** Keeps a floating element positioned next to the CV element with `data-sel=path`. */
export function useAnchor(
  container: React.RefObject<HTMLElement | null>,
  path: Path,
  deps: unknown[]
) {
  const [pos, setPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: deps are passed in by the caller
  useLayoutEffect(() => {
    let frame = 0;
    const update = () => {
      const root = container.current;
      const el = root?.querySelector<HTMLElement>(
        `.cv-sheet [data-sel="${CSS.escape(path)}"]`
      );
      if (!(root && el)) {
        setPos(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const c = root.getBoundingClientRect();
      setPos({ top: r.top - c.top, left: r.left - c.left, width: r.width });
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [path, ...deps]);
  return pos;
}

/** An entry (job, school, skill group…) where nothing is filled in yet. */
function isBlankEntry(value: unknown): boolean {
  if (typeof value === "string") {
    return value.trim() === "";
  }
  if (Array.isArray(value)) {
    return value.every(isBlankEntry);
  }
  if (value && typeof value === "object") {
    return Object.entries(value).every(
      ([k, v]) => k === "id" || k === "columns" || isBlankEntry(v)
    );
  }
  return value === undefined || value === null;
}
