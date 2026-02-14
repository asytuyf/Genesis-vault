"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Terminal, Flame, GitCommit, Plus, X, Check,
  Calendar, TrendingUp, Zap, Target
} from "lucide-react";

interface Habit {
  id: string;
  name: string;
  color: string;
  history: string[]; // dates completed
  createdAt: string;
}

interface DayData {
  date: string;
  count: number;
  habits: string[];
}

const COLORS = [
  { name: "Emerald", value: "emerald" },
  { name: "Cyan", value: "cyan" },
  { name: "Purple", value: "purple" },
  { name: "Orange", value: "orange" },
  { name: "Pink", value: "pink" },
  { name: "Yellow", value: "yellow" },
];

const getColorClass = (color: string, type: "bg" | "text" | "border") => {
  const map: Record<string, Record<string, string>> = {
    emerald: { bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500" },
    cyan: { bg: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500" },
    purple: { bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-500" },
    orange: { bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-500" },
    pink: { bg: "bg-pink-500", text: "text-pink-400", border: "border-pink-500" },
    yellow: { bg: "bg-yellow-500", text: "text-yellow-400", border: "border-yellow-500" },
  };
  return map[color]?.[type] || map.emerald[type];
};

export default function StreaksPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitColor, setNewHabitColor] = useState("emerald");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [githubUsername, setGithubUsername] = useState("");
  const [githubData, setGithubData] = useState<any>(null);
  const [loadingGithub, setLoadingGithub] = useState(false);

  // Load saved data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHabits = localStorage.getItem("streaks_habits");
      const savedGithub = localStorage.getItem("streaks_github_username");
      if (savedHabits) setHabits(JSON.parse(savedHabits));
      if (savedGithub) {
        setGithubUsername(savedGithub);
        fetchGithubData(savedGithub);
      }
    }
  }, []);

  const saveHabits = (newHabits: Habit[]) => {
    setHabits(newHabits);
    localStorage.setItem("streaks_habits", JSON.stringify(newHabits));
  };

  const fetchGithubData = async (username: string) => {
    if (!username) return;
    setLoadingGithub(true);
    try {
      // Using GitHub's contribution graph API (via a proxy or direct)
      const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`);
      const events = await res.json();

      // Process events to get contribution data
      const contributions: Record<string, number> = {};
      if (Array.isArray(events)) {
        events.forEach((event: any) => {
          const date = event.created_at?.split("T")[0];
          if (date) {
            contributions[date] = (contributions[date] || 0) + 1;
          }
        });
      }
      setGithubData(contributions);
      localStorage.setItem("streaks_github_username", username);
    } catch (e) {
      console.error("Failed to fetch GitHub data:", e);
    }
    setLoadingGithub(false);
  };

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName,
      color: newHabitColor,
      history: [],
      createdAt: new Date().toISOString().split("T")[0],
    };
    saveHabits([...habits, newHabit]);
    setNewHabitName("");
    setShowAddHabit(false);
  };

  const removeHabit = (id: string) => {
    saveHabits(habits.filter((h) => h.id !== id));
  };

  const toggleHabitForDate = (habitId: string, date: string) => {
    const updated = habits.map((h) => {
      if (h.id !== habitId) return h;
      const hasDate = h.history.includes(date);
      return {
        ...h,
        history: hasDate
          ? h.history.filter((d) => d !== date)
          : [...h.history, date],
      };
    });
    saveHabits(updated);
  };

  const getStreak = (habit: Habit) => {
    const today = new Date();
    let streak = 0;
    let currentDate = new Date(today);

    while (true) {
      const dateStr = currentDate.toISOString().split("T")[0];
      if (habit.history.includes(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const getLongestStreak = (habit: Habit) => {
    if (habit.history.length === 0) return 0;
    const sorted = [...habit.history].sort();
    let longest = 1;
    let current = 1;

    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]);
      const curr = new Date(sorted[i]);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

      if (diff === 1) {
        current++;
        longest = Math.max(longest, current);
      } else {
        current = 1;
      }
    }
    return longest;
  };

  // Generate calendar data for last 365 days
  const generateCalendarData = () => {
    const days: DayData[] = [];
    const today = new Date();

    for (let i = 364; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const habitsCompleted = habits.filter((h) => h.history.includes(dateStr)).map((h) => h.id);
      const githubCount = githubData?.[dateStr] || 0;

      days.push({
        date: dateStr,
        count: habitsCompleted.length + githubCount,
        habits: habitsCompleted,
      });
    }
    return days;
  };

  const calendarData = generateCalendarData();
  const today = new Date().toISOString().split("T")[0];

  // Group by weeks
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];

  // Pad start to align with Sunday
  const firstDay = new Date(calendarData[0]?.date || today);
  const startPadding = firstDay.getDay();
  for (let i = 0; i < startPadding; i++) {
    currentWeek.push({ date: "", count: 0, habits: [] });
  }

  calendarData.forEach((day) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const getIntensity = (count: number) => {
    if (count === 0) return "bg-zinc-900";
    if (count === 1) return "bg-emerald-900/50";
    if (count === 2) return "bg-emerald-700/60";
    if (count === 3) return "bg-emerald-500/70";
    return "bg-emerald-400";
  };

  const totalCompletions = habits.reduce((acc, h) => acc + h.history.length, 0);
  const totalGithub = Object.values(githubData || {}).reduce((a: number, b: any) => a + b, 0) as number;

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-x-hidden px-6 pb-6 pt-[56px] md:p-24">
      {/* HAZARD BARS */}
      <div className="fixed inset-x-0 top-0 h-[28px] bg-yellow-400 z-[150] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] bg-yellow-400 z-[150] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>

      {/* BIG BACKGROUND SYMBOL */}
      <div className="fixed inset-0 z-0 opacity-[0.02] flex items-center justify-center pointer-events-none">
        <Flame size={800} strokeWidth={0.5} />
      </div>

      <header className="relative z-10 mb-12">
        <div className="flex flex-col mb-8">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">STREAK</h1>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-800 uppercase leading-[0.8]">_TRACKER.</h1>
        </div>
        <div className="flex flex-wrap items-center gap-6 text-zinc-600 text-xs font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Flame size={14} className="text-emerald-400" />
            <span>{totalCompletions} habits completed</span>
          </div>
          {githubUsername && (
            <div className="flex items-center gap-2">
              <GitCommit size={14} className="text-emerald-400" />
              <span>{totalGithub} github events</span>
            </div>
          )}
        </div>
      </header>

      <div className="relative z-10 space-y-8">
        {/* CONTRIBUTION GRAPH */}
        <div className="bg-[#0a0a0a] border border-zinc-900 p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-emerald-400">
              <Calendar size={18} />
              <span className="text-xs font-black uppercase tracking-wider">Contribution_Graph</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-zinc-500">
              <span>Less</span>
              <div className="w-3 h-3 bg-zinc-900 rounded-sm" />
              <div className="w-3 h-3 bg-emerald-900/50 rounded-sm" />
              <div className="w-3 h-3 bg-emerald-700/60 rounded-sm" />
              <div className="w-3 h-3 bg-emerald-500/70 rounded-sm" />
              <div className="w-3 h-3 bg-emerald-400 rounded-sm" />
              <span>More</span>
            </div>
          </div>

          {/* Calendar grid */}
          <div className="flex gap-[3px] min-w-max">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day, di) => (
                  <motion.div
                    key={`${wi}-${di}`}
                    whileHover={{ scale: 1.3 }}
                    onClick={() => day.date && setSelectedDate(day.date === selectedDate ? null : day.date)}
                    className={`w-3 h-3 rounded-sm cursor-pointer transition-all ${
                      day.date ? getIntensity(day.count) : "bg-transparent"
                    } ${day.date === selectedDate ? "ring-2 ring-white" : ""} ${
                      day.date === today ? "ring-1 ring-emerald-400" : ""
                    }`}
                    title={day.date ? `${day.date}: ${day.count} activities` : ""}
                  />
                ))}
              </div>
            ))}
          </div>

          {/* Selected date details */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 p-4 border border-zinc-800 bg-black/50"
            >
              <div className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3">
                {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </div>
              <div className="flex flex-wrap gap-2">
                {habits.map((habit) => (
                  <button
                    key={habit.id}
                    onClick={() => toggleHabitForDate(habit.id, selectedDate)}
                    className={`flex items-center gap-2 px-3 py-1.5 border text-xs font-bold transition-all ${
                      habit.history.includes(selectedDate)
                        ? `${getColorClass(habit.color, "border")}/50 ${getColorClass(habit.color, "text")} bg-${habit.color}-500/10`
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    }`}
                  >
                    {habit.history.includes(selectedDate) && <Check size={12} />}
                    {habit.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* GITHUB INTEGRATION */}
        <div className="bg-[#0a0a0a] border border-zinc-900 p-6">
          <div className="flex items-center gap-2 text-emerald-400 mb-4">
            <GitCommit size={18} />
            <span className="text-xs font-black uppercase tracking-wider">GitHub_Sync</span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="GitHub username"
              value={githubUsername}
              onChange={(e) => setGithubUsername(e.target.value)}
              className="flex-1 bg-black border border-zinc-800 px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => fetchGithubData(githubUsername)}
              disabled={loadingGithub}
              className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
            >
              {loadingGithub ? "Loading..." : "Sync"}
            </button>
          </div>
        </div>

        {/* HABITS */}
        <div className="bg-[#0a0a0a] border border-zinc-900 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-emerald-400">
              <Target size={18} />
              <span className="text-xs font-black uppercase tracking-wider">Habits</span>
            </div>
            <button
              onClick={() => setShowAddHabit(!showAddHabit)}
              className="p-1.5 text-zinc-600 hover:text-emerald-400 transition-colors border border-zinc-800 hover:border-emerald-500/30"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add habit form */}
          {showAddHabit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-4 border border-zinc-800 bg-black/50"
            >
              <input
                type="text"
                placeholder="Habit name (e.g., 'Code for 1 hour')"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                className="w-full bg-transparent border-b border-zinc-800 px-0 py-2 text-sm text-white outline-none focus:border-emerald-500 mb-4"
              />
              <div className="flex flex-wrap gap-2 mb-4">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setNewHabitColor(c.value)}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border transition-all ${
                      newHabitColor === c.value
                        ? `${getColorClass(c.value, "border")}/50 ${getColorClass(c.value, "text")}`
                        : "border-zinc-800 text-zinc-500"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
              <button
                onClick={addHabit}
                className="w-full py-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-colors"
              >
                Add Habit
              </button>
            </motion.div>
          )}

          {/* Habits grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {habits.map((habit) => {
              const streak = getStreak(habit);
              const longest = getLongestStreak(habit);
              const completedToday = habit.history.includes(today);

              return (
                <motion.div
                  key={habit.id}
                  layout
                  className={`relative p-4 border transition-all ${
                    completedToday
                      ? `${getColorClass(habit.color, "border")}/30 bg-${habit.color}-500/5`
                      : "border-zinc-900 hover:border-zinc-800"
                  }`}
                >
                  <button
                    onClick={() => removeHabit(habit.id)}
                    className="absolute top-2 right-2 p-1 text-zinc-700 hover:text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>

                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${getColorClass(habit.color, "bg")}`} />
                    <span className="text-sm font-bold text-white">{habit.name}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="text-center p-2 bg-black/30 border border-zinc-900">
                      <div className={`text-xl font-black ${getColorClass(habit.color, "text")}`}>{streak}</div>
                      <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">Current</div>
                    </div>
                    <div className="text-center p-2 bg-black/30 border border-zinc-900">
                      <div className="text-xl font-black text-zinc-400">{longest}</div>
                      <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">Longest</div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleHabitForDate(habit.id, today)}
                    className={`w-full py-2 border text-xs font-black uppercase tracking-wider transition-all ${
                      completedToday
                        ? `${getColorClass(habit.color, "border")}/50 ${getColorClass(habit.color, "text")} bg-${habit.color}-500/10`
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    {completedToday ? (
                      <span className="flex items-center justify-center gap-2">
                        <Check size={14} /> Done Today
                      </span>
                    ) : (
                      "Mark Complete"
                    )}
                  </button>
                </motion.div>
              );
            })}

            {habits.length === 0 && (
              <div className="col-span-full text-center py-12 text-zinc-600">
                <Target size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-sm font-bold uppercase tracking-wider">No habits yet</p>
                <p className="text-xs mt-1">Add your first habit to start tracking</p>
              </div>
            )}
          </div>
        </div>

        {/* STATS */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-[#0a0a0a] border border-zinc-900 p-6 text-center">
            <div className="text-3xl font-black text-emerald-400">{habits.length}</div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-1">Total Habits</div>
          </div>
          <div className="bg-[#0a0a0a] border border-zinc-900 p-6 text-center">
            <div className="text-3xl font-black text-cyan-400">{totalCompletions}</div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-1">Completions</div>
          </div>
          <div className="bg-[#0a0a0a] border border-zinc-900 p-6 text-center">
            <div className="text-3xl font-black text-purple-400">
              {habits.length > 0 ? Math.max(...habits.map(getStreak)) : 0}
            </div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-1">Best Streak</div>
          </div>
          <div className="bg-[#0a0a0a] border border-zinc-900 p-6 text-center">
            <div className="text-3xl font-black text-orange-400">
              {habits.filter((h) => h.history.includes(today)).length}
            </div>
            <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-1">Done Today</div>
          </div>
        </div>
      </div>
    </main>
  );
}
