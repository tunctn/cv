import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";

import {
  breaksOf,
  PAPER_SIZES,
  paginate,
  resolveStyle,
  typeAttrs,
  usedHeight,
} from "#/lib/cv/engine";
import type { Block, PageBreaks, TemplateDef } from "#/lib/cv/engine";
import { fontFamily } from "#/lib/cv/fonts";
import type { CV } from "#/lib/cv/schema";
import { cn } from "#/lib/utils";

import { EditorContext, useEditor } from "./editing";
import type { EditorApi } from "./editing";

interface Geometry {
  mainLeft: number;
  mainWidth: number;
  sideLeft: number;
  sideWidth: number;
}

const geometry = (def: TemplateDef, padX: number, pageW: number): Geometry => {
  if (!def.side) {
    return {
      mainLeft: padX,
      mainWidth: pageW - padX * 2,
      sideLeft: 0,
      sideWidth: 0,
    };
  }
  const side = def.side.width;
  const left = def.side.position === "left";
  return {
    mainLeft: left ? side + padX : padX,
    mainWidth: pageW - side - padX * 2,
    sideLeft: left ? padX : pageW - side + padX,
    sideWidth: side - padX * 2,
  };
};

const BlockBox = ({
  block,
  gap,
  padX,
  pullTop,
  scale = 1,
}: {
  block: Block;
  gap: number;
  padX: number;
  pullTop?: number;
  /** Text size setting: zooms the block's content, never the gaps between blocks. */
  scale?: number;
}) => (
  <div
    data-block={block.key}
    style={{
      display: "flow-root",
      paddingTop: gap,
      marginLeft: block.bleed ? -padX : undefined,
      marginRight: block.bleed ? -padX : undefined,
      marginTop: pullTop ? -pullTop : undefined,
    }}
  >
    {scale === 1 ? (
      block.node
    ) : (
      <div style={{ display: "flow-root", zoom: scale }}>{block.node}</div>
    )}
  </div>
);

const useFontsVersion = () => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion((v) => v + 1);
    document.fonts.ready.then(bump).catch(() => {
      // Never rejects; the loadingdone listener covers later fonts anyway.
    });
    document.fonts.addEventListener("loadingdone", bump);
    return () => document.fonts.removeEventListener("loadingdone", bump);
  }, []);
  return version;
};

const sameHeights = (a: number[] | null, b: number[]) =>
  a !== null && a.length === b.length && a.every((h, i) => h === b[i]);

const Measurer = ({
  blocks,
  width,
  padX,
  sheetStyle,
  sheetAttrs,
  sheetClassName,
  onMeasure,
  scale,
}: {
  blocks: Block[];
  width: number;
  padX: number;
  sheetStyle: CSSProperties;
  sheetAttrs: Record<string, string>;
  sheetClassName?: string;
  scale: number;
  onMeasure: (heights: number[]) => void;
}) => {
  // Loaded fonts change heights: the new state re-renders, so it re-measures.
  useFontsVersion();
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef<number[] | null>(null);
  // Measure after every render (blocks, width or loaded fonts may have
  // changed); report only when the heights differ, so this settles.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const heights = [...el.children].map(
      (c) => c.getBoundingClientRect().height
    );
    if (sameHeights(last.current, heights)) {
      return;
    }
    last.current = heights;
    onMeasure(heights);
  });

  return createPortal(
    <div
      aria-hidden
      className={sheetClassName}
      {...sheetAttrs}
      style={{
        ...sheetStyle,
        position: "fixed",
        left: -100_000,
        top: 0,
        width,
        visibility: "hidden",
        pointerEvents: "none",
      }}
    >
      <div ref={ref}>
        {blocks.map((b) => (
          <BlockBox block={b} gap={0} key={b.key} padX={padX} scale={scale} />
        ))}
      </div>
    </div>,
    document.body
  );
};

const noSubscribe = () => () => {
  // Nothing to subscribe to: the value only differs between server and client.
};

