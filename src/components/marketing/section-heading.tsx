import { cn } from "#/lib/utils";

export const SectionHeading = ({
  title,
  lede,
  align = "left",
  className,
}: {
  title: React.ReactNode;
  lede?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}) => (
  <div
    className={cn(
      "max-w-[620px]",
      align === "center" && "mx-auto text-center",
      className
    )}
  >
    <h2 className="text-[30px] leading-[1.1] font-semibold tracking-[-0.03em] text-balance sm:text-[40px]">
      {title}
    </h2>
    {lede ? (
      <p className="text-muted-foreground mt-4 text-[17px] leading-relaxed text-pretty">
        {lede}
      </p>
    ) : null}
  </div>
);
