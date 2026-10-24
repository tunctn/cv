import { type Browser, chromium } from "playwright-core";

let browser: Promise<Browser> | null = null;

/** One shared headless Chromium for exports. */
export function getBrowser() {
  if (!browser) {
    browser = chromium
      .launch(
        process.env.NODE_ENV === "production"
          ? { args: ["--no-sandbox", "--disable-dev-shm-usage"] }
          : { channel: "chrome" }
      )
      .then((b) => {
        b.on("disconnected", () => {
          browser = null;
        });
        return b;
      })
      .catch((err) => {
        browser = null;
        throw err;
      });
  }
  return browser;
}
