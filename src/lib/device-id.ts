import { functionalAllowed } from "#/lib/consent";
import { DEVICE_COOKIE } from "#/lib/guest";

export const ensureDeviceId = async () => {
  // A functional cookie: without consent the guest limits count per guest
  // account only.
  if (
    typeof document === "undefined" ||
    !functionalAllowed() ||
    document.cookie.includes(`${DEVICE_COOKIE}=`)
  ) {
    return;
  }
  try {
    const FingerprintJS = await import("@fingerprintjs/fingerprintjs");
    const agent = await FingerprintJS.load({ monitoring: false });
    const { visitorId } = await agent.get();
    // oxlint-disable-next-line unicorn/no-document-cookie -- a plain cookie the server reads on every request
    document.cookie = `${DEVICE_COOKIE}=${visitorId}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Without it the limits still apply per guest account.
  }
};
