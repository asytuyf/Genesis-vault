import { NextResponse } from 'next/server';
import { applyLinkOps, isLinkOp, upgradeLinks, DEFAULT_LINKS, LINK_UPGRADES, type LinkOp, type TrackerLink } from '@/lib/links';
import { readKey, writeKey, checkPassword } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const KEY = 'tracker_links';
const UPGRADES_KEY = 'tracker_links_upgrades';

/**
 * Stored links, or the starting set the first time the tracker is opened.
 * Upgrades not yet applied to the stored list are applied and saved once.
 */
async function current(): Promise<TrackerLink[]> {
  const stored = await readKey<TrackerLink[]>(KEY);
  if (!Array.isArray(stored) || stored.length === 0) return DEFAULT_LINKS;

  const applied = (await readKey<string[]>(UPGRADES_KEY)) ?? [];
  if (LINK_UPGRADES.every((u) => applied.includes(u.id))) return stored;

  const next = upgradeLinks(stored, applied);
  await writeKey(KEY, next.links);
  await writeKey(UPGRADES_KEY, next.applied);
  return next.links;
}

export async function GET() {
  try {
    return NextResponse.json(await current(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to read links:', err);
    return NextResponse.json({ error: 'READ_FAILED' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!checkPassword(body?.password)) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (!Array.isArray(body?.ops)) {
      return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
    }

    const ops = (body.ops as unknown[]).filter(isLinkOp) as LinkOp[];
    if (ops.length === 0) {
      return NextResponse.json({ error: 'NO_VALID_OPS' }, { status: 400 });
    }

    const next = applyLinkOps(await current(), ops);
    await writeKey(KEY, next);
    return NextResponse.json({ success: true, links: next });
  } catch (err) {
    console.error('Failed to save links:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
