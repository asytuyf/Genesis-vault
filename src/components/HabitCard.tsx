"use client";
// One habit: its week Monday to Sunday, how far it is toward this week's
// target, its streak, and (unlocked) a panel to rename it, recolour it or
// change how often it is due.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Flame, Pencil, X, Trophy } from "lucide-react";
import {
  type Habit,
  doneInWeek,
  getBestStreak,
  getStreak,
  streakUnit,
  targetPerWeek,
} from "@/lib/habits";

export const HABIT_COLORS = [
  { value: "orange", hex: "#f97316" },
  { value: "amber", hex: "#f59e0b" },
  { value: "yellow", hex: "#eab308" },
  { value: "lime", hex: "#84cc16" },
  { value: "emerald", hex: "#10b981" },
  { value: "cyan", hex: "#06b6d4" },
  { value: "blue", hex: "#3b82f6" },
  { value: "purple", hex: "#a855f7" },
  { value: "pink", hex: "#ec4899" },
  { value: "red", hex: "#ef4444" },
];

export const colorHex = (value: string) => (HABIT_COLORS.find((c) => c.value === value) ?? HABIT_COLORS[0]).hex;

/** Targets offered when adding or editing a habit, most often first. */
export const TARGETS = [7, 6, 5, 4, 3, 2, 1];
export const targetLabel = (n: number) => (n === 7 ? "Daily" : `${n}× a week`);

export function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-2.5 flex-wrap">
      {HABIT_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          aria-label={c.value}
          style={{ backgroundColor: c.hex, boxShadow: value === c.value ? `0 0 0 2px #0d0d0d, 0 0 0 4px ${c.hex}` : undefined }}
          className={`w-7 h-7 md:w-8 md:h-8 rounded-full transition-all ${value === c.value ? "scale-110" : "opacity-40 hover:opacity-100"}`}
        />
      ))}
    </div>
  );
}

export function TargetPicker({ value, color, onChange }: { value: number; color: string; onChange: (v: number) => void }) {
  const hex = colorHex(color);
  return (
    <div className="grid grid-cols-4 sm:flex sm:flex-wrap gap-2">
      {TARGETS.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={value === n ? { borderColor: hex, color: hex, backgroundColor: `${hex}1f` } : undefined}
          className={`px-3 py-2 border text-[10px] md:text-xs font-bold uppercase transition-all ${
            value === n ? "" : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
          }`}
        >
          {targetLabel(n)}
        </button>
      ))}
    </div>
  );
}

interface Day {
  date: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
  isFuture: boolean;
}

interface Props {
  habit: Habit;
  week: Day[];
  today: string;
  isThisWeek: boolean;
  adminMode: boolean;
  onToggle: (date: string) => void;
  onUpdate: (set: { name?: string; color?: string; perWeek?: number }) => void;
  onRemove: () => void;
}

