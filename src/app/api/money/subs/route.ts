import { NextResponse } from 'next/server';
import { applyExpenseOps, isExpenseOp, type Expense, type ExpenseOp } from '@/lib/money';
import { readList, writeList, checkPassword } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const KEY = 'money_expenses';

/**
 * Unlike goals, none of this is public. What you pay, and from which card, is
 * only ever sent to a request carrying the admin key. Without it the answer is
 * a refusal, not an empty list, so nothing here is browsable.
 */
export async function GET(req: Request) {
  if (!checkPassword(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  try {
    const expenses = await readList<Expense>(KEY);
    return NextResponse.json(expenses, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to read expenses:', err);
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

    const ops = (body.ops as unknown[]).filter(isExpenseOp) as ExpenseOp[];
    if (ops.length === 0) {
      return NextResponse.json({ error: 'NO_VALID_OPS' }, { status: 400 });
    }

    const next = applyExpenseOps(await readList<Expense>(KEY), ops);
    await writeList(KEY, next);
    return NextResponse.json({ success: true, expenses: next });
  } catch (err) {
    console.error('Failed to save expenses:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
