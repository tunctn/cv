export const serverEnv = async (name: string): Promise<string | null> => {
  const value = process.env[name];
  if (value || !import.meta.env.DEV) {
    return value || null;
  }
  try {
    const { readFile } = await import("node:fs/promises");
    const text = await readFile(".env.local", "utf-8");
    const line = text.split("\n").find((l) => l.trim().startsWith(`${name}=`));
    return line?.slice(line.indexOf("=") + 1).trim() || null;
  } catch {
    return null;
  }
};
