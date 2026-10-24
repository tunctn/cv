import type { StepResult, ToolSet, UIMessage } from "ai";

import type { UsageStepDetail } from "#/lib/ai/usage-detail";
import { usageNumbers } from "#/lib/server/ai-usage";

const ARGS_MAX = 400;
/** OpenAI's inline citation markers (private-use characters). */
const CITATIONS = /\uE200[^\uE201]*\uE201/gu;

export const cleanText = (text: string) =>
  text.replaceAll(CITATIONS, "").trim();
const URLS_MAX = 10;

const shortJson = (value: unknown) => {
  try {
    const text = JSON.stringify(value) as string | undefined;
    if (!text) {
      return "";
    }
    return text.length > ARGS_MAX ? `${text.slice(0, ARGS_MAX)}…` : text;
  } catch {
    return "";
  }
};

interface WebSearchOutput {
  action?: { type?: string; query?: string; queries?: string[]; url?: string };
  sources?: { type: string; url?: string }[];
}

const searchOf = (output: unknown) => {
  const out = (output ?? {}) as WebSearchOutput;
  const query =
    out.action?.queries?.join(" · ") ??
    out.action?.query ??
    out.action?.url ??
    undefined;
  const urls = (out.sources ?? [])
    .map((s) => s.url)
    .filter((u): u is string => Boolean(u));
  return { query, urls: urls.slice(0, URLS_MAX) };
};

export const stepDetail = (step: StepResult<ToolSet>): UsageStepDetail => {
  const tools: UsageStepDetail["tools"] = [];
  const searches: UsageStepDetail["searches"] = [];
  for (const call of step.toolCalls) {
    if (call.toolName === "web_search") {
      continue;
    }
    tools.push({ name: call.toolName, args: shortJson(call.input) });
  }
  for (const part of step.content) {
    if (part.type === "tool-error") {
      tools.push({
        name: part.toolName,
        error: String(
          part.error instanceof Error ? part.error.message : part.error
        ),
      });
    }
  }
  const stepUrls = step.sources
    .map((s) => (s.sourceType === "url" ? s.url : null))
    .filter((u): u is string => Boolean(u));
  for (const result of step.toolResults) {
    if (result.toolName !== "web_search") {
      continue;
    }
    searches.push(searchOf(result.output));
  }
  // Searches the SDK reported only as calls (no result part) still count.
  const searchCalls = step.toolCalls.filter(
    (c) => c.toolName === "web_search"
  ).length;
  while (searches.length < searchCalls) {
    searches.push({ urls: [] });
  }
  if (searches.length > 0 && searches.every((s) => s.urls.length === 0)) {
    searches[0].urls = stepUrls.slice(0, URLS_MAX);
  }
  return {
    ...usageNumbers(step.usage),
    finishReason: step.finishReason,
    tools,
    searches,
    text: cleanText(step.text) || undefined,
  };
};

export const promptOf = (messages: UIMessage[]) => {
  const last = messages.findLast((msg) => msg.role === "user");
  if (!last) {
    return { prompt: undefined, attachments: [] as string[] };
  }
  const text = last.parts
    .map((p) => (p.type === "text" ? p.text : ""))
    .filter(Boolean)
    .join("\n");
  const attachments = last.parts
    .map((p) =>
      p.type === "file" ? p.filename || p.mediaType || "file" : null
    )
    .filter((n): n is string => Boolean(n));
  return { prompt: text || undefined, attachments };
};
