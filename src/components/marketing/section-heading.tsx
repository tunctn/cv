import { cn } from "#/lib/utils";

/** H2 plus an optional lede. No kicker labels above it, ever. */
export function SectionHeading({
  title,
  lede,
  align = "left",
  className,
}: {
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "max-w-[620px]",
        align === "center" && "mx-auto text-center",
        className
      )}
    >
      <h2 className="text-balance font-semibold text-[30px] leading-[1.1] tracking-[-0.03em] sm:text-[40px]">
        {title}
      </h2>
      {lede ? (
        <p className="mt-4 text-pretty text-[17px] text-muted-foreground leading-relaxed">
          {lede}
        </p>
      ) : null}
    </div>
  );
}
