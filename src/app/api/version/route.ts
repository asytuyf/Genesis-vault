import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Which build the server is running, so an open app can tell it is out of date. */
export function GET() {
  return NextResponse.json(
    { build: process.env.NEXT_PUBLIC_BUILD_ID ?? "" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
