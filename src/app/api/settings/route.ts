import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const SETTINGS_KEY = 'settings';

interface Settings {
  focusQuickLinks?: { name: string; url: string }[];
  focusYoutubeUrl?: string;
  focusWorkDuration?: number;
  focusBreakDuration?: number;
}

export async function GET() {
  try {
    const settings = await redis.get<Settings>(SETTINGS_KEY);
    return NextResponse.json(settings || {});
  } catch (err) {
    console.error("Failed to fetch settings:", err);
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { password, settings } = await req.json();

    if (password !== "genesis2026") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Merge with existing settings
    const existing = await redis.get<Settings>(SETTINGS_KEY) || {};
    const updated = { ...existing, ...settings };

    await redis.set(SETTINGS_KEY, updated);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to save settings:", err);
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
