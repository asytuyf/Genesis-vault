// Tips kept on the tracker: things worth remembering that have no schedule to
// track, like how long creatine keeps once it is mixed.
//
// Same operation model as habits and links, so a tip added on the phone cannot
// wipe one edited on the laptop.

export interface TrackerTip {
  id: string;
  /** The question or the thing to remember, in a line. */
  title: string;
  /** The answer or the details. Line breaks kept, web addresses made clickable. */
  body: string;
  /** Optional short group, e.g. "Gym" or "Uni", to filter by. */
  tag?: string;
}

export type TipOp =
  | { type: "add"; tip: TrackerTip }
  | { type: "remove"; id: string }
  | { type: "update"; id: string; set: { title?: string; body?: string; tag?: string } }
  | { type: "order"; ids: string[] };

const isStr = (v: unknown): v is string => typeof v === "string";

export function isTipOp(op: unknown): op is TipOp {
  if (!op || typeof op !== "object") return false;
  const o = op as Record<string, unknown>;
  switch (o.type) {
    case "add": {
      const tip = o.tip as TrackerTip | undefined;
      return !!tip && typeof tip === "object" && isStr(tip.id) && isStr(tip.title) && !!tip.title.trim();
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

function sanitize(tip: TrackerTip): TrackerTip | null {
  const title = String(tip.title ?? "").trim().slice(0, 140);
  if (!title) return null;
  const body = String(tip.body ?? "").trim().slice(0, 4000);
  const tag = String(tip.tag ?? "").trim().slice(0, 24);
  return { id: tip.id, title, body, ...(tag ? { tag } : {}) };
}

export function applyTipOps(list: TrackerTip[], ops: TipOp[]): TrackerTip[] {
  let next = Array.isArray(list) ? [...list] : [];

  for (const op of ops) {
    if (!isTipOp(op)) continue;

    if (op.type === "add") {
      const clean = sanitize(op.tip);
      if (!clean) continue;
      const i = next.findIndex((t) => t.id === clean.id);
      // Newest first: a fresh tip goes on top.
      if (i === -1) next.unshift(clean);
      else next[i] = clean;
      continue;
    }

    if (op.type === "remove") {
      next = next.filter((t) => t.id !== op.id);
      continue;
    }

    if (op.type === "order") {
      const byId = new Map(next.map((t) => [t.id, t]));
      const seen = new Set<string>();
      const ordered: TrackerTip[] = [];
      for (const id of op.ids) {
        const t = byId.get(id);
        if (t && !seen.has(id)) {
          ordered.push(t);
          seen.add(id);
        }
      }
      next = [...ordered, ...next.filter((t) => !seen.has(t.id))];
      continue;
    }

    const i = next.findIndex((t) => t.id === op.id);
    if (i === -1) continue;
    const merged = sanitize({
      ...next[i],
      ...(isStr(op.set.title) ? { title: op.set.title } : {}),
      ...(isStr(op.set.body) ? { body: op.set.body } : {}),
      ...(isStr(op.set.tag) ? { tag: op.set.tag } : {}),
    });
    if (merged) next[i] = merged;
  }

  return next;
}