export default function HabitCard({ habit, week, today, isThisWeek, adminMode, onToggle, onUpdate, onRemove }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [name, setName] = useState(habit.name);
  const [color, setColor] = useState(habit.color || "orange");
  const [target, setTarget] = useState(targetPerWeek(habit));

  const hex = colorHex(habit.color || "orange");
  const perWeek = targetPerWeek(habit);
  const unit = streakUnit(habit);
  const streak = getStreak(habit, today);
  const best = getBestStreak(habit, today);
  const doneThisWeek = doneInWeek(habit, week[0].date);
  const done = new Set(habit.history);
  const hit = doneThisWeek >= perWeek;

  const openEdit = () => {
    setName(habit.name);
    setColor(habit.color || "orange");
    setTarget(perWeek);
    setEditing(true);
  };

  const save = () => {
    onUpdate({ name: name.trim() || habit.name, color, perWeek: target });
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-4 md:p-6 border border-zinc-800 bg-black/50 overflow-hidden"
      style={{ borderLeftColor: hex, borderLeftWidth: 3 }}
    >
      {/* A faint wash of the habit's colour behind the header. */}
      <div
        className="absolute inset-x-0 top-0 h-24 pointer-events-none"
        style={{ background: `linear-gradient(180deg, ${hex}14, transparent)` }}
      />

      <div className="relative flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 md:mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 shrink-0 rounded-full" style={{ backgroundColor: hex, boxShadow: `0 0 10px ${hex}` }} />
            <span className="text-base md:text-lg font-bold text-white truncate">{habit.name}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 pl-6">
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: hex }}>
              {targetLabel(perWeek)}
            </span>
            {perWeek < 7 && (
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-zinc-400">
                <span className="flex gap-0.5">
                  {Array.from({ length: perWeek }, (_, i) => (
                    <span
                      key={i}
                      className="w-3 h-1.5"
                      style={{ backgroundColor: i < doneThisWeek ? hex : "#27272a" }}
                    />
                  ))}
                </span>
                {Math.min(doneThisWeek, 99)}/{perWeek} {isThisWeek ? "this week" : "that week"}
                {hit && <Check size={12} style={{ color: hex }} />}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-4 pl-6 sm:pl-0">
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-1.5">
              <Flame size={18} style={{ color: streak > 0 ? hex : "#52525b" }} />
              <span className="text-2xl md:text-3xl font-black leading-none" style={{ color: streak > 0 ? hex : "#71717a" }}>
                {streak}
              </span>
              <span className="text-[10px] text-zinc-400 uppercase self-end mb-0.5">
                {unit}{streak === 1 ? "" : "s"}
              </span>
            </div>
            {best > 0 && (
              <span className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase mb-0.5" title="Best streak">
                <Trophy size={11} /> {best}
              </span>
            )}
          </div>
          {adminMode && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => (editing ? setEditing(false) : openEdit())}
                className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                title="Edit habit"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => (confirmRemove ? onRemove() : setConfirmRemove(true))}
                onBlur={() => setConfirmRemove(false)}
                className={`transition-colors ${
                  confirmRemove
                    ? "px-2 py-1 border border-red-500/50 text-red-400 text-[9px] font-black uppercase"
                    : "p-1.5 text-zinc-600 hover:text-red-400"
                }`}
                title={confirmRemove ? "Click again to delete" : "Delete habit"}
              >
                {confirmRemove ? "Delete?" : <X size={14} />}
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {editing && adminMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="relative overflow-hidden mb-5"
          >
            <div className="p-4 border border-zinc-800 bg-black/70 space-y-4">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                className="w-full bg-transparent border-b-2 border-zinc-800 py-2 text-base text-white outline-none focus:border-zinc-500"
              />
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2.5">Color</div>
                <ColorPicker value={color} onChange={setColor} />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2.5">How often</div>
                <TargetPicker value={target} color={color} onChange={setTarget} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={save}
                  style={{ borderColor: colorHex(color), color: colorHex(color), backgroundColor: `${colorHex(color)}1a` }}
                  className="flex-1 py-2.5 border text-xs font-black uppercase tracking-wider"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-5 py-2.5 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative grid grid-cols-7 gap-1.5 md:gap-2">
        {week.map((day) => {
          const isDone = done.has(day.date);
          const canTap = adminMode && !day.isFuture;
          return (
            <button
              key={day.date}
              onClick={() => canTap && onToggle(day.date)}
              disabled={!canTap}
              style={
                isDone
                  ? { backgroundColor: `${hex}2e`, borderColor: hex, boxShadow: `inset 0 0 18px ${hex}33` }
                  : day.isToday
                    ? { borderColor: `${hex}99` }
                    : undefined
              }
              className={`group py-2 md:py-3 border text-center transition-all ${
                isDone
                  ? ""
                  : day.isFuture
                    ? "border-dashed border-zinc-800 opacity-40"
                    : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-600"
              } ${canTap ? "cursor-pointer active:scale-95" : "cursor-default"}`}
            >
              <div
                className={`text-[9px] md:text-[10px] font-black uppercase tracking-wider ${isDone ? "" : day.isToday ? "" : "text-zinc-500"}`}
                style={isDone || day.isToday ? { color: hex } : undefined}
              >
                {day.dayName}
              </div>
              <div className={`text-sm md:text-lg font-black leading-tight ${isDone ? "text-white" : "text-zinc-300"}`}>
                {day.dayNum}
              </div>
              <div className="h-4 md:h-5 flex items-center justify-center">
                {isDone ? (
                  <Check size={16} strokeWidth={3} style={{ color: hex }} />
                ) : day.isToday ? (
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hex }} />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}
