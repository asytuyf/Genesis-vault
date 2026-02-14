"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flame, GitCommit, Plus, X, Check, Target, TrendingUp, Bot, Trophy, RefreshCw
} from "lucide-react";

interface Habit {
  id: string;
  name: string;
  color: string;
  history: string[];
}

interface LLMModel {
  rank: number;
  name: string;
  score: number;
  org: string;
}

const HABIT_COLORS = [
  { name: "Orange", value: "orange", bg: "bg-orange-500", text: "text-orange-400", border: "border-orange-500" },
  { name: "Emerald", value: "emerald", bg: "bg-emerald-500", text: "text-emerald-400", border: "border-emerald-500" },
  { name: "Cyan", value: "cyan", bg: "bg-cyan-500", text: "text-cyan-400", border: "border-cyan-500" },
  { name: "Purple", value: "purple", bg: "bg-purple-500", text: "text-purple-400", border: "border-purple-500" },
  { name: "Pink", value: "pink", bg: "bg-pink-500", text: "text-pink-400", border: "border-pink-500" },
  { name: "Yellow", value: "yellow", bg: "bg-yellow-500", text: "text-yellow-400", border: "border-yellow-500" },
];

const getHabitColor = (color: string, type: "bg" | "text" | "border") => {
  const found = HABIT_COLORS.find(c => c.value === color);
  if (!found) return HABIT_COLORS[0][type];
  return found[type];
};