/** False on the server and while hydrating, true in the browser after that. */
const useMounted = () =>
  useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false
  );

const Column = ({
  blocks,
  heights,
  indexes,
  left,
  width,
  pageIndex,
  available,
  forced,
  padTop,
  padX,
  fontScale,
}: {
  blocks: Block[];
  heights: number[] | null;
  indexes: number[];
  left: number;
  width: number;
  pageIndex: number;
  available: number;
  /** Pages break at fixed blocks (export), so a page may need to shrink. */
  forced: boolean;
  padTop: number;
  padX: number;
  fontScale: number;
}) => {
  // With forced breaks a page can come out a few px too tall (different font
  // metrics on the export machine); shrink that page imperceptibly to fit.
  const used = heights ? usedHeight(blocks, heights, indexes) : 0;
  const fit = forced && used > available ? available / used : 1;
  return (
    <div
      style={{
        position: "absolute",
        top: padTop,
        left,
        width: width / fit,
        transform: fit < 1 ? `scale(${fit})` : undefined,
        transformOrigin: "top left",
      }}
    >
      {indexes.map((i, n) => {
        const b = blocks[i];
        const pull = b.bleed && n === 0 && pageIndex === 0 ? padTop : 0;
        return (
          <BlockBox
            block={b}
            gap={n === 0 ? 0 : (b.gap ?? 0)}
            key={b.key}
            padX={padX}
            pullTop={pull}
            scale={fontScale}
          />
        );
      })}
    </div>
  );
};

export interface PagedProps {
  /** Break pages exactly here (the editor's breaks, used for export). */
  breaks?: PageBreaks | null;
  cv: CV;
  def: TemplateDef;
  /** Editor API for the interactive copy; omit for print and thumbnails. */
  editor?: EditorApi | null;
  /** Only render the first page (thumbnails). */
  firstPageOnly?: boolean;
  /** Reports where pages break, so an export can reproduce them. */
  onBreaks?: (breaks: PageBreaks) => void;
  /** Only render this page (0-based), e.g. for a page preview. */
  onlyPage?: number;
  onReady?: (pageCount: number) => void;
  /** Wraps each sheet, e.g. to add page labels and spacing in the editor. */
  renderSheet?: (sheet: ReactNode, index: number, count: number) => ReactNode;
}

/** Splits the measured blocks into pages and reports breaks and page count. */
const usePages = ({
  layout,
  mainH,
  sideH,
  available,
  breaks,
  onBreaks,
  onReady,
}: {
  layout: { main: Block[]; side?: Block[] };
  mainH: number[] | null;
  sideH: number[] | null;
  available: number;
  breaks?: PageBreaks | null;
  onBreaks?: (breaks: PageBreaks) => void;
  onReady?: (pageCount: number) => void;
}) => {
  const mainPages = useMemo(
    () =>
      mainH && mainH.length === layout.main.length
        ? paginate(layout.main, mainH, available, breaks?.main)
        : null,
    [layout.main, mainH, available, breaks]
  );
  const sidePages = useMemo(() => {
    if (!layout.side) {
      return [];
    }
    return sideH && sideH.length === layout.side.length
      ? paginate(layout.side, sideH, available, breaks?.side)
      : null;
  }, [layout.side, sideH, available, breaks]);

  useEffect(() => {
    if (mainPages && sidePages && onBreaks) {
      onBreaks({
        main: breaksOf(layout.main, mainPages),
        side: layout.side ? breaksOf(layout.side, sidePages) : [],
      });
    }
  }, [mainPages, sidePages, layout, onBreaks]);

  const ready = Boolean(mainPages && sidePages);
  const count = ready
    ? Math.max(mainPages?.length ?? 1, sidePages?.length ?? 0)
    : 0;

  useEffect(() => {
    if (ready) {
      onReady?.(count);
    }
  }, [ready, count, onReady]);
  return { mainPages, sidePages, ready, count };
};

