import { NextResponse } from 'next/server';
import { applyTipOps, isTipOp, type TipOp, type TrackerTip } from '@/lib/tips';
import { readKey, writeKey, checkPassword } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const KEY = 'tracker_tips';

/** Stored tips; the list starts empty. */
async function current(): Promise<TrackerTip[]> {
  const stored = await readKey<TrackerTip[]>(KEY);
  if (stored === null) return [];
  if (!Array.isArray(stored)) throw new Error(`Stored value at "${KEY}" is not a list`);
  return stored;
}

export async function GET() {
  try {
    return NextResponse.json(await current(), { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to read tips:', err);
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

    const ops = (body.ops as unknown[]).filter(isTipOp) as TipOp[];
    if (ops.length === 0) {
      return NextResponse.json({ error: 'NO_VALID_OPS' }, { status: 400 });
    }

    const next = applyTipOps(await current(), ops);
    await writeKey(KEY, next);
    return NextResponse.json({ success: true, tips: next });
  } catch (err) {
    console.error('Failed to save tips:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
