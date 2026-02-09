import { NextResponse } from 'next/server';

const REPO_OWNER = 'Asytuyf';
const REPO_NAME = 'nixos-config';
const FILE_PATH = 'public/goals.json';

export async function POST(req: Request) {
  try {
    const { password, updatedGoals } = await req.json();

    if (password !== "genesis2026") { // <-- SET YOUR GOALS PASSWORD
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const token = process.env.GITHUB_TOKEN;
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FILE_PATH}`;

    const getRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const fileData = await getRes.json();

    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "admin: update goals via web panel",
        content: btoa(JSON.stringify(updatedGoals, null, 2)),
        sha: fileData.sha
      })
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}