export const PagedCv = ({
  cv,
  def,
  editor,
  renderSheet,
  firstPageOnly,
  onlyPage,
  onReady,
  breaks,
  onBreaks,
}: PagedProps) => {
  const style = resolveStyle(def, cv);
  const paper = PAPER_SIZES[style.paper];
  const g = geometry(def, style.padX, paper.width);
  const layout = useMemo(() => def.build(cv), [def, cv]);
  const mounted = useMounted();
  const [mainH, setMainH] = useState<number[] | null>(null);
  const [sideH, setSideH] = useState<number[] | null>(null);

  const type = typeAttrs(style);
  const sheetStyle: CSSProperties = {
    fontFamily: fontFamily(style.font),
    ["--cv-accent" as string]: style.accent,
    ["--cv-pad-x" as string]: `${style.padX}px`,
    ...type.vars,
  };
  const available = paper.height - style.padTop - style.padBottom;

  const { mainPages, sidePages, ready, count } = usePages({
    layout,
    mainH,
    sideH,
    available,
    breaks,
    onBreaks,
    onReady,
  });

  // The measuring copy uses the editor's look but is never interactive.
  const parent = useEditor();
  const measureEditor = useMemo<EditorApi | null>(
    () => (editor ? { ...editor, interactive: false } : null),
    [editor]
  );

  const column = (
    blocks: Block[],
    heights: number[] | null,
    indexes: number[],
    left: number,
    width: number,
    pageIndex: number
  ) => (
    <Column
      available={available}
      blocks={blocks}
      fontScale={style.fontScale}
      forced={Boolean(breaks)}
      heights={heights}
      indexes={indexes}
      left={left}
      padTop={style.padTop}
      padX={style.padX}
      pageIndex={pageIndex}
      width={width}
    />
  );

  const sheets: ReactNode[] = [];
  if (ready) {
    const total = firstPageOnly ? 1 : count;
    for (let p = 0; p < total; p += 1) {
      if (onlyPage !== undefined && p !== onlyPage) {
        continue;
      }
      const sheet = (
        <div
          className={cn(
            // rr-block: CV content never appears in session replays.
            "cv-sheet rr-block relative overflow-hidden bg-white text-[#1c1c1c]",
            def.sheetClassName
          )}
          data-page={p + 1}
          key={p}
          {...type.attrs}
          style={{ ...sheetStyle, width: paper.width, height: paper.height }}
        >
          {def.side ? (
            <div
              className={cn("absolute top-0 bottom-0", def.side.className)}
              style={{
                width: def.side.width,
                [def.side.position]: 0,
              }}
            />
          ) : null}
          {column(
            layout.main,
            mainH,
            mainPages?.[p] ?? [],
            g.mainLeft,
            g.mainWidth,
            p
          )}
          {layout.side
            ? column(
                layout.side,
                sideH,
                sidePages?.[p] ?? [],
                g.sideLeft,
                g.sideWidth,
                p
              )
            : null}
        </div>
      );
      sheets.push(renderSheet ? renderSheet(sheet, p, count) : sheet);
    }
  }

  return (
    <EditorContext.Provider value={editor ?? parent ?? null}>
      {mounted ? (
        <EditorContext.Provider value={measureEditor}>
          <Measurer
            blocks={layout.main}
            onMeasure={setMainH}
            padX={style.padX}
            scale={style.fontScale}
            sheetAttrs={type.attrs}
            sheetClassName={cn("text-[#1c1c1c]", def.sheetClassName)}
            sheetStyle={sheetStyle}
            width={g.mainWidth}
          />
          {layout.side ? (
            <Measurer
              blocks={layout.side}
              onMeasure={setSideH}
              padX={style.padX}
              scale={style.fontScale}
              sheetAttrs={type.attrs}
              sheetClassName={cn("text-[#1c1c1c]", def.sheetClassName)}
              sheetStyle={sheetStyle}
              width={g.sideWidth}
            />
          ) : null}
        </EditorContext.Provider>
      ) : null}
      {sheets}
    </EditorContext.Provider>
  );
};
