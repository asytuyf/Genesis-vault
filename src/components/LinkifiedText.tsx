// Plain text with its web addresses made clickable. Everything else, line
// breaks and "-" lists included, is shown exactly as typed.

import { Fragment } from "react";
import { cleanLink } from "@/lib/goals";

// "https://…", "http://…" and "www.…", up to the next space.
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"]+/gi;

/** Punctuation that ends a sentence, not the address: "see example.com." */
function trimTrailing(raw: string): string {
  let text = raw;
  for (;;) {
    const last = text.slice(-1);
    if (".,;:!?'\"]}>".includes(last)) text = text.slice(0, -1);
    // A closing bracket belongs to the address only when it opened one: wikipedia.org/wiki/X_(y).
    else if (last === ")" && (text.match(/\(/g)?.length ?? 0) < (text.match(/\)/g)?.length ?? 0)) text = text.slice(0, -1);
    else return text;
  }
}

export function LinkifiedText({ text, linkClassName }: { text: string; linkClassName?: string }) {
  const parts: React.ReactNode[] = [];
  let at = 0;
  for (const match of text.matchAll(URL_RE)) {
    const shown = trimTrailing(match[0]);
    const href = cleanLink(shown);
    const start = match.index ?? 0;
    if (!href) continue;
    if (start > at) parts.push(text.slice(at, start));
    parts.push(
      <a
        key={start}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        // The text around it may open an editor on tap; the link only opens the link.
        onClick={(e) => e.stopPropagation()}
        className={
          linkClassName ??
          "text-emerald-400 underline decoration-emerald-400/40 underline-offset-2 hover:decoration-emerald-400 wrap-anywhere"
        }
      >
        {shown}
      </a>
    );
    at = start + shown.length;
  }
  if (at < text.length) parts.push(text.slice(at));
  return <Fragment>{parts}</Fragment>;
}
