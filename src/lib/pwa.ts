import type { Metadata } from "next";

// Every page can be added to the home screen as its own app: its own name,
// its own icon, and it opens on that page. Each page links its own manifest
// (served by /app-manifest/[app]) and its own apple-icon.png next to it.
// All of them share the site's scope, so moving to another page from the
// menu stays inside the app instead of jumping out to the browser.

export interface PwaApp {
  /** Name under the icon on the home screen: the page's own name, cut to
   * what fits there (about ten characters before the iPhone shortens it). */
  short: string;
  /** The page's full name, for the install prompt on Android and desktop. */
  full: string;
  /** The page it opens on. */
  path: string;
  description: string;
  /** Icons in /public; absent means the site's own wings icon. */
  icons?: string;
}

export const PWA_APPS = {
  home: { short: "GENESIS", full: "Genesis Vault", path: "/", description: "Goals, study timer, habits and library in one place." },
  goals: { short: "TASK_FORGE", full: "Task Forge", path: "/goals", description: "Goals and their to-dos.", icons: "goals" },
  study: { short: "FOCUS_LAB", full: "Focus Lab", path: "/study", description: "Study timer and deadlines.", icons: "study" },
  library: { short: "KNOWLEDGE", full: "Knowledge Vault", path: "/library", description: "Reading library.", icons: "library" },
  spend: { short: "SPEND_CTRL", full: "Spend Control", path: "/spend", description: "Subscriptions, bills and what they cost.", icons: "spend" },
  streaks: { short: "TRACKER", full: "Gemini Tracker", path: "/streaks", description: "Habits and streaks.", icons: "streaks" },
  archive: { short: "ARCHIVE", full: "Command Archive", path: "/archive", description: "Archived projects.", icons: "archive" },
} satisfies Record<string, PwaApp>;

export type PwaKey = keyof typeof PWA_APPS;

/** The metadata a page needs to install as its own app. */
export const pwaMetadata = (key: PwaKey): Pick<Metadata, "manifest" | "appleWebApp"> => ({
  manifest: `/app-manifest/${key}`,
  appleWebApp: {
    capable: true,
    title: PWA_APPS[key].short,
    statusBarStyle: "black",
  },
});
