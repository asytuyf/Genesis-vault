import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const LIBRARY_KEY = 'library';

export async function GET() {
  try {
    const tutorials = await redis.get(LIBRARY_KEY);
    return NextResponse.json(tutorials || []);
  } catch (err) {
    console.error("Failed to fetch library:", err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { password, updatedTutorials } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    await redis.set(LIBRARY_KEY, updatedTutorials);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to save library:", err);
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}
