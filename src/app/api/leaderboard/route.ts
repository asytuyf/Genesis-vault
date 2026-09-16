import { NextResponse } from 'next/server';
import { readKey, writeKey, checkPassword } from '@/lib/kv';

export const dynamic = 'force-dynamic';

/**
 * The coding-model board shown on the tracker.
 *
 * It cannot be fetched live: arena.ai refuses requests that are not a browser,
 * and the public mirror of the arena data stopped being updated. So the board
 * lives here instead of inside the page, which means it can be edited from the
 * site in a few seconds rather than needing a code change and a deploy, and it
 * carries the date it was last touched so it never pretends to be live.
 */

const KEY = 'code_leaderboard';

export interface LLMModel {
  rank: number;
  name: string;
  score: number;
  org: string;
}

interface Board {
  models: LLMModel[];
  updatedAt: string;
}

const SEED: Board = {
  models: [
    { rank: 1, name: 'Claude Opus 4.6 Thinking', score: 1567, org: 'Anthropic' },
    { rank: 2, name: 'Claude Opus 4.6', score: 1560, org: 'Anthropic' },
    { rank: 3, name: 'Claude Opus 4.5 Thinking', score: 1503, org: 'Anthropic' },
    { rank: 4, name: 'GPT-5.2 High', score: 1473, org: 'OpenAI' },
    { rank: 5, name: 'Claude Opus 4.5', score: 1469, org: 'Anthropic' },
    { rank: 6, name: 'GLM-5', score: 1449, org: 'Zhipu' },
    { rank: 7, name: 'Gemini 3 Pro', score: 1449, org: 'Google' },
    { rank: 8, name: 'Kimi K2.5 Thinking', score: 1447, org: 'Moonshot' },
    { rank: 9, name: 'Gemini 3 Flash', score: 1444, org: 'Google' },
    { rank: 10, name: 'GLM-4.7', score: 1442, org: 'Zhipu' },
  ],
  updatedAt: '2026-02-21',
};

const clean = (models: unknown): LLMModel[] =>
  (Array.isArray(models) ? models : [])
    .filter((m): m is Record<string, unknown> => !!m && typeof m === 'object')
    .map((m, i) => ({
      rank: i + 1,
      name: String(m.name ?? '').trim().slice(0, 80),
      org: String(m.org ?? '').trim().slice(0, 40),
      score: Number.isFinite(Number(m.score)) ? Math.round(Number(m.score)) : 0,
    }))
    .filter((m) => m.name.length > 0)
    .slice(0, 20);

export async function GET() {
  try {
    const stored = await readKey<Board>(KEY);
    const board = stored && Array.isArray(stored.models) && stored.models.length ? stored : SEED;
    return NextResponse.json(board, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    console.error('Failed to read the leaderboard:', err);
    return NextResponse.json(SEED, { headers: { 'Cache-Control': 'no-store' } });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!checkPassword(body?.password)) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const models = clean(body?.models);
    if (models.length === 0) {
      return NextResponse.json({ error: 'NO_MODELS' }, { status: 400 });
    }

    const board: Board = { models, updatedAt: new Date().toISOString().slice(0, 10) };
    await writeKey(KEY, board);
    return NextResponse.json({ success: true, ...board });
  } catch (err) {
    console.error('Failed to save the leaderboard:', err);
    return NextResponse.json({ error: 'FAILED' }, { status: 500 });
  }
}
