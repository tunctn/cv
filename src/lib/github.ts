import { createServerFn } from "@tanstack/react-start";

export const REPO = "usehomemade/smilecv";
export const REPO_URL = `https://github.com/${REPO}`;

let cache: { stars: number | null; at: number } | null = null;

/** Star count, cached for 10 minutes to stay well under GitHub's anonymous rate limit. */
export const getStars = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < 10 * 60_000) {
    return cache.stars;
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "smilecv.com",
      },
    });
    const stars = res.ok
      ? ((await res.json()) as { stargazers_count: number }).stargazers_count
      : (cache?.stars ?? null);
    cache = { stars, at: Date.now() };
    return stars;
  } catch {
    return cache?.stars ?? null;
  }
});
