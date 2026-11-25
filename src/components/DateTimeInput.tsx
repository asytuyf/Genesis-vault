"use client";

// Date and time fields with a picker of their own, the same everywhere: the
// month laid out as a grid, and times as buttons. On a phone it rises from the
// bottom; on a computer it opens in the middle, Escape closes it and Enter
// keeps what is picked.
//
// DateTimeInput drops in where an <input type="date" | "time" |
// "datetime-local"> was: the value comes and goes in the same text form.
// TimeSlotInput picks a day and a from–until time in one go.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type SubSlot, makeSlot } from "@/lib/goals";

type Kind = "date" | "time" | "datetime-local";
type Accent = "emerald" | "cyan" | "yellow";

const ACCENT: Record<Accent, { on: string; ring: string; text: string; done: string; tab: string }> = {
  emerald: {
    on: "bg-emerald-500 text-black border-emerald-500",
    ring: "border-emerald-500/60",
    text: "text-emerald-400",
    done: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
    tab: "border-emerald-500/60 bg-emerald-500/10 text-emerald-300",
  },
  cyan: {
    on: "bg-cyan-400 text-black border-cyan-400",
    ring: "border-cyan-400/60",
    text: "text-cyan-400",
    done: "border-cyan-500/40 bg-cyan-500/10 text-cyan-400",
    tab: "border-cyan-400/60 bg-cyan-500/10 text-cyan-300",
  },
  yellow: {
    on: "bg-yellow-400 text-black border-yellow-400",
    ring: "border-yellow-400/60",
    text: "text-yellow-400",
    done: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400",
    tab: "border-yellow-400/60 bg-yellow-500/10 text-yellow-300",
  },
};
type Colours = (typeof ACCENT)[Accent];

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

const split = (kind: Kind, value: string): { day: string; time: string } => {
  if (kind === "date") return { day: value.slice(0, 10), time: "" };
  if (kind === "time") return { day: "", time: value.slice(0, 5) };
  const [day = "", time = ""] = value.split("T");
  return { day, time: time.slice(0, 5) };
};

/** "Thu 27 Nov", with the year when it is not this one (or always, for a plain date). */
const dayText = (day: string, withYear = false): string => {
  const d = new Date(`${day}T00:00:00`);
  if (Number.isNaN(d.getTime())) return day;
  const year = withYear || d.getFullYear() !== new Date().getFullYear();
  return d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}) });
};

/** What a closed field shows. */
function label(kind: Kind, value: string): string {
  const { day, time } = split(kind, value);
  if (kind === "time") return time;
  if (!day) return "";
  if (kind === "date") return dayText(day, true);
  return time ? `${dayText(day)}, ${time}` : dayText(day);
}

const slotText = (day: string, from: string, to: string): string =>
  day || from || to ? `${day ? dayText(day) : "Today"} · ${from || "--:--"}–${to || "--:--"}` : "";

/** The sheet's heading when the field has no label of its own. */
const HEADING: Record<Kind, string> = { date: "Day", time: "Time", "datetime-local": "Day and time" };
const PLACEHOLDER: Record<Kind, string> = { date: "Pick a day", time: "--:--", "datetime-local": "Pick a day and time" };

