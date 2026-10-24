// Builds every logo asset from the single master image: brand/logo.png.
// Replace that file and re-run (it also runs before `dev` and `build`).
import { mkdirSync } from "node:fs";
import sharp from "sharp";

const MASTER = "brand/logo.png";
const OUT = "public/brand";

/**
 * Apple-style continuous-corner squircle (superellipse, n = 5) as an SVG path,
 * filling a size×size box.
 */
function squircle(size, n = 5, steps = 360) {
  const r = size / 2;
  const pts = [];
  for (let i = 0; i < steps; i += 1) {
    const t = (i / steps) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = r + r * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = r + r * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

async function masked(size, file) {
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><path d="${squircle(size)}" fill="#fff"/></svg>`
  );
  await sharp(MASTER)
    .resize(size, size)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toFile(`${OUT}/${file}`);
}

mkdirSync(OUT, { recursive: true });
await Promise.all([
  // Squircle versions: topbar, favicons, social/PWA.
  masked(128, "logo-128.png"),
  masked(64, "favicon-64.png"),
  masked(32, "favicon-32.png"),
  masked(512, "logo-512.png"),
  // iOS applies its own squircle mask, so the touch icon stays full-bleed square.
  sharp(MASTER).resize(180, 180).png().toFile(`${OUT}/apple-touch-icon.png`),
]);
console.log("[brand] icons generated from", MASTER);
