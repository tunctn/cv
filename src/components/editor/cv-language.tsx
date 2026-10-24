import { LanguageSquareIcon } from "@hugeicons-pro/core-stroke-rounded";
import { useCallback, useState } from "react";

import { Icon } from "#/components/icon";
import { LanguageGrid } from "#/components/language-select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Button } from "#/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { cvLocale, hasWords, withLanguage } from "#/lib/cv/i18n-labels";
import type { CV } from "#/lib/cv/schema";
import { LANGUAGE_NAMES } from "#/lib/i18n";
import { m } from "#/paraglide/messages.js";
import type { Locale } from "#/paraglide/runtime.js";

export const CvLanguage = ({
  cv,
  onChange,
  onTranslate,
}: {
  cv: CV;
  onChange: (update: (cv: CV) => CV) => void;
  onTranslate: (locale: Locale) => void;
}) => {
  const current = cvLocale(cv.language);
  const [asking, setAsking] = useState<Locale | null>(null);

  const [open, setOpen] = useState(false);
  const pick = useCallback(
    (to: Locale) => {
      setOpen(false);
      if (to === current) {
        return;
      }
      if (hasWords(cv)) {
        setAsking(to);
      } else {
        onChange((c) => withLanguage(c, to));
      }
    },
    [current, cv, onChange]
  );
  const close = useCallback((isOpen: boolean) => {
    if (!isOpen) {
      setAsking(null);
    }
  }, []);
  const headingsOnly = useCallback(() => {
    if (asking) {
      onChange((c) => withLanguage(c, asking));
    }
    setAsking(null);
  }, [asking, onChange]);
  const translate = useCallback(() => {
    if (asking) {
      onChange((c) => ({ ...c, language: asking }));
      onTranslate(asking);
    }
    setAsking(null);
  }, [asking, onChange, onTranslate]);

  return (
    <>
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger
          render={
            <Button aria-label={m.ed_cv_language()} variant="ghost">
              <Icon data-icon="inline-start" icon={LanguageSquareIcon} />
              {LANGUAGE_NAMES[current]}
            </Button>
          }
        />
        <PopoverContent
          align="start"
          aria-label={m.ed_cv_language()}
          className="max-h-(--available-height) w-[min(400px,calc(100vw-32px))] [scrollbar-width:thin] gap-0 overflow-y-auto p-1.5"
          sideOffset={8}
        >
          <LanguageGrid current={current} onPick={pick} />
        </PopoverContent>
      </Popover>
      <AlertDialog onOpenChange={close} open={asking !== null}>
        <AlertDialogContent className="gap-5 rounded-[24px] p-6 sm:max-w-[400px]">
          <AlertDialogHeader className="gap-1.5 text-start sm:text-start">
            <AlertDialogTitle className="text-[18px] font-semibold tracking-[-0.01em]">
              {m.ed_lang_title({
                language: asking ? LANGUAGE_NAMES[asking] : "",
              })}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[14px]">
              {m.ed_lang_body()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Stacked full-width choices: long labels in any language fit. */}
          <div className="flex flex-col gap-2">
            <Button onClick={translate} size="lg">
              {m.ed_lang_translate()}
            </Button>
            <Button onClick={headingsOnly} size="lg" variant="outline">
              {m.ed_lang_headings()}
            </Button>
            <AlertDialogCancel size="lg" variant="ghost">
              {m.ed_lang_cancel()}
            </AlertDialogCancel>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
