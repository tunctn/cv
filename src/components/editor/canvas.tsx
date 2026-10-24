import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  DragEndEvent,
  DragMoveEvent,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  Add01Icon,
  CenterFocusIcon,
  MinusSignIcon,
} from "@hugeicons-pro/core-stroke-rounded";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { EditorContext } from "#/components/cv/editing";
import type { DropTarget, EditorApi } from "#/components/cv/editing";
import { PagedCv } from "#/components/cv/paged";
import { Icon } from "#/components/icon";
import { Button } from "#/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "#/components/ui/tooltip";
import { PAPER_SIZES, resolveStyle } from "#/lib/cv/engine";
import type { PageBreaks, TemplateDef } from "#/lib/cv/engine";
import { getIn, moveIn, setIn, splitIndex } from "#/lib/cv/paths";
import type { Path } from "#/lib/cv/paths";
import type { CV, OrderKey } from "#/lib/cv/schema";
import { LinksDisabled } from "#/lib/cv/templates/shared";
import { textDirection } from "#/lib/i18n";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

import { ClipOverlay } from "./clip";
import type { ClipResult } from "./clip";
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

const moveSection = (cv: CV, from: OrderKey, to: OrderKey, after: boolean) => {
  const order = cv.sectionOrder.filter((k) => k !== from);
  const at = order.indexOf(to) + (after ? 1 : 0);
  order.splice(at, 0, from);
  return { ...cv, sectionOrder: order };
};

const PREVIEW_W = 150;

const PageButton = ({
  index,
  cv,
  def,
  onGo,
}: {
  index: number;
  cv: CV;
  def: TemplateDef;
  onGo: (index: number) => void;
}) => {
  const go = useCallback(() => onGo(index), [index, onGo]);
  const paper = PAPER_SIZES[resolveStyle(def, cv).paper];
  const k = PREVIEW_W / paper.width;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            aria-label={m.ed_go_to_page({ page: index + 1 })}
            className="hover:bg-muted h-7 min-w-7 cursor-pointer rounded-full px-2 text-[12px] tabular-nums"
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
};

const isBlankEntry = (value: unknown): boolean => {
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
};

