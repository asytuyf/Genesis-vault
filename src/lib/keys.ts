// Keyboard shortcuts. Two kinds: ⌘+Enter (Ctrl+Enter off a Mac) saves what is
// being typed, and single keys act on the page. A single key is only taken
// while nothing is being typed, so a shortcut never eats a letter.

/** ⌘+Enter on a Mac, Ctrl+Enter elsewhere. */
export const isSaveCombo = (e: { key: string; metaKey: boolean; ctrlKey: boolean }): boolean =>
  e.key === "Enter" && (e.metaKey || e.ctrlKey);

/** A bare key the page may take as a shortcut: no ⌘, Ctrl or Alt held, and no field being typed in. */
export const isPageKey = (e: KeyboardEvent): boolean => {
  if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing || e.defaultPrevented) return false;
  const el = e.target instanceof Element ? e.target : null;
  return !el?.closest("input, textarea, select, [contenteditable]");
};
