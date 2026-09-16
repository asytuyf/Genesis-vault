// Server-side storage for goals.
//
// Production reads and writes the Upstash Redis key `goals`, exactly as before.
// When the Upstash credentials are absent the store falls back to a JSON file
// under .dev-data so the site can be run locally without touching live data.
// The fallback refuses to run in production, so a missing env var on Vercel
// fails loudly instead of quietly serving an empty list.

import { Redis } from "@upstash/redis";
import fs from "node:fs/promises";
import path from "node:path";
import type { Goal } from "@/lib/goals";

const GOALS_KEY = "goals";
const isProd = process.env.NODE_ENV === "production";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const devFile = path.join(process.cwd(), ".dev-data", "goals.json");

function assertLocalFallback() {
  if (!redis && isProd) {
    throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not configured");
  }
}

export async function readGoals(): Promise<Goal[]> {
  assertLocalFallback();

  if (redis) {
    const data = await redis.get<Goal[]>(GOALS_KEY);
    if (data == null) return [];
    // Never hand back something that is not a list: writing on top of it would
    // replace every stored goal.
    if (!Array.isArray(data)) throw new Error("Stored goals are not a list");
    return data;
  }

  try {
    const parsed = JSON.parse(await fs.readFile(devFile, "utf8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return [];
    throw err;
  }
}

export async function writeGoals(goals: Goal[]): Promise<void> {
  assertLocalFallback();
  if (!Array.isArray(goals)) throw new Error("Refusing to store goals that are not a list");

  if (redis) {
    await redis.set(GOALS_KEY, goals);
    return;
  }

  await fs.mkdir(path.dirname(devFile), { recursive: true });
  await fs.writeFile(devFile, JSON.stringify(goals, null, 2), "utf8");
}

/** True when the request carries the admin key. */
export function checkPassword(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (expected) return typeof password === "string" && password === expected;
  // Local development without an admin password configured: any non-empty key
  // unlocks the local JSON file. Production always requires the real password.
  return !isProd && typeof password === "string" && password.length > 0;
}
