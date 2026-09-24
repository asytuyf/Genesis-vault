import { NextResponse } from 'next/server';
import { checkPassword } from '@/lib/kv';
import {
  isSubscription, pushConfigured, pushToAll, readPushState, vapidPublicKey, writePushState,
} from '@/lib/pushStore';

export const dynamic = 'force-dynamic';

const validZone = (tz: unknown): tz is string => {
  if (typeof tz !== 'string' || !tz) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

/** The public key a browser needs to subscribe, and with the admin key, how many devices are signed up. */
export async function GET(req: Request) {
  const body: Record<string, unknown> = { configured: pushConfigured(), publicKey: vapidPublicKey() };
  if (checkPassword(req.headers.get('x-admin-key'))) {
    try {
      const state = await readPushState();
      body.devices = state.subscriptions.length;
      body.timeZone = state.timeZone ?? null;
    } catch (err) {
      console.error('Failed to read push devices:', err);
    }
  }
  return NextResponse.json(body, { headers: { 'Cache-Control': 'no-store' } });
}

/**
 *   { password, action: "subscribe",   subscription, timeZone }
 *   { password, action: "unsubscribe", endpoint }
 *   { password, action: "test" }       sends a notification to every device
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!checkPassword(body?.password)) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const state = await readPushState();

    if (body.action === 'subscribe') {
      if (!isSubscription(body.subscription)) {
        return NextResponse.json({ error: 'BAD_SUBSCRIPTION' }, { status: 400 });
      }
      const { endpoint, keys } = body.subscription;
      const subscriptions = state.subscriptions.filter((s) => s.endpoint !== endpoint);
      subscriptions.push({ endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth }, addedAt: new Date().toISOString() });
      const next = { timeZone: validZone(body.timeZone) ? body.timeZone : state.timeZone, subscriptions };
      await writePushState(next);
      return NextResponse.json({ success: true, devices: subscriptions.length });
    }

    if (body.action === 'unsubscribe') {
      const subscriptions = state.subscriptions.filter((s) => s.endpoint !== body.endpoint);
      await writePushState({ ...state, subscriptions });
      return NextResponse.json({ success: true, devices: subscriptions.length });
    }

    if (body.action === 'test') {
      if (!pushConfigured()) return NextResponse.json({ error: 'NOT_CONFIGURED' }, { status: 503 });
      const result = await pushToAll(
        state,
        {
          title: 'Genesis Vault',
          body: 'Reminders are on. Sub-task deadlines will show up here.',
          tag: 'test',
          url: '/goals',
        },
        new URL(req.url).origin
      );
      if (result.changed) await writePushState(result.state);
      return NextResponse.json({ success: true, sent: result.sent, failed: result.failed });
    }

    return NextResponse.json({ error: 'BAD_REQUEST' }, { status: 400 });
  } catch (err) {
    console.error('Push request failed:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
