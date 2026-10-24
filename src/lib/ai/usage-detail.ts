/**
 * The shape of ai_usage.detail: what an AI request did, for the admin
 * detail view. Everything is optional; older rows have no detail at all.
 */

export interface UsageStepDetail {
  cachedInputTokens: number;
  finishReason?: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  /** Web searches in this step: the query and the result URLs. */
  searches: { query?: string; urls: string[] }[];
  /** Text the model wrote in this step (capped). */
  text?: string;
  /** Tool calls in this step: name and a short JSON of the arguments. */
  tools: { name: string; args?: string; error?: string }[];
}

export interface UsagePrices {
  cachedInput: number;
  /** USD per 1M tokens. */
  input: number;
  output: number;
  /** USD per web search call. */
  webSearch: number;
}

export interface UsageDetail {
  attachments?: string[];
  errorStack?: string;
  failedSections?: string[];
  finishReason?: string;
  /** Translation: target language, sections sent, sections that failed. */
  language?: string;
  locale?: string;
  /** The prices the cost was computed with. */
  prices?: UsagePrices;
  /** The user's message (last one for a chat) and attachment names. */
  prompt?: string;
  /** The assistant's final text. */
  reply?: string;
  /** Full length of the reply before capping. */
  replyLength?: number;
  sections?: string[];
  steps?: UsageStepDetail[];
}
