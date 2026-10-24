import { m } from "#/paraglide/messages.js";
import type { Locale } from "#/paraglide/runtime.js";

/**
 * FAQ content. Shared by the FAQ section and by /api/faq, which hands the
 * English answers to the model so its replies never contradict the page.
 */
export const CONTACT_EMAIL = "support@smilecv.com";

const QUESTIONS = [
  [m.faq_q1, m.faq_a1],
  [m.faq_q2, m.faq_a2],
  [m.faq_q3, m.faq_a3],
  [m.faq_q4, m.faq_a4],
  [m.faq_q5, m.faq_a5],
  [m.faq_q6, m.faq_a6],
  [m.faq_q7, m.faq_a7],
  [m.faq_q8, m.faq_a8],
] as const;

/** Questions and answers in the given locale (current locale by default). */
export function faqItems(locale?: Locale) {
  const options = locale ? { locale } : undefined;
  return [
    ...QUESTIONS.map(([q, a]) => ({
      q: q({}, options),
      a: a({}, options),
    })),
    {
      q: m.faq_q9({}, options),
      a: m.faq_a9({ email: CONTACT_EMAIL }, options),
    },
  ];
}
