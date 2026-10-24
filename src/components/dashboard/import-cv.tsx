import { FileUploadIcon } from "@hugeicons-pro/core-stroke-rounded";
import { useNavigate } from "@tanstack/react-router";
import {
  type ComponentProps,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import { Icon } from "#/components/icon";
import { Button } from "#/components/ui/button";
import { isGuestLimit } from "#/lib/guest";
import { IMPORT_ACCEPT, importCv } from "#/lib/import-cv";
import { cn } from "#/lib/utils";
import { m } from "#/paraglide/messages.js";

/** Import a file as a new CV, with a toast while it uploads. */
export function useCvImport() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const run = useCallback(
    async (file: File) => {
      if (busy) {
        return;
      }
      setBusy(true);
      const toastId = toast.loading(m.import_busy({ name: file.name }));
      try {
        const { id, search } = await importCv(file);
        toast.dismiss(toastId);
        await navigate({ to: "/cv/$id", params: { id }, search });
      } catch (e) {
        // A guest at their CV limit already sees the sign-up dialog.
        if (isGuestLimit(e)) {
          toast.dismiss(toastId);
        } else {
          toast.error((e as Error).message || m.import_failed(), {
            id: toastId,
          });
        }
        setBusy(false);
      }
    },
    [busy, navigate]
  );
  return { busy, run };
}

/** A button that opens the file picker and imports the chosen file. */
export function ImportButton({
  busy,
  onFile,
  label,
  disabled,
  ...props
}: {
  busy: boolean;
  onFile: (file: File) => void;
  label?: string;
} & Omit<ComponentProps<typeof Button>, "onClick">) {
  const input = useRef<HTMLInputElement>(null);
  const open = useCallback(() => input.current?.click(), []);
  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (file) {
        onFile(file);
      }
    },
    [onFile]
  );
  return (
    <>
      <Button
        variant="outline"
        {...props}
        disabled={busy || disabled}
        onClick={open}
      >
        <Icon data-icon="inline-start" icon={FileUploadIcon} />
        {busy ? m.import_busy_short() : (label ?? m.import_cta())}
      </Button>
      <input
        accept={IMPORT_ACCEPT}
        hidden
        onChange={onChange}
        ref={input}
        type="file"
      />
    </>
  );
}

/**
 * Drop a file anywhere on the page to import it. A quiet full-page overlay
 * shows while a file is dragged over the window.
 */
export function FileDropOverlay({
  onFile,
  disabled,
}: {
  onFile: (file: File) => void;
  disabled?: boolean;
}) {
  const [over, setOver] = useState(false);
  const depth = useRef(0);
  const fileRef = useRef(onFile);
  fileRef.current = onFile;

  useEffect(() => {
    if (disabled) {
      return;
    }
    const hasFiles = (e: DragEvent) =>
      Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) {
        return;
      }
      depth.current += 1;
      setOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) {
        return;
      }
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) {
        setOver(false);
      }
    };
    const dragOver = (e: DragEvent) => {
      if (hasFiles(e)) {
        e.preventDefault();
      }
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) {
        return;
      }
      e.preventDefault();
      depth.current = 0;
      setOver(false);
      const file = e.dataTransfer?.files[0];
      if (file) {
        fileRef.current(file);
      }
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", dragOver);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", dragOver);
      window.removeEventListener("drop", drop);
    };
  }, [disabled]);

  return (
    <div
      aria-hidden={!over}
      className={cn(
        "pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm transition-opacity duration-150",
        over ? "opacity-100" : "opacity-0"
      )}
    >
      <div className="flex w-full max-w-[520px] flex-col items-center rounded-[28px] border-2 border-foreground/20 border-dashed bg-surface px-8 py-14 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-background shadow-sm">
          <Icon className="size-6" icon={FileUploadIcon} />
        </span>
        <p className="mt-4 font-semibold text-[20px] tracking-[-0.02em]">
          {m.import_drop_title()}
        </p>
        <p className="mt-1.5 text-[14px] text-muted-foreground">
          {m.import_drop_body()}
        </p>
      </div>
    </div>
  );
}
