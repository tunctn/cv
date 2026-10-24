import { ArrowUp02Icon } from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useId, useRef, useState } from "react";
import { Icon } from "#/components/icon";

import { faqItems } from "#/components/marketing/faq-copy";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "#/components/ui/accordion";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";
import { getLocale } from "#/paraglide/runtime.js";

const ROW_X = "px-5 sm:px-11";
const MAX_QUESTION = 300;

type AskState =
  | { status: "idle" }
  | { status: "loading"; question: string }
  | { status: "done"; question: string; answer: string }
  | { status: "error"; question: string; message: string };

function AskRow() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [state, setState] = useState<AskState>({ status: "idle" });

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value),
    []
  );

  const onSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const question = value.trim().slice(0, MAX_QUESTION);
      if (!question || state.status === "loading") {
        return;
      }
      setState({ status: "loading", question });
      try {
        const res = await fetch("/api/faq", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ question, locale: getLocale() }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          answer?: string;
          error?: string;
        };
        if (!(res.ok && data.answer)) {
          setState({
            status: "error",
            question,
            message: data.error ?? m.faq_ask_error(),
          });
          return;
        }
        setState({ status: "done", question, answer: data.answer });
        setValue("");
      } catch {
        setState({ status: "error", question, message: m.faq_ask_error() });
      }
    },
    [state.status, value]
  );

  const askAnother = useCallback(() => {
    setState({ status: "idle" });
    // The input mounts again on the next render; focus it then.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, []);

  if (state.status !== "idle") {
    return (
      <div aria-live="polite">
        <p
          className={cn(
            "py-6 font-medium text-[18px] leading-snug tracking-[-0.01em] sm:py-7 sm:text-[22px]",
            ROW_X
          )}
        >
          {state.question}
        </p>
        <div
          className={cn(
            "-mt-1 max-w-[720px] pb-7 text-[16px] leading-relaxed sm:pe-24",
            ROW_X
          )}
        >
          {state.status === "loading" ? (
            <div className="space-y-2.5 pt-1.5" role="status">
              <span className="sr-only">{m.faq_ask_thinking()}</span>
              <div className="h-3 w-[92%] animate-pulse rounded-full bg-foreground/[0.07]" />
              <div className="h-3 w-[78%] animate-pulse rounded-full bg-foreground/[0.07]" />
              <div className="h-3 w-[54%] animate-pulse rounded-full bg-foreground/[0.07]" />
            </div>
          ) : null}
          {state.status === "done" ? (
            <p className="whitespace-pre-line text-muted-foreground">
              {state.answer}
            </p>
          ) : null}
          {state.status === "error" ? (
            <p className="text-destructive">{state.message}</p>
          ) : null}
          {state.status === "loading" ? null : (
            <button
              className="mt-4 cursor-pointer text-[14px] text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              onClick={askAnother}
              type="button"
            >
              {m.faq_ask_another()}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form className={cn("flex items-center gap-4", ROW_X)} onSubmit={onSubmit}>
      <label className="sr-only" htmlFor={inputId}>
        {m.faq_ask_placeholder()}
      </label>
      <input
        autoComplete="off"
        className="h-[76px] min-w-0 flex-1 bg-transparent font-medium text-[18px] text-foreground outline-none placeholder:text-muted-foreground/70 sm:h-[84px] sm:text-[22px]"
        id={inputId}
        maxLength={MAX_QUESTION}
        onChange={onChange}
        placeholder={m.faq_ask_placeholder()}
        ref={inputRef}
        value={value}
      />
      <button
        aria-label={m.faq_ask_submit()}
        className={cn(
          "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-foreground text-background transition-[opacity,scale] duration-150 ease-out active:scale-95",
          value.trim()
            ? "opacity-100"
            : "pointer-events-none scale-90 opacity-0"
        )}
        type="submit"
      >
        <Icon className="size-4" icon={ArrowUp02Icon} />
      </button>
    </form>
  );
}

export function Faq() {
  return (
    <section className="scroll-mt-24 pt-24 sm:pt-36" id="faq">
      <div className="mx-auto max-w-[920px]">
        <h2 className="text-balance font-semibold text-[38px] leading-[1.05] tracking-[-0.035em] sm:text-[56px]">
          {m.faq_title()}
        </h2>
        <div className="mt-10 overflow-hidden rounded-[24px] border border-border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.03),0_4px_16px_rgba(0,0,0,0.03)] sm:mt-12">
          <Accordion>
            {faqItems().map((item) => (
              <AccordionItem
                className="border-border border-b"
                key={item.q}
                value={item.q}
              >
                <AccordionTrigger
                  className={cn(
                    "items-center gap-6 rounded-none py-6 font-medium text-[18px] leading-snug tracking-[-0.01em] hover:no-underline focus-visible:ring-inset **:data-[slot=accordion-trigger-icon]:size-5 **:data-[slot=accordion-trigger-icon]:text-muted-foreground sm:py-7 sm:text-[22px]",
                    ROW_X
                  )}
                >
                  {item.q}
                </AccordionTrigger>
                <AccordionContent
                  className={cn(
                    "-mt-1 max-w-[720px] in-data-starting-style:-translate-y-1 pb-7 text-[16px] text-muted-foreground leading-relaxed in-data-ending-style:opacity-0 in-data-starting-style:opacity-0 transition-[opacity,translate] duration-200 ease-out motion-reduce:in-data-starting-style:translate-y-0 sm:pe-24",
                    ROW_X
                  )}
                >
                  <p>{item.a}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <AskRow />
        </div>
      </div>
    </section>
  );
}