export const Canvas = ({
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
}: CanvasProps) => {
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
  const reserveSide = reserve?.side;
  const reservePx = reserve?.px ?? 0;
  useEffect(() => {
    const el = viewport.current;
    if (!el) {
      return;
    }
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      // Hidden mobile tab; refit once it shows.
      if (width === 0 || height === 0) {
        return;
      }
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const room = width - (wide ? reservePx : 0);
      // The row has 24px padding; phones keep a 12px gutter each side.
      const byWidth = (room - (wide ? 48 : 24)) / paper.width;
      const byHeight = (height - 96) / paper.height;
      setFit(Math.min(1.1, Math.max(MIN_ZOOM, Math.min(byWidth, byHeight))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [paper.height, paper.width, reservePx]);

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

  const zoomFit = useCallback(() => {
    setZoom(null);
    setCenterKey((k) => k + 1);
  }, []);

  // Centre the pages until the user moves the canvas themselves (and again on
  // "fit" or a paper/template change). Pages render after measuring, so this
  // follows the row's size rather than running once.
  const centerFor = `${centerKey}|${paper.width}|${def.id}|${reservePx}`;
  const [movedFor, setMovedFor] = useState<string | null>(null);
  const userMoved = movedFor === centerFor;
  useLayoutEffect(() => {
    const v = viewport.current;
    const c = content.current;
    if (userMoved || !(v && c)) {
      return;
    }
    const center = () => {
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const left = wide && reserveSide === "left" ? reservePx : 0;
      const right = wide && reserveSide === "right" ? reservePx : 0;
      const room = v.clientWidth - left - right;
      setPan({
        x: left + Math.max(wide ? 24 : -12, (room - c.offsetWidth) / 2),
        y: 8,
      });
    };
    center();
    const ro = new ResizeObserver(center);
    ro.observe(c);
    ro.observe(v);
    return () => ro.disconnect();
  }, [userMoved, reserveSide, reservePx]);

  // When the chat card switches sides, glide the canvas into the space it
  // freed, in step with the card (same 340ms ease-out-expo). FLIP on one
  // composited layer: jump to the new pan, offset back, then animate to zero.
  // While the pages are centred, the effect above already moved them.
  const world = useRef<HTMLDivElement>(null);
  const [glide, setGlide] = useState<{ x: number; y: number } | null>(null);
  const prevReserve = useRef(reserve);
  useLayoutEffect(() => {
    const before = prevReserve.current;
    const now = reserveSide ? { side: reserveSide, px: reservePx } : undefined;
    prevReserve.current = now;
    const v = viewport.current;
    if (!(before && now && v) || before.side === now.side) {
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
    const dx = centre(now) - centre(before);
    setGlide({ x: dx, y: 0 });
    if (userMoved) {
      setPan((p) => ({ ...p, x: p.x + dx }));
    }
  }, [reserveSide, reservePx, userMoved]);

  // Plays a glide once the pan it belongs to is on screen.
  useLayoutEffect(() => {
    const el = world.current;
    if (!(glide && el)) {
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    el.style.transition = "none";
    el.style.transform = `translate3d(${-glide.x}px, ${-glide.y}px, 0)`;
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
  }, [glide]);

  const onWheel = useEffectEvent((e: WheelEvent, v: HTMLDivElement) => {
    e.preventDefault();
    setMovedFor(centerFor);
    if (e.ctrlKey || e.metaKey) {
      const rect = v.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const prev = scale;
      // Mouse wheels send big steps, trackpad pinches small ones.
      const speed = Math.abs(e.deltaY) > 40 ? 0.002 : 0.01;
      const next = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, prev * Math.exp(-e.deltaY * speed))
      );
      const k = next / prev;
      setZoom(next);
      setPan((p) => ({ x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k }));
      return;
    }
    setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
  });
  useEffect(() => {
    const v = viewport.current;
    if (!v) {
      return;
    }
    const handleWheel = (e: WheelEvent) => onWheel(e, v);
    v.addEventListener("wheel", handleWheel, { passive: false });
    return () => v.removeEventListener("wheel", handleWheel);
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
        setMovedFor(centerFor);
        setPanning(true);
        if (!onPage) {
          onSelect(null);
        }
      }
    },
    [centerFor, onSelect, pan.x, pan.y, spaceDown]
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
  const goToPage = useCallback(
    (index: number) => {
      const v = viewport.current;
      const wrap =
        content.current?.querySelectorAll<HTMLElement>("[data-page-wrap]")[
          index
        ];
      if (!(v && wrap)) {
        return;
      }
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      const left = wide && reserveSide === "left" ? reservePx : 0;
      const right = wide && reserveSide === "right" ? reservePx : 0;
      const centre = (left + v.clientWidth - right) / 2;
      const x = centre - (wrap.offsetLeft + wrap.offsetWidth / 2);
      const y = 8 - wrap.offsetTop + 24;
      setMovedFor(centerFor);
      setGlide({ x: x - pan.x, y: y - pan.y });
      setPan({ x, y });
    },
    [centerFor, pan.x, pan.y, reservePx, reserveSide]
  );

  const renderSheet = useCallback(
    (sheet: ReactNode, index: number, count: number) => (
      <div className="flex shrink-0 flex-col gap-2" data-page-wrap key={index}>
        <p
          className="text-muted-foreground text-[12px] tabular-nums"
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
          "bg-surface relative h-full cursor-grab overflow-hidden",
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
                <span className="bg-primary text-primary-foreground inline-flex rounded-full px-3 py-1 text-[12px] font-medium shadow-lg">
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
          <div className="bg-background ring-foreground/[0.07] flex items-center gap-0.5 rounded-full p-1 shadow-sm ring-1">
            {Array.from({ length: pageCount }, (_, i) => (
              <PageButton
                cv={cv}
                def={def}
                index={i}
                // oxlint-disable-next-line react/no-array-index-key -- pages are positions
                key={i}
                onGo={goToPage}
              />
            ))}
          </div>
        ) : null}
        <div className="bg-background ring-foreground/[0.07] flex items-center gap-0.5 rounded-full p-1 shadow-sm ring-1">
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
              "hover:bg-muted h-7 min-w-14 cursor-pointer rounded-full px-2 text-[12px] tabular-nums",
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
};
