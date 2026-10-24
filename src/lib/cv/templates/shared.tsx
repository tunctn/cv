import { createContext, useContext } from "react";

// `**bold**`, `__underline__`, `[link](url)` or `*italic*`; longer markers first.
const MARKUP =
  /(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|__[^_]+__|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*)/g;
const LINK = /^\[([^\]]+)\]\(([^)\s]+)\)$/;
const SCHEME = /^(https?:|mailto:)/;

/** Stable React keys for plain string lists: the text itself, plus a counter for repeats. */
export function keyed(lines: string[]) {
  const seen = new Map<string, number>();
  return lines.map((text) => {
    const n = seen.get(text) ?? 0;
    seen.set(text, n + 1);
    return { key: `${n}:${text}`, text };
  });
}

function Span({ text }: { text: string }) {
  const linksDisabled = useContext(LinksDisabled);
  if (text.length > 6 && text.startsWith("***") && text.endsWith("***")) {
    return (
      <strong className="font-semibold">
        <em className="italic">{text.slice(3, -3)}</em>
      </strong>
    );
  }
  if (text.length > 4 && text.startsWith("**") && text.endsWith("**")) {
    return <strong className="font-semibold">{text.slice(2, -2)}</strong>;
  }
  if (text.length > 4 && text.startsWith("__") && text.endsWith("__")) {
    return (
      <span className="underline underline-offset-2">{text.slice(2, -2)}</span>
    );
  }
  const link = LINK.exec(text);
  if (link) {
    const [, label, url] = link;
    const href = SCHEME.test(url) ? url : `https://${url}`;
    return linksDisabled ? (
      <span className="underline underline-offset-2">{label}</span>
    ) : (
      <a className="underline underline-offset-2" href={href}>
        {label}
      </a>
    );
  }
  if (text.length > 2 && text.startsWith("*") && text.endsWith("*")) {
    return <em className="italic">{text.slice(1, -1)}</em>;
  }
  return <>{text}</>;
}

/** Renders `**bold**` and `*italic*` spans; everything else is plain text. */
export function Rich({ text }: { text: string }) {
  return (
    <>
      {keyed(text.split(MARKUP)).map((p) => (
        <Span key={p.key} text={p.text} />
      ))}
    </>
  );
}

/** Thumbnails sit inside links, so templates render plain text there instead of anchors. */
export const LinksDisabled = createContext(false);
