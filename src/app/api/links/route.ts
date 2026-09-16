import { NextResponse } from 'next/server';
import { applyLinkOps, isLinkOp, DEFAULT_LINKS, type LinkOp, type TrackerLink } from '@/lib/links';
import { readKey, writeKey, checkPassword } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const KEY = 'tracker_links';

/** Stored links, or a starting pair the first time the tracker is opened. */
async function current(): Promise<TrackerLink[]> {
  const stored = await readKey<TrackerLink[]>(KEY);
  if (Array.isArray(stored) && stored.length) return stored;
  return DEFAULT_LINKS;
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
