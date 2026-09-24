import { NextResponse } from 'next/server';
import { readGoals } from '@/lib/goalStore';
import { pickDue, reminderMessage } from '@/lib/reminders';
import { pushConfigured, pushToAll, readPushState, readSent, writePushState, writeSent } from '@/lib/pushStore';

export const dynamic = 'force-dynamic';

/**
 * Sends the sub-task reminders that have come due. Something has to call this
 * every few minutes: a Vercel cron on a paid plan, or any free scheduler
 * (cron-job.org, Upstash QStash) hitting
 *
 *   GET /api/reminders   with   Authorization: Bearer <CRON_SECRET>
 *   or  GET /api/reminders?key=<CRON_SECRET>
 *
 * Each reminder is sent once. Calling it more often only makes reminders more
 * punctual.
 */
async function run(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || url.searchParams.get('key');
  if (secret ? given !== secret : process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  if (!pushConfigured()) {
    return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 503 });
  }

  try {
    const now = Date.now();
    const [goals, state, sent] = await Promise.all([readGoals(), readPushState(), readSent(now)]);
    if (!state.subscriptions.length) return NextResponse.json({ reminders: 0, delivered: 0, devices: 0 });

    const { send, skip } = pickDue(goals, now, (key) => key in sent, state.timeZone);
    for (const key of skip) sent[key] = now;

    let current = state;
    let changed = false;
    let delivered = 0;
    for (const r of send) {
      const result = await pushToAll(current, reminderMessage(r, now), url.origin);
      current = result.state;
      delivered += result.sent;
      changed ||= result.changed;
      // Marked as handled even if every device failed: a push service that is
      // down now should not turn into a burst of stale reminders later.
      sent[r.key] = now;
    }

    if (send.length || skip.length) await writeSent(sent);
    if (changed) await writePushState(current);

    return NextResponse.json({
      reminders: send.length,
      delivered,
      skipped: skip.length,
      devices: current.subscriptions.length,
    });
  } catch (err) {
    console.error('Reminder run failed:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}

export const GET = run;
export const POST = run;