// Top coding LLMs - from arena.ai/leaderboard/code (Feb 2026)
const TOP_CODING_LLMS: LLMModel[] = [
  { rank: 1, name: "Claude Opus 4.6 Thinking", score: 1567, org: "Anthropic" },
  { rank: 2, name: "Claude Opus 4.6", score: 1560, org: "Anthropic" },
  { rank: 3, name: "Claude Opus 4.5 Thinking", score: 1503, org: "Anthropic" },
  { rank: 4, name: "GPT-5.2 High", score: 1473, org: "OpenAI" },
  { rank: 5, name: "Claude Opus 4.5", score: 1469, org: "Anthropic" },
  { rank: 6, name: "GLM-5", score: 1449, org: "Zhipu" },
  { rank: 7, name: "Gemini 3 Pro", score: 1449, org: "Google" },
  { rank: 8, name: "Kimi K2.5 Thinking", score: 1447, org: "Moonshot" },
  { rank: 9, name: "Gemini 3 Flash", score: 1444, org: "Google" },
  { rank: 10, name: "GLM-4.7", score: 1442, org: "Zhipu" },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TrackerPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitColor, setNewHabitColor] = useState("orange");
  const [githubUsername, setGithubUsername] = useState("");
  const [githubData, setGithubData] = useState<Record<string, number>>({});
  const [githubEvents, setGithubEvents] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [showGithubInput, setShowGithubInput] = useState(false);

  // Load saved data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHabits = localStorage.getItem("streaks_habits");
      const savedGithub = localStorage.getItem("streaks_github_username");
      const savedGithubData = localStorage.getItem("streaks_github_data");
      const savedGithubEvents = localStorage.getItem("streaks_github_events");

      if (savedHabits) setHabits(JSON.parse(savedHabits));
      if (savedGithub) setGithubUsername(savedGithub);
      if (savedGithubData) setGithubData(JSON.parse(savedGithubData));
      if (savedGithubEvents) setGithubEvents(JSON.parse(savedGithubEvents));
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
      const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=100`);
      const events = await res.json();

      const contributions: Record<string, number> = {};
      if (Array.isArray(events)) {
        setGithubEvents(events);
        localStorage.setItem("streaks_github_events", JSON.stringify(events));
        events.forEach((event: any) => {
          const date = event.created_at?.split("T")[0];
          if (date) {
            contributions[date] = (contributions[date] || 0) + 1;
          }
        });
      }
      setGithubData(contributions);
      localStorage.setItem("streaks_github_username", username);
      localStorage.setItem("streaks_github_data", JSON.stringify(contributions));
      setShowGithubInput(false);
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
    };
    saveHabits([...habits, newHabit]);
    setNewHabitName("");
    setNewHabitColor("orange");
    setShowAddHabit(false);
  };

  const getEventsForDay = (date: string) => {
    return githubEvents.filter((e: any) => e.created_at?.startsWith(date));
  };

  const formatEventType = (type: string) => {
    return type.replace(/Event$/, "").replace(/([A-Z])/g, " $1").trim();
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
        history: hasDate ? h.history.filter((d) => d !== date) : [...h.history, date],
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

  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push({
        date: date.toISOString().split("T")[0],
        dayName: DAYS[date.getDay()],
        dayNum: date.getDate(),
        isToday: i === 0,
      });
    }
    return days;
  };

  const weekDays = getWeekDays();
  const today = new Date().toISOString().split("T")[0];
  const githubThisWeek = weekDays.reduce((acc, day) => acc + (githubData[day.date] || 0), 0);

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-x-hidden px-6 pb-6 pt-[56px] md:p-24">
      {/* HAZARD BARS */}
      <div className="fixed inset-x-0 top-0 h-[28px] bg-orange-500 z-[150] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] bg-orange-500 z-[150] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>

      {/* BACKGROUND */}
      <div className="fixed inset-0 z-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
        <TrendingUp size={800} strokeWidth={0.5} />
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10">
        {/* HEADER */}
        <header className="mb-12">
          <div className="flex flex-col">
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">PULSE</h1>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-800 uppercase leading-[0.8]">_TRACKER.</h1>
          </div>
        </header>

        {/* GITHUB WEEKLY */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <GitCommit size={20} className="text-orange-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">GitHub This Week</span>
              {githubUsername && (
                <span className="text-[10px] text-zinc-600">@{githubUsername}</span>
              )}
            </div>
            <button
              onClick={() => setShowGithubInput(!showGithubInput)}
              className="p-2 text-zinc-600 hover:text-orange-400 transition-colors"
            >
              {githubUsername ? <RefreshCw size={14} /> : <Plus size={14} />}
            </button>
          </div>

          {/* GitHub Username Input */}
          {showGithubInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-4 p-4 border border-zinc-800 bg-black/60"
            >
              <div className="flex gap-3">
                <input
                  type="text"
                  placeholder="GitHub username"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchGithubData(githubUsername)}
                  className="flex-1 bg-black border border-zinc-800 px-4 py-2 text-sm text-white outline-none focus:border-orange-500"
                />
                <button
                  onClick={() => fetchGithubData(githubUsername)}
                  disabled={loadingGithub}
                  className="px-6 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase hover:bg-orange-500/20 disabled:opacity-50"
                >
                  {loadingGithub ? "..." : "Sync"}
                </button>
              </div>
            </motion.div>
          )}

          {/* Week Grid - GitHub */}
          {githubUsername ? (
            <>
              <div className="grid grid-cols-7 gap-2 md:gap-4 mb-4">
                {weekDays.map((day) => {
                  const githubCount = githubData[day.date] || 0;
                  const isSelected = selectedDay === day.date;

                  return (
                    <button
                      key={day.date}
                      onClick={() => setSelectedDay(isSelected ? null : day.date)}
                      className={`p-3 md:p-6 border text-center transition-all ${
                        isSelected
                          ? "border-orange-500 bg-orange-500/20"
                          : day.isToday
                            ? "border-zinc-700 bg-zinc-900"
                            : githubCount > 0
                              ? "border-zinc-800 bg-zinc-900/50"
                              : "border-zinc-900 bg-black/40"
                      }`}
                    >
                      <div className={`text-[10px] md:text-xs font-black uppercase tracking-wider mb-2 ${
                        day.isToday ? "text-orange-400" : "text-zinc-600"
                      }`}>
                        {day.dayName}
                      </div>
                      <div className={`text-xl md:text-3xl font-black ${
                        githubCount > 0 ? "text-orange-400" : "text-zinc-700"
                      }`}>
                        {githubCount}
                      </div>
                      <div className="text-[8px] text-zinc-600 uppercase mt-1">commits</div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Details */}
              {selectedDay && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="p-4 border border-zinc-800 bg-black/60 mb-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-white">{selectedDay}</span>
                    <button onClick={() => setSelectedDay(null)} className="text-zinc-600 hover:text-white">
                      <X size={16} />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {getEventsForDay(selectedDay).length > 0 ? (
                      getEventsForDay(selectedDay).map((event: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-2 border border-zinc-900 bg-black/40">
                          <GitCommit size={14} className="text-orange-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-zinc-300 truncate">{event.repo?.name}</div>
                            <div className="text-[10px] text-zinc-600">{formatEventType(event.type)}</div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-zinc-600 text-xs">No activity this day</div>
                    )}
                  </div>
                </motion.div>
              )}
            </>
          ) : (
            <div className="p-8 border border-zinc-900 bg-black/20 text-center">
              <GitCommit size={32} className="mx-auto mb-3 text-zinc-800" />
              <p className="text-zinc-600 text-xs mb-4">Track your GitHub activity</p>
              <button
                onClick={() => setShowGithubInput(true)}
                className="px-4 py-2 border border-orange-500/30 text-orange-400 text-xs font-black uppercase hover:bg-orange-500/10"
              >
                Add Username
              </button>
            </div>
          )}
        </section>

        {/* CODE ARENA - TOP CODING MODELS */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bot size={20} className="text-orange-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Code Arena Rankings</span>
            </div>
            <a
              href="https://arena.ai/leaderboard/code"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-zinc-600 hover:text-orange-400 transition-colors"
            >
              Live rankings →
            </a>
          </div>

          <div className="space-y-2">
            {TOP_CODING_LLMS.map((model) => (
              <div
                key={model.rank}
                className={`p-4 border flex items-center gap-4 transition-all ${
                  model.rank === 1
                    ? "border-orange-500/30 bg-orange-500/5"
                    : model.rank <= 3
                      ? "border-zinc-800 bg-zinc-900/30"
                      : "border-zinc-900 bg-black/40"
                }`}
              >
                <div className={`w-8 h-8 flex items-center justify-center font-black ${
                  model.rank === 1 ? "text-orange-400" : model.rank === 2 ? "text-zinc-300" : model.rank === 3 ? "text-amber-600" : "text-zinc-600"
                }`}>
                  {model.rank === 1 ? <Trophy size={20} /> : `#${model.rank}`}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{model.name}</div>
                  <div className="text-[10px] text-zinc-600 uppercase">{model.org}</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-black ${model.rank === 1 ? "text-orange-400" : "text-zinc-400"}`}>
                    {model.score}
                  </div>
                  <div className="text-[8px] text-zinc-600 uppercase">ELO</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HABITS */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-orange-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Habits</span>
            </div>
            <button
              onClick={() => setShowAddHabit(!showAddHabit)}
              className="flex items-center gap-2 px-4 py-2 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/10 transition-colors"
            >
              <Plus size={14} />
              Add
            </button>
          </div>

          {/* Add Habit Form */}
          {showAddHabit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-6 p-6 border border-zinc-800 bg-black/60 backdrop-blur-sm"
            >
              <input
                type="text"
                placeholder="New habit name..."
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addHabit()}
                className="w-full bg-transparent border-b-2 border-zinc-800 px-0 py-3 text-lg text-white outline-none focus:border-orange-500 mb-6 placeholder:text-zinc-700"
              />

              {/* Color Picker */}
              <div className="mb-6">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-3">Color</div>
                <div className="flex gap-2 flex-wrap">
                  {HABIT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setNewHabitColor(color.value)}
                      className={`w-8 h-8 rounded-full ${color.bg} transition-all ${
                        newHabitColor === color.value
                          ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                          : "opacity-50 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={addHabit}
                  className={`flex-1 py-3 bg-opacity-10 border border-opacity-30 text-xs font-black uppercase tracking-wider hover:bg-opacity-20 transition-colors ${getHabitColor(newHabitColor, "text")} ${getHabitColor(newHabitColor, "border")}`}
                >
                  Create Habit
                </button>
                <button
                  onClick={() => setShowAddHabit(false)}
                  className="px-6 py-3 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* Habit Cards */}
          <div className="space-y-4">
            {habits.map((habit) => {
              const streak = getStreak(habit);
              const completedToday = habit.history.includes(today);
              const color = habit.color || "orange";

              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 border transition-all ${
                    completedToday ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-800 bg-black/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${completedToday ? getHabitColor(color, "bg") : "bg-zinc-700"}`} />
                      <span className="text-lg font-bold text-white">{habit.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Flame size={16} className={getHabitColor(color, "text")} />
                        <span className={`text-lg font-black ${getHabitColor(color, "text")}`}>{streak}</span>
                        <span className="text-xs text-zinc-500 uppercase">day streak</span>
                      </div>
                      <button
                        onClick={() => removeHabit(habit.id)}
                        className="p-2 text-zinc-700 hover:text-red-400 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Week checkboxes */}
                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const isCompleted = habit.history.includes(day.date);
                      return (
                        <button
                          key={day.date}
                          onClick={() => toggleHabitForDate(habit.id, day.date)}
                          className={`p-3 border text-center transition-all ${
                            isCompleted
                              ? `${getHabitColor(color, "border")} ${getHabitColor(color, "bg")} text-black`
                              : "border-zinc-800 text-zinc-600 hover:border-zinc-700"
                          }`}
                        >
                          <div className={`text-[9px] font-bold uppercase mb-1 ${isCompleted ? "text-black" : ""}`}>{day.dayName}</div>
                          {isCompleted ? (
                            <Check size={18} className="mx-auto" />
                          ) : (
                            <div className="w-[18px] h-[18px] mx-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}

            {habits.length === 0 && !showAddHabit && (
              <div className="text-center py-16 border border-zinc-800 bg-black/20">
                <Flame size={48} className="mx-auto mb-4 text-zinc-800" />
                <p className="text-zinc-600 text-sm font-bold uppercase tracking-wider mb-4">No habits yet</p>
                <button
                  onClick={() => setShowAddHabit(true)}
                  className="px-6 py-3 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/10 transition-colors"
                >
                  Create Your First Habit
                </button>
              </div>
            )}
          </div>
        </section>

        {/* STATS */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 border border-zinc-900 bg-[#0a0a0a] text-center">
              <div className="text-3xl md:text-4xl font-black text-orange-400">{habits.length}</div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">Habits</div>
            </div>
            <div className="p-6 border border-zinc-900 bg-[#0a0a0a] text-center">
              <div className="text-3xl md:text-4xl font-black text-orange-400">
                {habits.filter((h) => h.history.includes(today)).length}
              </div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">Done Today</div>
            </div>
            <div className="p-6 border border-zinc-900 bg-[#0a0a0a] text-center">
              <div className="text-3xl md:text-4xl font-black text-orange-400">
                {habits.length > 0 ? Math.max(...habits.map(getStreak)) : 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">Best Streak</div>
            </div>
            <div className="p-6 border border-zinc-900 bg-[#0a0a0a] text-center">
              <div className="text-3xl md:text-4xl font-black text-orange-400">{githubThisWeek}</div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">GitHub This Week</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
