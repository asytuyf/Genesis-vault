// Server-side key/value storage.
//
// Production reads and writes Upstash Redis, exactly as before. When the
// Upstash credentials are absent the store falls back to JSON files under
// .dev-data so the site can be run locally without touching live data. The
// fallback refuses to run in production, so a missing environment variable
// fails loudly instead of quietly serving nothing.

import { Redis } from "@upstash/redis";
import fs from "node:fs/promises";
import path from "node:path";

const isProd = process.env.NODE_ENV === "production";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

const devFile = (key: string) => path.join(process.cwd(), ".dev-data", `${key}.json`);

function assertConfigured() {
  if (!redis && isProd) {
    throw new Error("UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not configured");
  }
}

/** Read any stored value. Returns null when the key has never been written. */
export async function readKey<T>(key: string): Promise<T | null> {
  assertConfigured();

  if (redis) return (await redis.get<T>(key)) ?? null;

  try {
    return JSON.parse(await fs.readFile(devFile(key), "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") return null;
    throw err;
  }
}

export async function writeKey<T>(key: string, value: T): Promise<void> {
  assertConfigured();

  if (redis) {
    await redis.set(key, value);
    return;
  }

  await fs.mkdir(path.dirname(devFile(key)), { recursive: true });
  await fs.writeFile(devFile(key), JSON.stringify(value, null, 2), "utf8");
}

/**
 * Read a list. Anything stored that is not a list is an error rather than an
 * empty result, because writing on top of an empty result would destroy it.
 */
export async function readList<T>(key: string): Promise<T[]> {
  const data = await readKey<T[]>(key);
  if (data == null) return [];
  if (!Array.isArray(data)) throw new Error(`Stored value at "${key}" is not a list`);
  return data;
}

export async function writeList<T>(key: string, value: T[]): Promise<void> {
  if (!Array.isArray(value)) throw new Error(`Refusing to store a non-list at "${key}"`);
  await writeKey(key, value);
}

/** True when the request carries the admin key. */
export function checkPassword(password: unknown): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (expected) return typeof password === "string" && password === expected;
  // Local development without an admin password configured: any non-empty key
  // unlocks the local files. Production always requires the real password.
  return !isProd && typeof password === "string" && password.length > 0;
}
