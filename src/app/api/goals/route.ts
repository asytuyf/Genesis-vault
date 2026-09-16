import { NextResponse } from 'next/server';
import { applyOps, isGoalOp, type Goal, type GoalOp } from '@/lib/goals';
import { readGoals, writeGoals, checkPassword } from '@/lib/goalStore';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const goals = await readGoals();
    return NextResponse.json(goals, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to fetch goals:', err);
    return NextResponse.json({ error: 'READ_FAILED' }, { status: 500 });
  }
}

/**
 * Two write shapes are accepted:
 *
 *   { password, ops }          preferred. Each operation changes one goal or
 *                              one sub-task. The stored list is read, the
 *                              operations are applied here, and the result is
 *                              written back, so goals nobody touched are never
 *                              rewritten and a stale browser tab cannot undo
 *                              edits made on another device.
 *
 *   { password, updatedGoals } the original whole-list replace, kept so any
 *                              existing tool that posts the full array keeps
 *                              working.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!checkPassword(body?.password)) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (Array.isArray(body?.ops)) {
      const ops = (body.ops as unknown[]).filter(isGoalOp) as GoalOp[];
      if (ops.length === 0) {
        return NextResponse.json({ error: 'NO_VALID_OPS' }, { status: 400 });
      }
      const current = await readGoals();
      const next = applyOps(current, ops);
      await writeGoals(next);
      return NextResponse.json({ success: true, goals: next });
    }

    if (Array.isArray(body?.updatedGoals)) {
      await writeGoals(body.updatedGoals as Goal[]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  } catch (err) {
    console.error('Failed to save goals:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
