import { NextResponse } from 'next/server';
import { readKey, writeKey } from '@/lib/kv';

export const dynamic = 'force-dynamic';

/**
 * Daily contribution counts, read from the same calendar that GitHub draws on a
 * profile page.
 *
 * The page used to count entries from the public events feed, which only lists
 * public activity and keeps roughly the last few dozen events, so days spent in
 * private repositories showed as empty and the week looked months out of date.
 * The calendar counts everything the profile counts, including private work
 * when the profile is set to show it.
 *
 * Results are cached briefly so opening the page repeatedly does not hammer
 * GitHub, and a failed fetch falls back to the last good copy instead of
 * blanking the grid.
 */

const CACHE_PREFIX = 'github_contrib:';
const FRESH_MS = 10 * 60 * 1000;
const USERNAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/;

interface Cached {
  user: string;
  days: Record<string, number>;
  total: number;
  fetchedAt: string;
}

/** Pull date to count out of the contribution calendar markup. */
export function parseCalendar(html: string): Record<string, number> {
  const days: Record<string, number> = {};

  // Each day cell carries its date and an id that its tooltip points back to.
  const cellById = new Map<string, string>();
  const cellRe = /<td[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*id="([^"]+)"[^>]*>/g;
  for (const m of html.matchAll(cellRe)) {
    cellById.set(m[2], m[1]);
    days[m[1]] = 0;
  }

  // Cells sometimes list the id before the date.
  const cellReAlt = /<td[^>]*id="([^"]+)"[^>]*data-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g;
  for (const m of html.matchAll(cellReAlt)) {
    cellById.set(m[1], m[2]);
    days[m[2]] = 0;
  }

  const tipRe = /<tool-tip[^>]*for="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g;
  for (const m of html.matchAll(tipRe)) {
    const date = cellById.get(m[1]);
    if (!date) continue;
    const count = /^(\d+)\s+contribution/.exec(m[2].trim());
    days[date] = count ? Number(count[1]) : 0;
  }

  return days;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const user = (url.searchParams.get('user') || '').trim();

  if (!USERNAME_RE.test(user)) {
    return NextResponse.json({ error: 'BAD_USERNAME' }, { status: 400 });
  }

  const cacheKey = `${CACHE_PREFIX}${user.toLowerCase()}`;
  let cached: Cached | null = null;
  try {
    cached = await readKey<Cached>(cacheKey);
  } catch {
    // A cache read failure should never stop a live fetch.
  }

  const fresh = cached && Date.now() - Date.parse(cached.fetchedAt) < FRESH_MS;
  if (fresh && cached) {
    return NextResponse.json({ ...cached, cached: true }, { headers: { 'Cache-Control': 'no-store' } });
  }

  try {
    const res = await fetch(`https://github.com/users/${user}/contributions`, {
      headers: {
        // GitHub serves the calendar fragment to any client that asks politely.
        accept: 'text/html',
        'user-agent': 'genesis-vault-tracker',
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const days = parseCalendar(await res.text());
    if (Object.keys(days).length === 0) throw new Error('No day cells found');

    const payload: Cached = {
      user,
      days,
      total: Object.values(days).reduce((a, b) => a + b, 0),
      fetchedAt: new Date().toISOString(),
    };
    await writeKey(cacheKey, payload).catch(() => {});
    return NextResponse.json({ ...payload, cached: false }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to read the contribution calendar:', err);
    if (cached) {
      return NextResponse.json({ ...cached, cached: true, stale: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.json({ error: 'FETCH_FAILED' }, { status: 502 });
  }
}
