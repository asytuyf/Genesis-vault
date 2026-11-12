import { NextResponse } from "next/server";
import { PWA_APPS, type PwaApp } from "@/lib/pwa";

/** The web app manifest for one page: Android and desktop read it to install that page. */
export async function GET(_req: Request, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;
  const entry: PwaApp | undefined = (PWA_APPS as Record<string, PwaApp>)[app];
  if (!entry) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const icons = entry.icons
    ? [
        { src: `/pwa/${entry.icons}-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: `/pwa/${entry.icons}-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: `/pwa/${entry.icons}-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ]
    : [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];

  return NextResponse.json(
    {
      // The id tells one installed page apart from another.
      id: entry.path,
      name: entry.full,
      short_name: entry.short,
      description: entry.description,
      start_url: entry.path,
      scope: "/",
      display: "standalone",
      orientation: "portrait",
      background_color: "#0d0d0d",
      theme_color: "#0d0d0d",
      icons,
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } }
  );
}
