/**
 * OpenAI prices in USD, standard tier, short context (<=272K input).
 * Source: https://developers.openai.com/api/docs/pricing — checked 2026-10-23.
 * Update this table when prices change or a new model is used; models not
 * listed here are costed with FALLBACK (and show up in the admin page).
 */
export const OPENAI_PRICES: Record<
  string,
  { input: number; cachedInput: number; output: number }
> = {
  // per 1M tokens
  "gpt-5.5": { input: 5, cachedInput: 0.5, output: 30 },
  "gpt-5.4": { input: 2.5, cachedInput: 0.25, output: 15 },
  "gpt-5.4-mini": { input: 0.75, cachedInput: 0.075, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, cachedInput: 0.02, output: 1.25 },
  "gpt-5.2": { input: 1.75, cachedInput: 0.175, output: 14 },
  "gpt-5.1": { input: 1.25, cachedInput: 0.125, output: 10 },
  "gpt-5": { input: 1.25, cachedInput: 0.125, output: 10 },
  "gpt-5-mini": { input: 0.25, cachedInput: 0.025, output: 2 },
  "gpt-5-nano": { input: 0.05, cachedInput: 0.005, output: 0.4 },
};

/** Unknown models are costed like gpt-5.4 so spend is never under-reported. */
const FALLBACK = OPENAI_PRICES["gpt-5.4"];

/**
 * Web search tool: $10 per 1K calls (all models). The search content tokens
 * are billed at the model's rates and already counted in input tokens.
 */
export const WEB_SEARCH_PER_CALL = 10 / 1000;

export interface UsageNumbers {
  cachedInputTokens: number;
  /** All input tokens, cached ones included. */
  inputTokens: number;
  /** All output tokens, reasoning included. */
  outputTokens: number;
  webSearches: number;
}

export const priceFor = (model: string) => {
  if (OPENAI_PRICES[model]) {
    return OPENAI_PRICES[model];
  }
  const [base] = Object.keys(OPENAI_PRICES)
    .filter((id) => model.startsWith(`${id}-`))
    .toSorted((a, b) => b.length - a.length);
  return base ? OPENAI_PRICES[base] : FALLBACK;
};

export const costUsd = (model: string, u: UsageNumbers) => {
  const p = priceFor(model);
  const cached = Math.min(u.cachedInputTokens, u.inputTokens);
  return (
    ((u.inputTokens - cached) * p.input +
      cached * p.cachedInput +
      u.outputTokens * p.output) /
      1_000_000 +
    u.webSearches * WEB_SEARCH_PER_CALL
  );
};
