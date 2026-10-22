import { NextResponse } from 'next/server';
import { applySpendOps, isSpendOp, type Spend, type SpendOp } from '@/lib/money';
import { readList, writeList, checkPassword } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const KEY = 'money_spending';

/** Where your money went is as private as the rest: admin key or nothing. */
export async function GET(req: Request) {
  if (!checkPassword(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const spending = await readList<Spend>(KEY);
    return NextResponse.json(spending, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to read spending:', err);
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

    const ops = (body.ops as unknown[]).filter(isSpendOp) as SpendOp[];
    if (ops.length === 0) {
      return NextResponse.json({ error: 'NO_VALID_OPS' }, { status: 400 });
    }

    const next = applySpendOps(await readList<Spend>(KEY), ops);
    await writeList(KEY, next);
    return NextResponse.json({ success: true, spending: next });
  } catch (err) {
    console.error('Failed to save spending:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
