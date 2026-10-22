import { NextResponse } from 'next/server';
import { applyBudgetOps, isBudgetOp, type Budget, type BudgetOp } from '@/lib/money';
import { readList, writeList, checkPassword } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const KEY = 'money_budget';

/** What you live on is private too: admin key or nothing. */
export async function GET(req: Request) {
  if (!checkPassword(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const budget = await readList<Budget>(KEY);
    return NextResponse.json(budget, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to read budget:', err);
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

    const ops = (body.ops as unknown[]).filter(isBudgetOp) as BudgetOp[];
    if (ops.length === 0) {
      return NextResponse.json({ error: 'NO_VALID_OPS' }, { status: 400 });
    }

    const next = applyBudgetOps(await readList<Budget>(KEY), ops);
    await writeList(KEY, next);
    return NextResponse.json({ success: true, budget: next });
  } catch (err) {
    console.error('Failed to save budget:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
