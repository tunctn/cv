/**
 * An env var read at request time. In dev it also falls back to .env.local,
 * so a value added there works without restarting the dev server.
 */
export async function serverEnv(name: string): Promise<string | null> {
  const value = process.env[name];
  if (value || !import.meta.env.DEV) {
    return value || null;
  }
  try {
    const { readFile } = await import("node:fs/promises");
    const text = await readFile(".env.local", "utf8");
    const line = text.split("\n").find((l) => l.trim().startsWith(`${name}=`));
    return line?.slice(line.indexOf("=") + 1).trim() || null;
  } catch {
    return null;
  }
}
