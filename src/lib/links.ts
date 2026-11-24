// Links pinned to the tracker: the pages worth checking rather than copying
// numbers out of by hand.
//
// Same operation model as goals and habits, so a link added on a phone cannot
// wipe one added on the laptop.

export interface TrackerLink {
  id: string;
  title: string;
  url: string;
  /** Optional line under the title. */
  note?: string;
}

export type LinkOp =
  | { type: "add"; link: TrackerLink }
  | { type: "remove"; id: string }
  | { type: "update"; id: string; set: { title?: string; url?: string; note?: string } }
  | { type: "order"; ids: string[] };

const isStr = (v: unknown): v is string => typeof v === "string";

/** Only ordinary web links, so a stored link can never run script. */
export function safeUrl(raw: unknown): string | null {
  if (!isStr(raw)) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/** "arena.ai" out of "https://arena.ai/leaderboard/code". */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function isLinkOp(op: unknown): op is LinkOp {
  if (!op || typeof op !== "object") return false;
  const o = op as Record<string, unknown>;
  switch (o.type) {
    case "add": {
      const link = o.link as TrackerLink | undefined;
      return !!link && typeof link === "object" && isStr(link.id) && !!safeUrl(link.url);
    }
    case "remove":
      return isStr(o.id);
    case "update":
      return isStr(o.id) && !!o.set && typeof o.set === "object";
    case "order":
      return Array.isArray(o.ids) && o.ids.every(isStr);
    default:
      return false;
  }
}

function sanitize(link: TrackerLink): TrackerLink | null {
  const url = safeUrl(link.url);
  if (!url) return null;
  const title = String(link.title ?? "").trim().slice(0, 60) || hostOf(url);
  const note = String(link.note ?? "").trim().slice(0, 80);
  return { id: link.id, title, url, ...(note ? { note } : {}) };
}

export function applyLinkOps(list: TrackerLink[], ops: LinkOp[]): TrackerLink[] {
  let next = Array.isArray(list) ? [...list] : [];

  for (const op of ops) {
    if (!isLinkOp(op)) continue;

    if (op.type === "add") {
      const clean = sanitize(op.link);
      if (!clean) continue;
      const i = next.findIndex((l) => l.id === clean.id);
      if (i === -1) next.push(clean);
      else next[i] = clean;
      continue;
    }

    if (op.type === "remove") {
      next = next.filter((l) => l.id !== op.id);
      continue;
    }

    if (op.type === "order") {
      const byId = new Map(next.map((l) => [l.id, l]));
      const seen = new Set<string>();
      const ordered: TrackerLink[] = [];
      for (const id of op.ids) {
        const l = byId.get(id);
        if (l && !seen.has(id)) {
          ordered.push(l);
          seen.add(id);
        }
      }
      next = [...ordered, ...next.filter((l) => !seen.has(l.id))];
      continue;
    }

    const i = next.findIndex((l) => l.id === op.id);
    if (i === -1) continue;

    const merged = sanitize({
      ...next[i],
      ...(isStr(op.set.title) ? { title: op.set.title } : {}),
      ...(isStr(op.set.url) ? { url: op.set.url } : {}),
      ...(isStr(op.set.note) ? { note: op.set.note } : {}),
    });
    if (merged) next[i] = merged;
  }

  return next;
}

export const DEFAULT_LINKS: TrackerLink[] = [
  { id: "seed-arena", title: "Arena", url: "https://arena.ai/leaderboard/agent/code", note: "Coding agent rankings" },
  { id: "seed-tutorbench", title: "TutorBench", url: "https://labs.scale.com/leaderboard/tutorbench", note: "Best AI for studying · tutor rankings" },
  { id: "seed-github", title: "GitHub", url: "https://github.com/asytuyf", note: "Your profile and activity" },
  { id: "seed-yes-trips", title: "Yes Trips", url: "https://yes-trips.com/", note: "Student trips · ESN" },
];

/**
 * Changes to links already stored, each run once and remembered by its id, so
 * a link removed afterwards stays removed instead of coming back.
 */
export const LINK_UPGRADES: { id: string; run: (list: TrackerLink[]) => TrackerLink[] }[] = [
  {
    // Arena moved its coding board under /leaderboard/agent/code.
    id: "2026-11-arena-agent-code",
    run: (list) =>
      list.map((l) =>
        hostOf(l.url) === "arena.ai" && new URL(l.url).pathname.replace(/\/$/, "") === "/leaderboard/code"
          ? { ...l, url: "https://arena.ai/leaderboard/agent/code", note: l.note === "Coding model rankings" ? "Coding agent rankings" : l.note }
          : l
      ),
  },
  {
    id: "2026-11-yes-trips",
    run: (list) =>
      list.some((l) => hostOf(l.url) === "yes-trips.com")
        ? list
        : [...list, DEFAULT_LINKS.find((l) => l.id === "seed-yes-trips")!],
  },
  {
    // Scale's TutorBench ranks AI models on how well they tutor: Arena, for studying.
    id: "2026-11-tutorbench",
    run: (list) => {
      if (list.some((l) => l.url.includes("/leaderboard/tutorbench"))) return list;
      const link = DEFAULT_LINKS.find((l) => l.id === "seed-tutorbench")!;
      const arena = list.findIndex((l) => hostOf(l.url) === "arena.ai");
      return arena === -1 ? [...list, link] : [...list.slice(0, arena + 1), link, ...list.slice(arena + 1)];
    },
  },
];

/** Run the upgrades not yet applied. Returns the list and every upgrade id now applied. */
export function upgradeLinks(list: TrackerLink[], applied: string[]): { links: TrackerLink[]; applied: string[] } {
  let links = list;
  const done = new Set(applied);
  for (const u of LINK_UPGRADES) {
    if (done.has(u.id)) continue;
    links = u.run(links);
    done.add(u.id);
  }
  return { links, applied: [...done] };
}
