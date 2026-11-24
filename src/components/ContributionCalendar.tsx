"use client";
// GitHub-style contribution heatmap in the tracker's orange: a month as a
// Monday-first calendar, or a whole year as week columns like a profile page.

import { addDays, mondayOf, parseLocal } from "@/lib/habits";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Empty, then four steps of orange, dim to bright, as on a dark profile page. */
const LEVELS = ["#18181b", "#5c2309", "#9a3a0c", "#ea6a12", "#fdba74"];

/**
 * Which of the four shades a count gets. Like GitHub, the steps are the
 * quartiles of the days that had anything at all, so one huge day does not
 * wash every other day out to the dimmest shade.
 */
export function levelScale(days: Record<string, number>): (count: number) => number {
  const counts = Object.values(days).filter((n) => n > 0).sort((a, b) => a - b);
  if (counts.length === 0) return () => 0;
  const q = (p: number) => counts[Math.min(counts.length - 1, Math.floor(p * counts.length))];
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  return (n) => (n <= 0 ? 0 : n <= q1 ? 1 : n <= q2 ? 2 : n <= q3 ? 3 : 4);
}

const pad = (n: number) => String(n).padStart(2, "0");

interface Props {
  days: Record<string, number>;
  view: "month" | "year";
  year: number;
  /** 0 to 11, used by the month view. */
  month: number;
  today: string;
  selectedDay: string | null;
  onSelectDay: (date: string | null) => void;
  /** Year view: tapping a month's label opens that month. */
  onOpenMonth: (month: number) => void;
}

export default function ContributionCalendar({ days, view, year, month, today, selectedDay, onSelectDay, onOpenMonth }: Props) {
  const level = levelScale(days);

  if (view === "month") {
    const first = `${year}-${pad(month + 1)}-01`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const last = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;
    const cells: (string | null)[] = [];
    for (let d = mondayOf(first); d < first; d = addDays(d, 1)) cells.push(null);
    for (let d = first; d <= last; d = addDays(d, 1)) cells.push(d);
    while (cells.length % 7) cells.push(null);

    return (
      <div className="max-w-2xl mx-auto">
        <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-1.5">
          {DAY_NAMES.map((n) => (
            <div key={n} className="text-center text-[9px] md:text-[10px] font-black uppercase tracking-wider text-zinc-600">
              {n}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 md:gap-2">
          {cells.map((date, i) => {
            if (!date) return <div key={`pad-${i}`} />;
            const count = days[date] || 0;
            const lvl = level(count);
            const isFuture = date > today;
            const isToday = date === today;
            const isSelected = selectedDay === date;
            return (
              <button
                key={date}
                onClick={() => onSelectDay(isSelected ? null : date)}
                disabled={isFuture}
                title={`${count} contribution${count === 1 ? "" : "s"} on ${date}`}
                style={{ backgroundColor: LEVELS[lvl] }}
                className={`relative aspect-square md:aspect-[5/4] p-1.5 md:p-2 text-left transition-all border ${
                  isSelected
                    ? "border-white ring-2 ring-orange-400/60"
                    : isToday
                      ? "border-orange-400"
                      : lvl > 0
                        ? "border-transparent hover:border-orange-300/60"
                        : "border-zinc-800/80 hover:border-zinc-600"
                } ${isFuture ? "opacity-25 cursor-default" : ""}`}
              >
                <span className={`block text-[10px] md:text-xs font-black leading-none ${lvl >= 3 ? "text-black/80" : isToday ? "text-orange-300" : "text-zinc-400"}`}>
                  {parseLocal(date).getDate()}
                </span>
                {count > 0 && (
                  <span className={`absolute bottom-1 right-1.5 md:bottom-1.5 md:right-2 text-[11px] md:text-base font-black leading-none ${lvl >= 3 ? "text-black" : "text-orange-200"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Year view: one column per Monday-to-Sunday week.
  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const weeks: string[][] = [];
  for (let monday = mondayOf(jan1); monday <= dec31; monday = addDays(monday, 7)) {
    weeks.push(Array.from({ length: 7 }, (_, i) => addDays(monday, i)));
  }
  // A month's label sits over the week holding its first day.
  const labels = weeks.map((week) => {
    const firstOfMonth = week.find((d) => d.endsWith("-01") && d.startsWith(`${year}-`));
    return firstOfMonth ? Number(firstOfMonth.slice(5, 7)) - 1 : null;
  });

  return (
    <div className="overflow-x-auto pb-2 -mx-1 px-1">
      <div className="flex flex-col gap-1 w-max mx-auto">
        <div className="flex gap-[3px] pl-8">
          {labels.map((m, i) => (
            <div key={i} className="w-[11px] md:w-[13px] relative h-4">
              {m !== null && (
                <button
                  onClick={() => onOpenMonth(m)}
                  className="absolute left-0 top-0 text-[9px] md:text-[10px] font-bold uppercase text-zinc-500 hover:text-orange-400 whitespace-nowrap"
                >
                  {MONTHS[m]}
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-[3px]">
          <div className="w-8 shrink-0 flex flex-col gap-[3px]">
            {DAY_NAMES.map((n, i) => (
              <div key={n} className="h-[11px] md:h-[13px] text-[8px] md:text-[9px] leading-[11px] md:leading-[13px] text-zinc-600 uppercase">
                {i % 2 === 0 ? n : ""}
              </div>
            ))}
          </div>
          {weeks.map((week) => (
            <div key={week[0]} className="flex flex-col gap-[3px]">
              {week.map((date) => {
                const inYear = date.startsWith(`${year}-`);
                const count = days[date] || 0;
                const isSelected = selectedDay === date;
                if (!inYear || date > today) {
                  return (
                    <div
                      key={date}
                      className={`w-[11px] h-[11px] md:w-[13px] md:h-[13px] ${inYear ? "border border-zinc-900" : ""}`}
                    />
                  );
                }
                return (
                  <button
                    key={date}
                    onClick={() => onSelectDay(isSelected ? null : date)}
                    title={`${count} contribution${count === 1 ? "" : "s"} on ${date}`}
                    style={{ backgroundColor: LEVELS[level(count)] }}
                    className={`w-[11px] h-[11px] md:w-[13px] md:h-[13px] rounded-[2px] transition-transform hover:scale-125 ${
                      isSelected ? "ring-2 ring-white" : date === today ? "ring-1 ring-orange-400" : ""
                    }`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1.5 mt-2 text-[9px] uppercase tracking-wider text-zinc-600">
          Less
          {LEVELS.map((c) => (
            <span key={c} className="w-[11px] h-[11px] rounded-[2px]" style={{ backgroundColor: c }} />
          ))}
          More
        </div>
      </div>
    </div>
  );
}
