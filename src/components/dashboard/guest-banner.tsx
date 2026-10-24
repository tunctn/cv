import { Link } from "@tanstack/react-router";

import { Button } from "#/components/ui/button";
import { m } from "#/paraglide/messages.js";

export const GuestBanner = () => (
  <section className="bg-surface flex flex-col-reverse gap-6 rounded-[28px] p-6 sm:flex-row sm:items-center sm:gap-10 sm:p-10">
    <div className="min-w-0 flex-1">
      <h2 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] text-balance sm:text-[34px]">
        {m.guest_title()}
      </h2>
      <p className="text-muted-foreground mt-3 max-w-[520px] text-[16px] leading-relaxed text-pretty sm:text-[17px]">
        {m.guest_body()}
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button nativeButton={false} render={<Link to="/signup" />} size="lg">
          {m.guest_sign_up()}
        </Button>
        <Button
          nativeButton={false}
          render={<Link to="/login" />}
          size="lg"
          variant="ghost"
        >
          {m.common_log_in()}
        </Button>
      </div>
    </div>
    <img
      alt=""
      className="h-auto w-[180px] shrink-0 self-center sm:w-[260px]"
      decoding="async"
      height={374}
      src="/illustrations/save-to-cloud.webp"
      width={480}
    />
  </section>
);
