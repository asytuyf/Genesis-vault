import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { password, updatedSnippets } = await req.json();

    // 1. YOUR ADMIN PASSWORD
    if (password !== "vault2026") { // <--- CHANGE THIS TO YOUR PASSWORD
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const token = process.env.GITHUB_TOKEN;
    const url = `https://api.github.com/repos/Asytuyf/nixos-config/contents/public/snippets.json`;

    // 2. Get the "SHA" (GitHub needs this to verify the update)
    const getRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const fileData = await getRes.json();

    // 3. Push the new list (without the nuked card) to GitHub
    const putRes = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "admin: nuke snippet via web panel",
        content: btoa(JSON.stringify(updatedSnippets, null, 2)), // Convert to Base64
        sha: fileData.sha
      })
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "FAILED" }, { status: 500 });
  }
}