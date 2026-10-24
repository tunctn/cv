import { chromium } from "playwright-core";
import type { Browser } from "playwright-core";

let browser: Promise<Browser> | null = null;

const launch = async () => {
  try {
    const b = await chromium.launch(
      process.env.NODE_ENV === "production"
        ? { args: ["--no-sandbox", "--disable-dev-shm-usage"] }
        : { channel: "chrome" }
    );
    b.on("disconnected", () => {
      browser = null;
    });
    return b;
  } catch (error) {
    browser = null;
    throw error;
  }
};

export const getBrowser = () => {
  if (!browser) {
    browser = launch();
  }
  return browser;
};
