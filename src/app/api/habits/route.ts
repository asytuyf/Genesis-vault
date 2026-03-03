import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const HABITS_KEY = 'habits';

export async function GET() {
  try {
    const habits = await redis.get(HABITS_KEY);
    return NextResponse.json(habits || []);
  } catch (err) {
    console.error("Failed to fetch habits:", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { password, updatedHabits } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    await redis.set(HABITS_KEY, updatedHabits);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to save habits:", err);
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
