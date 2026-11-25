"use client";

// A date and/or time field. With a mouse it is the browser's own field, which
// on a computer already opens a good calendar. On a touch screen it opens a
// calendar of its own instead of the phone's scrolling wheels: the month laid
// out as a grid, and the time as buttons, like the desktop picker. The value
// comes and goes in the same text form the browser field uses, so it drops in
// where an <input type="date" | "time" | "datetime-local"> was.

import { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Kind = "date" | "time" | "datetime-local";
type Accent = "emerald" | "cyan" | "yellow";

const ACCENT: Record<Accent, { on: string; ring: string; text: string; done: string }> = {
  emerald: {
    on: "bg-emerald-500 text-black border-emerald-500",
    ring: "border-emerald-500/60",
    text: "text-emerald-400",
    done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  },
  cyan: {
    on: "bg-cyan-400 text-black border-cyan-400",
    ring: "border-cyan-400/60",
    text: "text-cyan-400",
    done: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
  },
  yellow: {
    on: "bg-yellow-400 text-black border-yellow-400",
    ring: "border-yellow-400/60",
    text: "text-yellow-400",
    done: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
  },
};

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
/** A day picked without a time gets this one. */
const DEFAULT_TIME = "12:00";

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const nowTime = () => {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** A phone or tablet: no mouse to point with. */
function useTouchScreen(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia("(pointer: coarse)");
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia("(pointer: coarse)").matches,
    () => false
  );
}

const split = (kind: Kind, value: string): { day: string; time: string } => {
  if (kind === "date") return { day: value.slice(0, 10), time: "" };
  if (kind === "time") return { day: "", time: value.slice(0, 5) };
  const [day = "", time = ""] = value.split("T");
  return { day, time: time.slice(0, 5) };
};

/** What the closed field shows. */
function label(kind: Kind, value: string): string {
  const { day, time } = split(kind, value);
  if (kind === "time") return time;
  if (!day) return "";
  const d = new Date(`${day}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  const thisYear = d.getFullYear() === new Date().getFullYear();
  const date = d.toLocaleDateString([], {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(thisYear && kind !== "date" ? {} : { year: "numeric" }),
  });
  return kind === "date" ? date : time ? `${date}, ${time}` : date;
}

/** The sheet's heading when the field has no label of its own. */
const HEADING: Record<Kind, string> = { date: "Day", time: "Time", "datetime-local": "Day and time" };

const PLACEHOLDER: Record<Kind, string> = {
  date: "Pick a day",
  time: "--:--",
  "datetime-local": "Pick a day and time",
};

interface DateTimeInputProps {
  type: Kind;
  value: string;
  onChange: (value: string) => void;
  /** Classes for the field: the same ones the browser field had. */
  className?: string;
  "aria-label"?: string;
  /** No way to empty it, for a field that must always hold a value. */
  required?: boolean;
  accent?: Accent;
}

export function DateTimeInput({
  type,
  value,
  onChange,
  className = "",
  "aria-label": ariaLabel,
  required = false,
  accent = "emerald",
}: DateTimeInputProps) {
  const touch = useTouchScreen();
  const [open, setOpen] = useState(false);

  if (!touch) {
    return (
      <input
        type={type}
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => {
          if (required && !e.target.value) return;
          onChange(e.target.value);
        }}
        className={className}
      />
    );
  }

  const shown = label(type, value);
  return (
    <>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`${className} text-left truncate`}
      >
        {shown || <span className="text-zinc-600">{PLACEHOLDER[type]}</span>}
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <PickerSheet
                kind={type}
                value={value}
                title={ariaLabel}
                required={required}
                accent={ACCENT[accent]}
                onDone={(next) => {
                  setOpen(false);
                  if (next !== value) onChange(next);
                }}
                onClose={() => setOpen(false)}
              />
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}

function PickerSheet({
  kind,
  value,
  title,
  required,
  accent,
  onDone,
  onClose,
}: {
  kind: Kind;
  value: string;
  title?: string;
  required: boolean;
  accent: (typeof ACCENT)[Accent];
  onDone: (value: string) => void;
  onClose: () => void;
}) {
  const start = split(kind, value);
  const today = isoDay(new Date());
  const [day, setDay] = useState(start.day);
  const [time, setTime] = useState(start.time);
  // The month on show: the picked day's, or this one.
  const [month, setMonth] = useState(() => {
    const d = new Date(`${start.day || today}T00:00:00`);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const withDate = kind !== "time";
  const withTime = kind !== "date";
  const [hour, minute] = time ? time.split(":").map(Number) : [NaN, NaN];

  const result = (): string => {
    if (kind === "date") return day;
    if (kind === "time") return time;
    if (!day && !time) return "";
    return `${day || today}T${time || DEFAULT_TIME}`;
  };

  const first = new Date(month.y, month.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const cells = Array.from({ length: 42 }, (_, i) => new Date(month.y, month.m, i - lead + 1));
  // Drop a last row that is all next month.
  const rows = cells.slice(35).every((d) => d.getMonth() !== month.m) ? cells.slice(0, 35) : cells;
  const shift = (by: number) => setMonth(({ y, m }) => ({ y: m + by < 0 ? y - 1 : m + by > 11 ? y + 1 : y, m: (m + by + 12) % 12 }));

  const cell = "h-10 border text-sm font-bold transition-colors";
  const chip = "h-9 border text-xs font-bold transition-colors";
  const off = "border-zinc-900 text-zinc-400 active:bg-zinc-800";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-sheet
      className="fixed inset-0 z-[900] flex items-end justify-center font-mono"
      role="dialog"
      aria-label={title ?? HEADING[kind]}
    >
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        className="pwa-sheet pwa-sheet-bottom relative w-full max-w-md max-h-[92dvh] overflow-y-auto bg-[#0a0a0a] border border-zinc-800 p-4 space-y-4"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{title ?? HEADING[kind]}</span>
          <span className={`text-sm font-black ${accent.text}`}>{label(kind, result()) || "Nothing picked"}</span>
        </div>

        {withDate && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="h-9 w-9 grid place-items-center border border-zinc-800 text-zinc-400">
                <ChevronLeft size={16} />
              </button>
              <span className="flex-1 text-center text-sm font-black uppercase tracking-wider text-zinc-200">
                {first.toLocaleDateString([], { month: "long", year: "numeric" })}
              </span>
              <button type="button" onClick={() => shift(1)} aria-label="Next month" className="h-9 w-9 grid place-items-center border border-zinc-800 text-zinc-400">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((w) => (
                <span key={w} className="text-center text-[10px] font-black uppercase text-zinc-600">
                  {w}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {rows.map((d) => {
                const iso = isoDay(d);
                const inMonth = d.getMonth() === month.m;
                const picked = iso === day;
                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => {
                      setDay(iso);
                      if (!inMonth) setMonth({ y: d.getFullYear(), m: d.getMonth() });
                    }}
                    aria-label={d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
                    aria-pressed={picked}
                    className={`${cell} ${
                      picked ? accent.on : iso === today ? `${accent.ring} text-zinc-100` : off
                    } ${inMonth || picked ? "" : "opacity-35"}`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                setDay(today);
                const d = new Date();
                setMonth({ y: d.getFullYear(), m: d.getMonth() });
              }}
              className="mt-2 text-[10px] font-black uppercase tracking-wider text-zinc-500"
            >
              Today
            </button>
          </div>
        )}

        {withTime && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Hour</span>
              <button type="button" onClick={() => setTime(nowTime())} className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                Now
              </button>
            </div>
            <div className="grid grid-cols-8 gap-1">
              {HOURS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setTime(`${pad(h)}:${pad(Number.isNaN(minute) ? 0 : minute)}`)}
                  aria-pressed={h === hour}
                  className={`${chip} ${h === hour ? accent.on : off}`}
                >
                  {pad(h)}
                </button>
              ))}
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mt-3 mb-2">Minute</div>
            <div className="grid grid-cols-6 gap-1">
              {MINUTES.map((mm) => (
                <button
                  key={mm}
                  type="button"
                  onClick={() => setTime(`${pad(Number.isNaN(hour) ? 12 : hour)}:${pad(mm)}`)}
                  aria-pressed={mm === minute}
                  className={`${chip} ${mm === minute ? accent.on : off}`}
                >
                  :{pad(mm)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          {!required && (
            <button
              type="button"
              onClick={() => onDone("")}
              className="px-4 py-2.5 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              const next = result();
              if (required && !next) return;
              onDone(next);
            }}
            className={`flex-1 py-2.5 border text-xs font-black uppercase tracking-wider ${accent.done}`}
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
