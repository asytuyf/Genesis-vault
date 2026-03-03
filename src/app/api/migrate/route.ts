import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// One-time migration - pass your data directly
export async function POST(req: Request) {
  try {
    const { password, goals, habits, library, settings } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const results: Record<string, string> = {};

    if (goals && Array.isArray(goals)) {
      await redis.set('goals', goals);
      results.goals = `Migrated ${goals.length} goals`;
    }

    if (habits && Array.isArray(habits)) {
      await redis.set('habits', habits);
      results.habits = `Migrated ${habits.length} habits`;
    }

    if (library && Array.isArray(library)) {
      await redis.set('library', library);
      results.library = `Migrated ${library.length} tutorials`;
    }

    if (settings && typeof settings === 'object') {
      await redis.set('settings', settings);
      results.settings = `Migrated settings`;
    }

    return NextResponse.json({ success: true, results });
  } catch (err) {
    console.error("Migration error:", err);
    return NextResponse.json({ error: "FAILED", details: String(err) }, { status: 500 });
  }
}
