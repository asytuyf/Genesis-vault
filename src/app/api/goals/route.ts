import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const GOALS_KEY = 'goals';

export async function GET() {
  try {
    const goals = await redis.get(GOALS_KEY);
    return NextResponse.json(goals || []);
  } catch (err) {
    console.error("Failed to fetch goals:", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { password, updatedGoals } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    await redis.set(GOALS_KEY, updatedGoals);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to save goals:", err);
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
