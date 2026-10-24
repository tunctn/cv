import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.BETTER_AUTH_SECRET || "dev-secret";

export const signPrintToken = (cvId: string, ttlMs = 60_000) => {
  const exp = Date.now() + ttlMs;
  const sig = createHmac("sha256", secret())
    .update(`${cvId}.${exp}`)
    .digest("hex");
  return `${exp}.${sig}`;
};

export const verifyPrintToken = (cvId: string, token: string) => {
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!(exp && sig) || exp < Date.now()) {
    return false;
  }
  const expected = createHmac("sha256", secret())
    .update(`${cvId}.${exp}`)
    .digest("hex");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};
