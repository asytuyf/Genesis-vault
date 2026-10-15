"use client";
import { useLayoutEffect, useRef } from "react";

// A one-line text box that wraps and grows as you type, so a long to-do stays
// readable while you write it. Enter saves (as a single-line field would);
// Shift+Enter is ignored, since a to-do is one line of text that wraps. After
// a few lines it scrolls instead of pushing the window around.

interface AutoGrowTextProps {
  value: string;
  onChange: (value: string) => void;
  /** Enter, or the keyboard's Done key. */
  onSubmit: () => void;
  onCancel?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Grow up to this many lines, then scroll. */
  maxLines?: number;
  enterKeyHint?: "done" | "enter" | "send" | "go";
  className?: string;
  "aria-label"?: string;
}

export const AutoGrowText = ({
  value, onChange, onSubmit, onCancel, onBlur, placeholder, autoFocus, maxLines = 6,
  enterKeyHint = "done", className = "", ...rest
}: AutoGrowTextProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Fit the height to the text on every change.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const css = getComputedStyle(el);
    const line = parseFloat(css.lineHeight) || 20;
    const border = el.offsetHeight - el.clientHeight;
    // scrollHeight already counts the padding, not the border.
    const needed = el.scrollHeight + border;
    const max = line * maxLines + parseFloat(css.paddingTop) + parseFloat(css.paddingBottom) + border;
    el.style.height = `${Math.min(needed, max)}px`;
    el.style.overflowY = needed > max ? "auto" : "hidden";
  }, [value, maxLines]);

  // Editing starts with the caret at the end, not the start.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!autoFocus || !el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      placeholder={placeholder}
      enterKeyHint={enterKeyHint}
      aria-label={rest["aria-label"]}
      // Pasted line breaks become spaces: the text is one line that wraps.
      onChange={(e) => onChange(e.target.value.replace(/\r?\n/g, " "))}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.nativeEvent.isComposing) {
          e.preventDefault();
          onSubmit();
        }
        if (e.key === "Escape") onCancel?.();
      }}
      onBlur={onBlur}
      className={`block resize-none leading-snug ${className}`}
    />
  );
};
