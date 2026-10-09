import { NextResponse } from 'next/server';
import { applyCardOps, isCardOp, type CardOp, type PaymentCard } from '@/lib/money';
import { readList, writeList, checkPassword } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const KEY = 'money_cards';

/** Card labels are as private as the amounts: admin key or nothing. */
export async function GET(req: Request) {
  if (!checkPassword(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const cards = await readList<PaymentCard>(KEY);
    return NextResponse.json(cards, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to read cards:', err);
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

    const ops = (body.ops as unknown[]).filter(isCardOp) as CardOp[];
    if (ops.length === 0) {
      return NextResponse.json({ error: 'NO_VALID_OPS' }, { status: 400 });
    }

    const next = applyCardOps(await readList<PaymentCard>(KEY), ops);
    await writeList(KEY, next);
    return NextResponse.json({ success: true, cards: next });
  } catch (err) {
    console.error('Failed to save cards:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