// --- the fields -------------------------------------------------------------

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
  const [open, setOpen] = useState(false);
  const shown = label(type, value);
  const start = split(type, value);

  return (
    <>
      <Trigger className={className} ariaLabel={ariaLabel} onOpen={() => setOpen(true)} placeholder={PLACEHOLDER[type]}>
        {shown}
      </Trigger>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <PickerBody
          kind={type}
          title={ariaLabel ?? HEADING[type]}
          start={{ day: start.day, from: start.time, to: "" }}
          required={required}
          colours={ACCENT[accent]}
          onDone={(r) => {
            setOpen(false);
            let next = "";
            if (type === "date") next = r.day;
            else if (type === "time") next = r.from;
            else if (r.day || r.from) next = `${r.day || isoDay(new Date())}T${r.from || DEFAULT_TIME}`;
            if (next !== value) onChange(next);
          }}
          onClear={() => {
            setOpen(false);
            if (value) onChange("");
          }}
          onClose={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}

interface TimeSlotInputProps {
  value?: SubSlot;
  /** The new slot, or null when it is cleared. */
  onChange: (slot: SubSlot | null) => void;
  className?: string;
  "aria-label"?: string;
  accent?: Accent;
}

/** A day and a from–until time, picked together. Empty until one is picked. */
export function TimeSlotInput({ value, onChange, className = "", "aria-label": ariaLabel, accent = "emerald" }: TimeSlotInputProps) {
  const [open, setOpen] = useState(false);
  const day = value?.start.slice(0, 10) ?? "";
  const from = value?.start.slice(11, 16) ?? "";
  const to = value?.end.slice(11, 16) ?? "";

  return (
    <>
      <Trigger className={className} ariaLabel={ariaLabel} onOpen={() => setOpen(true)} placeholder="No time slot">
        {value ? slotText(day, from, to) : ""}
      </Trigger>
      <Sheet open={open} onClose={() => setOpen(false)}>
        <PickerBody
          kind="slot"
          title={ariaLabel ?? "Time slot"}
          start={{ day, from, to }}
          required={false}
          colours={ACCENT[accent]}
          onDone={(r) => {
            setOpen(false);
            onChange(makeSlot(r.day || isoDay(new Date()), r.from, r.to));
          }}
          onClear={() => {
            setOpen(false);
            if (value) onChange(null);
          }}
          onClose={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}

function Trigger({
  className,
  ariaLabel,
  placeholder,
  onOpen,
  children,
}: {
  className: string;
  ariaLabel?: string;
  placeholder: string;
  onOpen: () => void;
  children: string;
}) {
  return (
    <button type="button" aria-label={ariaLabel} aria-haspopup="dialog" onClick={onOpen} className={`${className} text-left truncate`}>
      {children || <span className="text-zinc-600">{placeholder}</span>}
    </button>
  );
}

/** The window the picker opens in: a sheet from the bottom on a phone, centred on a computer. */
function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          data-sheet
          data-picker
          className="fixed inset-0 z-[900] flex items-end md:items-center justify-center md:p-4 font-mono"
        >
          <div className="absolute inset-0 bg-black/80" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="pwa-sheet pwa-sheet-bottom relative w-full max-w-md max-h-[92dvh] overflow-y-auto bg-[#0a0a0a] border border-zinc-800 p-4"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// --- inside the window --------------------------------------------------------

type Result = { day: string; from: string; to: string };

function PickerBody({
  kind,
  title,
  start,
  required,
  colours,
  onDone,
  onClear,
  onClose,
}: {
  kind: Kind | "slot";
  title: string;
  start: Result;
  required: boolean;
  colours: Colours;
  onDone: (result: Result) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  const today = isoDay(new Date());
  const [day, setDay] = useState(start.day);
  const [from, setFrom] = useState(start.from);
  const [to, setTo] = useState(start.to);
  // In a slot, which of the two times the buttons set.
  const [editing, setEditing] = useState<"from" | "to">("from");

  const withDate = kind !== "time";
  const withTime = kind !== "date";
  const slot = kind === "slot";

  const summary = slot ? slotText(day, from, to) : label(kind, kind === "date" ? day : kind === "time" ? from : day || from ? `${day || today}T${from || DEFAULT_TIME}` : "");
  // A slot needs both ends, and they cannot be the same time.
  const problem = slot && (from || to) ? (!from ? "Pick when it starts." : !to ? "Pick when it ends." : from === to ? "It has to end after it starts." : "") : "";
  const canFinish = slot ? !!from && !!to && from !== to : !(required && !day && !from);

  const finish = () => {
    if (canFinish) onDone({ day, from, to });
  };

  // Escape closes, Enter keeps what is picked. Caught first and kept from
  // the page, so the window behind and its shortcuts are left alone.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") return;
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (canFinish) onDone({ day, from, to });
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [canFinish, day, from, to, onClose, onDone]);

  const setTime = (t: string) => {
    if (!slot || editing === "from") setFrom(t);
    else setTo(t);
  };
  const current = !slot || editing === "from" ? from : to;

  return (
    <div className="space-y-4" role="dialog" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{title}</span>
        <span className={`text-sm font-black text-right ${colours.text}`}>{summary || "Nothing picked"}</span>
      </div>

      {withDate && <Calendar day={day} today={today} colours={colours} onPick={setDay} />}

      {withTime && (
        <div>
          {slot && (
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(["from", "to"] as const).map((end) => (
                <button
                  key={end}
                  type="button"
                  onClick={() => setEditing(end)}
                  aria-pressed={editing === end}
                  className={`py-2 border text-left px-3 transition-colors ${editing === end ? colours.tab : "border-zinc-800 text-zinc-500"}`}
                >
                  <span className="block text-[9px] font-black uppercase tracking-wider opacity-80">{end === "from" ? "From" : "Until"}</span>
                  <span className="block text-base font-black">{(end === "from" ? from : to) || "--:--"}</span>
                </button>
              ))}
            </div>
          )}
          <TimeButtons
            value={current}
            colours={colours}
            onPick={setTime}
            // Starting time done: the next taps set the end.
            onMinute={() => slot && editing === "from" && setEditing("to")}
          />
        </div>
      )}

      {problem && <p className="text-[11px] text-yellow-500/80">{problem}</p>}

      <div className="flex gap-2 pt-1">
        {!required && (
          <button type="button" onClick={onClear} className="px-4 py-2.5 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-700">
            Clear
          </button>
        )}
        <button type="button" onClick={onClose} className="px-4 py-2.5 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-700">
          Cancel
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={!canFinish}
          className={`flex-1 py-2.5 border text-xs font-black uppercase tracking-wider disabled:opacity-40 ${colours.done}`}
        >
          Done
        </button>
      </div>
    </div>
  );
}

const off = "border-zinc-900 text-zinc-400 hover:border-zinc-700 active:bg-zinc-800";

function Calendar({ day, today, colours, onPick }: { day: string; today: string; colours: Colours; onPick: (day: string) => void }) {
  // The month on show: the picked day's, or this one.
  const [month, setMonth] = useState(() => {
    const d = new Date(`${day || today}T00:00:00`);
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const first = new Date(month.y, month.m, 1);
  const lead = (first.getDay() + 6) % 7; // Monday first
  const cells = Array.from({ length: 42 }, (_, i) => new Date(month.y, month.m, i - lead + 1));
  // Drop a last row that is all next month.
  const rows = cells.slice(35).every((d) => d.getMonth() !== month.m) ? cells.slice(0, 35) : cells;
  const shift = (by: number) => {
    const d = new Date(month.y, month.m + by, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button type="button" onClick={() => shift(-1)} aria-label="Previous month" className="h-9 w-9 grid place-items-center border border-zinc-800 text-zinc-400 hover:border-zinc-700">
          <ChevronLeft size={16} />
        </button>
        <span className="flex-1 text-center text-sm font-black uppercase tracking-wider text-zinc-200">
          {first.toLocaleDateString([], { month: "long", year: "numeric" })}
        </span>
        <button type="button" onClick={() => shift(1)} aria-label="Next month" className="h-9 w-9 grid place-items-center border border-zinc-800 text-zinc-400 hover:border-zinc-700">
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
                onPick(iso);
                if (!inMonth) setMonth({ y: d.getFullYear(), m: d.getMonth() });
              }}
              aria-label={d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}
              aria-pressed={picked}
              className={`h-10 border text-sm font-bold transition-colors ${
                picked ? colours.on : iso === today ? `${colours.ring} text-zinc-100` : off
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
          onPick(today);
          const d = new Date();
          setMonth({ y: d.getFullYear(), m: d.getMonth() });
        }}
        className="mt-2 text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
      >
        Today
      </button>
    </div>
  );
}

function TimeButtons({
  value,
  colours,
  onPick,
  onMinute,
}: {
  value: string;
  colours: Colours;
  onPick: (time: string) => void;
  onMinute: () => void;
}) {
  const [hour, minute] = value ? value.split(":").map(Number) : [NaN, NaN];
  const chip = "h-9 border text-xs font-bold transition-colors";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Hour</span>
        <button type="button" onClick={() => onPick(nowTime())} className="text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-zinc-300">
          Now
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1">
        {HOURS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => onPick(`${pad(h)}:${pad(Number.isNaN(minute) ? 0 : minute)}`)}
            aria-pressed={h === hour}
            className={`${chip} ${h === hour ? colours.on : off}`}
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
            onClick={() => {
              onPick(`${pad(Number.isNaN(hour) ? 12 : hour)}:${pad(mm)}`);
              onMinute();
            }}
            aria-pressed={mm === minute}
            className={`${chip} ${mm === minute ? colours.on : off}`}
          >
            :{pad(mm)}
          </button>
        ))}
      </div>
    </div>
  );
}
