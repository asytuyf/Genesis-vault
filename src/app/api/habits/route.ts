import { NextResponse } from 'next/server';
import { applyHabitOps, isHabitOp, type Habit, type HabitOp } from '@/lib/habits';
import { readList, writeList, checkPassword } from '@/lib/kv';

export const dynamic = 'force-dynamic';

const HABITS_KEY = 'habits';

export async function GET() {
  try {
    const habits = await readList<Habit>(HABITS_KEY);
    return NextResponse.json(habits, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to fetch habits:', err);
    return NextResponse.json({ error: 'READ_FAILED' }, { status: 500 });
  }
}

/**
 * Two write shapes are accepted:
 *
 *   { password, ops }            preferred. Each operation changes one habit,
 *                                applied to the stored list here, so ticking a
 *                                day on your phone cannot wipe a habit you
 *                                added on the laptop.
 *
 *   { password, updatedHabits }  the original whole-list replace, kept so
 *                                anything still posting the full array works.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!checkPassword(body?.password)) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    if (Array.isArray(body?.ops)) {
      const ops = (body.ops as unknown[]).filter(isHabitOp) as HabitOp[];
      if (ops.length === 0) {
        return NextResponse.json({ error: 'NO_VALID_OPS' }, { status: 400 });
      }
      const current = await readList<Habit>(HABITS_KEY);
      const next = applyHabitOps(current, ops);
      await writeList(HABITS_KEY, next);
      return NextResponse.json({ success: true, habits: next });
    }

    if (Array.isArray(body?.updatedHabits)) {
      await writeList(HABITS_KEY, body.updatedHabits as Habit[]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  } catch (err) {
    console.error('Failed to save habits:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
