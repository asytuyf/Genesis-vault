import { NextResponse } from 'next/server';
import { applyKlarnaOps, isKlarnaOp, type KlarnaOp, type KlarnaPurchase } from '@/lib/money';
import { readList, writeList, checkPassword } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const KEY = 'money_klarna';

/** What you owe is as private as what you pay: admin key or nothing. */
export async function GET(req: Request) {
  if (!checkPassword(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const klarna = await readList<KlarnaPurchase>(KEY);
    return NextResponse.json(klarna, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to read Klarna purchases:', err);
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

    const ops = (body.ops as unknown[]).filter(isKlarnaOp) as KlarnaOp[];
    if (ops.length === 0) {
      return NextResponse.json({ error: 'NO_VALID_OPS' }, { status: 400 });
    }

    const next = applyKlarnaOps(await readList<KlarnaPurchase>(KEY), ops);
    await writeList(KEY, next);
    return NextResponse.json({ success: true, klarna: next });
  } catch (err) {
    console.error('Failed to save Klarna purchases:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
