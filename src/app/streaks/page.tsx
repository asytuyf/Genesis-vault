"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flame, GitCommit, Plus, X, Check, Target, TrendingUp
} from "lucide-react";

interface Habit {
  id: string;
  name: string;
  history: string[]; // dates completed
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function StreaksPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [githubData, setGithubData] = useState<Record<string, number>>({});
  const [loadingGithub, setLoadingGithub] = useState(false);

  // Load saved data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedHabits = localStorage.getItem("streaks_habits");
      const savedGithub = localStorage.getItem("streaks_github_username");
      const savedGithubData = localStorage.getItem("streaks_github_data");

      if (savedHabits) setHabits(JSON.parse(savedHabits));
      if (savedGithub) setGithubUsername(savedGithub);
      if (savedGithubData) setGithubData(JSON.parse(savedGithubData));
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
      history: [],
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

  // Generate last 7 days
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

  // GitHub stats
  const githubThisWeek = weekDays.reduce((acc, day) => acc + (githubData[day.date] || 0), 0);

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-hidden">
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

      {/* CINEMATIC BACKGROUND */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-950/20 via-transparent to-orange-950/30" />
        <motion.div
          animate={{ opacity: [0.02, 0.05, 0.02], scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <Flame size={900} strokeWidth={0.3} className="text-orange-500" />
        </motion.div>
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)"
        }} />
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 min-h-screen px-6 py-20 md:px-12 lg:px-24">
        {/* HEADER */}
        <header className="mb-16 pt-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col"
          >
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">STREAK</h1>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-orange-500/20 uppercase leading-[0.8]">_TRACKER.</h1>
          </motion.div>
        </header>

        {/* WEEKLY OVERVIEW */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp size={20} className="text-orange-400" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">This Week</span>
          </div>

          {/* Week Grid */}
          <div className="grid grid-cols-7 gap-2 md:gap-4 mb-8">
            {weekDays.map((day) => {
              const habitsCompleted = habits.filter((h) => h.history.includes(day.date)).length;
              const githubCount = githubData[day.date] || 0;
              const totalActivity = habitsCompleted + githubCount;

              return (
                <motion.div
                  key={day.date}
                  whileHover={{ scale: 1.02 }}
                  className={`p-3 md:p-6 border text-center transition-all ${
                    day.isToday
                      ? "border-orange-500 bg-orange-500/10"
                      : totalActivity > 0
                        ? "border-orange-500/30 bg-orange-500/5"
                        : "border-zinc-800 bg-black/40"
                  }`}
                >
                  <div className={`text-[10px] md:text-xs font-black uppercase tracking-wider mb-2 ${
                    day.isToday ? "text-orange-400" : "text-zinc-500"
                  }`}>
                    {day.dayName}
                  </div>
                  <div className={`text-xl md:text-3xl font-black ${
                    day.isToday ? "text-orange-400" : totalActivity > 0 ? "text-orange-300" : "text-zinc-600"
                  }`}>
                    {day.dayNum}
                  </div>
                  {totalActivity > 0 && (
                    <div className="mt-2 flex justify-center gap-1">
                      {[...Array(Math.min(totalActivity, 5))].map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
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
                className="w-full bg-transparent border-b-2 border-zinc-800 px-0 py-3 text-lg text-white outline-none focus:border-orange-500 mb-4 placeholder:text-zinc-700"
              />
              <div className="flex gap-3">
                <button
                  onClick={addHabit}
                  className="flex-1 py-3 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/20 transition-colors"
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

              return (
                <motion.div
                  key={habit.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-6 border transition-all ${
                    completedToday
                      ? "border-orange-500/50 bg-orange-500/5"
                      : "border-zinc-800 bg-black/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${completedToday ? "bg-orange-400" : "bg-zinc-700"}`} />
                      <span className="text-lg font-bold text-white">{habit.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Flame size={16} className="text-orange-400" />
                        <span className="text-lg font-black text-orange-400">{streak}</span>
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
                              ? "border-orange-500/50 bg-orange-500/20 text-orange-400"
                              : "border-zinc-800 text-zinc-600 hover:border-zinc-700"
                          }`}
                        >
                          <div className="text-[9px] font-bold uppercase mb-1">{day.dayName}</div>
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
                <Flame size={48} className="mx-auto mb-4 text-orange-500/20" />
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

        {/* GITHUB */}
        <section className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <GitCommit size={20} className="text-orange-400" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">GitHub Activity</span>
          </div>

          <div className="p-6 border border-zinc-800 bg-black/40 backdrop-blur-sm">
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <input
                type="text"
                placeholder="GitHub username"
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchGithubData(githubUsername)}
                className="flex-1 bg-black border border-zinc-800 px-4 py-3 text-sm text-white outline-none focus:border-orange-500 transition-colors placeholder:text-zinc-700"
              />
              <button
                onClick={() => fetchGithubData(githubUsername)}
                disabled={loadingGithub}
                className="px-8 py-3 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/20 transition-colors disabled:opacity-50"
              >
                {loadingGithub ? "Syncing..." : "Sync"}
              </button>
            </div>

            {/* GitHub Week Stats */}
            {Object.keys(githubData).length > 0 && (
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const count = githubData[day.date] || 0;
                  return (
                    <div
                      key={day.date}
                      className={`p-3 border text-center ${
                        count > 0 ? "border-orange-500/30 bg-orange-500/10" : "border-zinc-800"
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase text-zinc-500 mb-1">{day.dayName}</div>
                      <div className={`text-lg font-black ${count > 0 ? "text-orange-400" : "text-zinc-700"}`}>
                        {count}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {Object.keys(githubData).length === 0 && (
              <div className="text-center py-8 text-zinc-700">
                <GitCommit size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-xs font-bold uppercase tracking-wider">Enter your GitHub username to track commits</p>
              </div>
            )}
          </div>
        </section>

        {/* STATS */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 border border-orange-500/20 bg-orange-500/5 text-center">
              <div className="text-3xl md:text-4xl font-black text-orange-400">{habits.length}</div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-2">Habits</div>
            </div>
            <div className="p-6 border border-orange-500/20 bg-orange-500/5 text-center">
              <div className="text-3xl md:text-4xl font-black text-orange-400">
                {habits.filter((h) => h.history.includes(today)).length}
              </div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-2">Done Today</div>
            </div>
            <div className="p-6 border border-orange-500/20 bg-orange-500/5 text-center">
              <div className="text-3xl md:text-4xl font-black text-orange-400">
                {habits.length > 0 ? Math.max(...habits.map(getStreak)) : 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-2">Best Streak</div>
            </div>
            <div className="p-6 border border-orange-500/20 bg-orange-500/5 text-center">
              <div className="text-3xl md:text-4xl font-black text-orange-400">{githubThisWeek}</div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-2">GitHub This Week</div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
