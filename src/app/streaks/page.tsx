"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, GitCommit, Plus, X, Check, Target, TrendingUp, RefreshCw, ExternalLink, Bookmark, Globe
} from "lucide-react";
import {
  type Habit, type HabitOp,
  applyHabitOps, getStreak, todayLocal, weekDays as buildWeekDays,
} from "@/lib/habits";
import { type TrackerLink, type LinkOp, applyLinkOps, hostOf, safeUrl } from "@/lib/links";
import { useOpSync, type SyncState } from "@/lib/useOpSync";

const FREQUENCIES = [
  { value: 1, label: "Daily" },
  { value: 2, label: "Every 2 days" },
  { value: 3, label: "Every 3 days" },
  { value: 7, label: "Weekly" },
];

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

const LinkIcon = ({ url }: { url: string }) => {
  const [failed, setFailed] = useState(false);
  const host = hostOf(url);
  if (failed || !host) return <Globe size={16} className="text-zinc-600" />;
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`}
      alt=""
      className="w-5 h-5 object-contain"
      onError={() => setFailed(true)}
      draggable="false"
    />
  );
};

const SYNC_LABEL: Record<SyncState, { text: string; cls: string }> = {
  synced: { text: "● SYNCED", cls: "text-emerald-600" },
  syncing: { text: "◌ SYNCING", cls: "text-orange-400 animate-pulse" },
  unsaved: { text: "○ QUEUED", cls: "text-zinc-500" },
  error: { text: "! UNSENT_KEPT_ON_DEVICE", cls: "text-red-400" },
};

export default function TrackerPage() {
  const [adminMode, setAdminMode] = useState(false);
  const [password, setPassword] = useState("");

  // Habits save themselves in the background, one change at a time.
  const {
    items: habits,
    loading: loadingHabits,
    syncState,
    queueOps,
    retrySync,
    refresh: refreshHabits,
  } = useOpSync<Habit, HabitOp>({
    endpoint: "/api/habits",
    apply: applyHabitOps,
    resultKey: "habits",
    password,
  });

  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitColor, setNewHabitColor] = useState("orange");
  const [newHabitFrequency, setNewHabitFrequency] = useState(1);
  const [githubUsername, setGithubUsername] = useState("asytuyf");
  const [githubData, setGithubData] = useState<Record<string, number>>({});
  const [githubEvents, setGithubEvents] = useState<any[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [showGithubInput, setShowGithubInput] = useState(false);
  const [githubFetchedAt, setGithubFetchedAt] = useState("");
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkNote, setNewLinkNote] = useState("");
  const [linkError, setLinkError] = useState("");
  const [confirmLinkId, setConfirmLinkId] = useState<string | null>(null);

  // Pinned links live on the server too, so they follow you between devices.
  const { items: links, syncState: linkSync, queueOps: queueLinkOps } = useOpSync<TrackerLink, LinkOp>({
    endpoint: "/api/links",
    apply: applyLinkOps,
    resultKey: "links",
    password,
  });

  // Listen for admin mode and password changes
  useEffect(() => {
    const checkAdmin = () => {
      const stored = localStorage.getItem("goals_admin_mode");
      const storedPassword = localStorage.getItem("goals_admin_key") || "";
      setAdminMode(stored === "1");
      setPassword(storedPassword);
    };
    checkAdmin();

    const keyHandler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string") setPassword(detail);
    };
    const modeHandler = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setAdminMode(Boolean(detail));
    };

    window.addEventListener("goals-admin-mode", modeHandler);
    window.addEventListener("goals-admin-key", keyHandler);
    window.addEventListener("storage", checkAdmin);
    return () => {
      window.removeEventListener("goals-admin-mode", modeHandler);
      window.removeEventListener("goals-admin-key", keyHandler);
      window.removeEventListener("storage", checkAdmin);
    };
  }, []);

  // Daily contribution counts come from our own route, which reads the same
  // calendar as a GitHub profile, so private work counts too. The public events
  // feed is kept only to list what happened on a day you tap.
  const loadGithub = useCallback(async (username: string, closeInput = false) => {
    if (!username) return;
    setLoadingGithub(true);
    try {
      const res = await fetch(`/api/github?user=${encodeURIComponent(username)}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.days === "object") {
          setGithubData(data.days as Record<string, number>);
          setGithubFetchedAt(typeof data.fetchedAt === "string" ? data.fetchedAt : "");
        }
      }
      localStorage.setItem("streaks_github_username", username);
    } catch (e) {
      console.error("Failed to load contributions:", e);
    }
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`);
      const events = await res.json();
      if (Array.isArray(events)) setGithubEvents(events);
    } catch {
      // The detail list is a nice extra, not worth failing the page over.
    }
    setLoadingGithub(false);
    if (closeInput) setShowGithubInput(false);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("streaks_github_username") || "asytuyf";
    setGithubUsername(saved);
    loadGithub(saved);
  }, [loadGithub]);

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      color: newHabitColor,
      history: [],
      frequency: newHabitFrequency,
    };
    queueOps([{ type: "add", habit: newHabit }]);
    setNewHabitName("");
    setNewHabitColor("orange");
    setNewHabitFrequency(1);
    setShowAddHabit(false);
  };

  const getEventsForDay = (date: string) => {
    return githubEvents.filter((e: any) => e.created_at?.startsWith(date));
  };

  const formatEventType = (type: string) => {
    return type.replace(/Event$/, "").replace(/([A-Z])/g, " $1").trim();
  };

  const removeHabit = (id: string) => {
    queueOps([{ type: "remove", id }]);
  };

  const toggleHabitForDate = (habitId: string, date: string) => {
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;
    // State what the day should become rather than flipping it, so a resend
    // after a dropped connection cannot undo the tick.
    queueOps([{ type: "set", id: habitId, date, done: !habit.history.includes(date) }]);
  };

  const addLink = () => {
    const url = safeUrl(newLinkUrl);
    if (!url) {
      setLinkError("That does not look like a web address.");
      return;
    }
    const note = newLinkNote.trim();
    queueLinkOps([
      {
        type: "add",
        link: {
          id: Date.now().toString(),
          title: newLinkTitle.trim() || hostOf(url),
          url,
          ...(note ? { note } : {}),
        },
      },
    ]);
    setNewLinkTitle("");
    setNewLinkUrl("");
    setNewLinkNote("");
    setLinkError("");
    setShowAddLink(false);
  };

  const removeLink = (id: string) => {
    queueLinkOps([{ type: "remove", id }]);
    setConfirmLinkId(null);
  };

  const weekDays = buildWeekDays();
  const today = todayLocal();
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
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">GEMINI</h1>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-800 uppercase leading-[0.8]">_TRACKER.</h1>
          </div>
        </header>

        {/* GITHUB WEEKLY */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <GitCommit size={20} className="text-orange-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Commits This Week</span>
              {githubUsername && (
                <span className="text-[10px] text-zinc-600">@{githubUsername}</span>
              )}
              {githubFetchedAt && (
                <span className="text-[9px] text-zinc-700 uppercase tracking-wider hidden sm:inline">
                  read {new Date(githubFetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Always visible refresh button */}
              <button
                onClick={() => loadGithub(githubUsername)}
                disabled={loadingGithub}
                className={`flex items-center gap-2 px-3 py-1.5 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase hover:border-orange-500/30 hover:text-orange-400 transition-colors ${loadingGithub ? "opacity-50" : ""}`}
              >
                <RefreshCw size={12} className={loadingGithub ? "animate-spin" : ""} />
                {loadingGithub ? "..." : "Refresh"}
              </button>
              {adminMode && (
                <button
                  onClick={() => setShowGithubInput(!showGithubInput)}
                  className="p-2 text-zinc-600 hover:text-orange-400 transition-colors"
                  title="Change username"
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
          </div>

          {/* GitHub Username Input */}
          <AnimatePresence>
            {showGithubInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 p-4 border border-zinc-800 bg-black/60 overflow-hidden"
              >
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="GitHub username"
                    value={githubUsername}
                    onChange={(e) => setGithubUsername(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadGithub(githubUsername, true)}
                    className="flex-1 bg-black border border-zinc-800 px-4 py-2 text-sm text-white outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={() => loadGithub(githubUsername, true)}
                    disabled={loadingGithub}
                    className="px-6 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase hover:bg-orange-500/20 disabled:opacity-50"
                  >
                    {loadingGithub ? "..." : "Sync"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                      <div className="text-[8px] text-zinc-600 uppercase mt-1">contribs</div>
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
                      getEventsForDay(selectedDay).map((event: any, i: number) => {
                        const repoName = event.repo?.name;
                        const baseUrl = repoName ? `https://github.com/${repoName}` : "#";

                        // Handle PushEvent to show individual commits
                        if (event.type === "PushEvent" && event.payload && event.payload.commits && event.payload.commits.length > 0) {
                          return event.payload.commits.map((commit: any, commitIndex: number) => {
                            const commitUrl = repoName ? `https://github.com/${repoName}/commit/${commit.sha}` : "#";
                            return (
                              <a
                                key={`${i}-commit-${commitIndex}`}
                                href={commitUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 p-2 border border-zinc-900 bg-black/40 hover:bg-zinc-800 transition-colors cursor-pointer group"
                              >
                                <GitCommit size={14} className="text-orange-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold text-zinc-300 truncate group-hover:text-white">{repoName}</div>
                                  <div className="text-[10px] text-zinc-600 truncate">{commit.message}</div>
                                </div>
                                <ExternalLink size={12} className="text-zinc-500 group-hover:text-orange-400" />
                              </a>
                            );
                          });
                        } else {
                          // Handle other event types
                          let eventUrl = baseUrl;
                          if (event.type === "PushEvent" && event.payload?.head) {
                             eventUrl = repoName ? `https://github.com/${repoName}/commit/${event.payload.head}` : baseUrl;
                          } else if (event.payload?.pull_request?.html_url) {
                              eventUrl = event.payload.pull_request.html_url;
                          } else if (event.payload?.issue?.html_url) {
                              eventUrl = event.payload.issue.html_url;
                          } else if (event.payload?.release?.html_url) {
                               eventUrl = event.payload.release.html_url;
                          }

                          return (
                            <a
                              key={i}
                              href={eventUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 p-2 border border-zinc-900 bg-black/40 hover:bg-zinc-800 transition-colors cursor-pointer group"
                            >
                              <GitCommit size={14} className="text-orange-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-zinc-300 truncate group-hover:text-white">{repoName}</div>
                                <div className="text-[10px] text-zinc-600">{formatEventType(event.type)}</div>
                              </div>
                              {eventUrl && <ExternalLink size={12} className="text-zinc-500 group-hover:text-orange-400" />}
                            </a>
                          );
                        }
                      })
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

        {/* HABITS */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Target size={20} className="text-orange-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Habits</span>
              {adminMode && (
                <span className={`text-[10px] font-bold ${SYNC_LABEL[syncState].cls}`}>
                  {SYNC_LABEL[syncState].text}
                </span>
              )}
              {adminMode && syncState === "error" && (
                <button onClick={retrySync} className="text-[10px] text-red-400 underline underline-offset-2">
                  Retry now
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Refresh habits */}
              <button
                onClick={() => refreshHabits()}
                disabled={loadingHabits}
                className={`flex items-center gap-2 px-3 py-1.5 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase hover:border-orange-500/30 hover:text-orange-400 transition-colors ${loadingHabits ? "opacity-50" : ""}`}
              >
                <RefreshCw size={12} className={loadingHabits ? "animate-spin" : ""} />
                {loadingHabits ? "..." : "Refresh"}
              </button>
              {adminMode && (
                <button
                  onClick={() => setShowAddHabit(!showAddHabit)}
                  className="flex items-center gap-2 px-4 py-2 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/10 transition-colors"
                >
                  <Plus size={14} />
                  Add
                </button>
              )}
            </div>
          </div>

          {/* View-only notice */}
          {!adminMode && habits.length > 0 && (
            <div className="mb-4 px-3 py-2 border border-zinc-800 bg-zinc-900/30 text-[10px] text-zinc-500 uppercase tracking-wider">
              View only — enable admin mode to edit
            </div>
          )}

          {/* Add Habit Form */}
          <AnimatePresence>
            {showAddHabit && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 md:p-6 border border-zinc-800 bg-black/60 backdrop-blur-sm overflow-hidden"
              >
                <input
                  type="text"
                  placeholder="New habit name..."
                  value={newHabitName}
                  onChange={(e) => setNewHabitName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addHabit()}
                  className="w-full bg-transparent border-b-2 border-zinc-800 px-0 py-3 text-base md:text-lg text-white outline-none focus:border-orange-500 mb-4 md:mb-6 placeholder:text-zinc-700"
                />

                {/* Color Picker */}
                <div className="mb-4 md:mb-6">
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-3">Color</div>
                  <div className="flex gap-2 flex-wrap">
                    {HABIT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewHabitColor(color.value)}
                        className={`w-7 h-7 md:w-8 md:h-8 rounded-full ${color.bg} transition-all ${
                          newHabitColor === color.value
                            ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110"
                            : "opacity-50 hover:opacity-100"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Frequency Picker */}
                <div className="mb-4 md:mb-6">
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-3">Frequency</div>
                  <div className="grid grid-cols-2 sm:flex gap-2">
                    {FREQUENCIES.map((freq) => (
                      <button
                        key={freq.value}
                        onClick={() => setNewHabitFrequency(freq.value)}
                        className={`px-3 md:px-4 py-2 border text-[10px] md:text-xs font-bold uppercase transition-all ${
                          newHabitFrequency === freq.value
                            ? `${getHabitColor(newHabitColor, "border")} ${getHabitColor(newHabitColor, "text")} bg-opacity-20`
                            : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                        }`}
                      >
                        {freq.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
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
          </AnimatePresence>

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
                  className={`p-4 md:p-6 border transition-all ${
                    completedToday ? "border-zinc-700 bg-zinc-900/50" : "border-zinc-800 bg-black/40"
                  }`}
                >
                  {/* Mobile: stack vertically, Desktop: horizontal */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 shrink-0 rounded-full ${completedToday ? getHabitColor(color, "bg") : "bg-zinc-700"}`} />
                      <span className="text-base md:text-lg font-bold text-white truncate">{habit.name}</span>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-3">
                      <div className="flex items-center gap-2">
                        <Flame size={14} className={getHabitColor(color, "text")} />
                        <span className={`text-base md:text-lg font-black ${getHabitColor(color, "text")}`}>{streak}</span>
                        <span className="text-[10px] text-zinc-500 uppercase hidden sm:inline">streak</span>
                      </div>
                      <span className="text-[9px] md:text-[10px] text-zinc-600 uppercase px-2 py-1 border border-zinc-800">
                        {FREQUENCIES.find(f => f.value === (habit.frequency || 1))?.label || "Daily"}
                      </span>
                      {adminMode && (
                        <button
                          onClick={() => removeHabit(habit.id)}
                          className="p-1.5 text-zinc-700 hover:text-red-400 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Week checkboxes - smaller on mobile */}
                  <div className="grid grid-cols-7 gap-1 md:gap-2">
                    {weekDays.map((day) => {
                      const isCompleted = habit.history.includes(day.date);
                      return (
                        <button
                          key={day.date}
                          onClick={() => toggleHabitForDate(habit.id, day.date)}
                          disabled={!adminMode}
                          className={`p-2 md:p-3 border text-center transition-all ${
                            isCompleted
                              ? `${getHabitColor(color, "border")} ${getHabitColor(color, "bg")} text-black`
                              : "border-zinc-800 text-zinc-600 hover:border-zinc-700"
                          } ${!adminMode ? "cursor-default opacity-80" : ""}`}
                        >
                          <div className={`text-[8px] md:text-[9px] font-bold uppercase mb-0.5 md:mb-1 ${isCompleted ? "text-black" : ""}`}>{day.dayName}</div>
                          {isCompleted ? (
                            <Check size={14} className="mx-auto md:w-[18px] md:h-[18px]" />
                          ) : (
                            <div className="w-[14px] h-[14px] md:w-[18px] md:h-[18px] mx-auto" />
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
                <p className="text-zinc-600 text-sm font-bold uppercase tracking-wider">No habits yet</p>
                {adminMode && (
                  <p className="text-zinc-700 text-xs mt-2">Click &quot;Add&quot; above to create one</p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* STATS */}
        <section className="mb-12">
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
                {habits.length > 0 ? Math.max(...habits.map((h) => getStreak(h))) : 0}
              </div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">Best Streak</div>
            </div>
            <div className="p-6 border border-zinc-900 bg-[#0a0a0a] text-center">
              <div className="text-3xl md:text-4xl font-black text-orange-400">{githubThisWeek}</div>
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">Commits This Week</div>
            </div>
          </div>
        </section>

        {/* LINKS */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <Bookmark size={20} className="text-orange-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Links</span>
              {adminMode && linkSync !== "synced" && (
                <span className={`text-[10px] font-bold ${SYNC_LABEL[linkSync].cls}`}>
                  {SYNC_LABEL[linkSync].text}
                </span>
              )}
            </div>
            {adminMode && (
              <button
                onClick={() => {
                  setShowAddLink(!showAddLink);
                  setLinkError("");
                }}
                className="flex items-center justify-center gap-2 px-4 py-2 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/10 transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
            )}
          </div>

          <AnimatePresence>
            {showAddLink && adminMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 border border-zinc-800 bg-black/60 overflow-hidden"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Name, e.g. Arena"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className="bg-black border border-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500 placeholder:text-zinc-700"
                  />
                  <input
                    type="text"
                    inputMode="url"
                    placeholder="Address, e.g. arena.ai/leaderboard/code"
                    value={newLinkUrl}
                    onChange={(e) => {
                      setNewLinkUrl(e.target.value);
                      if (linkError) setLinkError("");
                    }}
                    onKeyDown={(e) => e.key === "Enter" && addLink()}
                    className="bg-black border border-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500 placeholder:text-zinc-700"
                  />
                  <input
                    type="text"
                    placeholder="What it is for (optional)"
                    value={newLinkNote}
                    onChange={(e) => setNewLinkNote(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addLink()}
                    className="bg-black border border-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-500 placeholder:text-zinc-700 sm:col-span-2"
                  />
                </div>
                {linkError && <div className="mt-3 text-[11px] text-red-400 font-bold">{linkError}</div>}
                <div className="flex flex-col sm:flex-row gap-2 mt-4">
                  <button
                    onClick={addLink}
                    className="flex-1 py-2.5 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/10 transition-colors"
                  >
                    Save link
                  </button>
                  <button
                    onClick={() => setShowAddLink(false)}
                    className="px-6 py-2.5 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {links.length === 0 ? (
            <div className="p-10 border border-dashed border-zinc-900 bg-black/20 text-center">
              <Bookmark size={32} className="mx-auto mb-3 text-zinc-800" />
              <p className="text-zinc-600 text-xs uppercase tracking-wider">Nothing pinned yet</p>
              {adminMode && <p className="text-zinc-700 text-[11px] mt-2 normal-case">Add the pages you check often.</p>}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {links.map((link) => (
                <motion.div key={link.id} layout className="relative group">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 p-4 border border-zinc-900 bg-[#0a0a0a] hover:border-orange-500/40 hover:bg-orange-500/[0.03] transition-colors h-full"
                  >
                    <span className="w-9 h-9 shrink-0 grid place-items-center border border-zinc-800 bg-black">
                      <LinkIcon url={link.url} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-black uppercase tracking-wide text-white truncate group-hover:text-orange-300 transition-colors">
                        {link.title}
                      </span>
                      {link.note && <span className="block text-[11px] text-zinc-600 truncate mt-0.5">{link.note}</span>}
                      <span className="block text-[10px] text-zinc-700 font-mono truncate mt-1.5">{hostOf(link.url)}</span>
                    </span>
                    <ExternalLink
                      size={14}
                      className="text-zinc-800 group-hover:text-orange-400 transition-colors shrink-0 mt-0.5"
                    />
                  </a>
                  {adminMode && (
                    <button
                      onClick={() => (confirmLinkId === link.id ? removeLink(link.id) : setConfirmLinkId(link.id))}
                      onBlur={() => setConfirmLinkId((id) => (id === link.id ? null : id))}
                      title={confirmLinkId === link.id ? "Click again to remove" : "Remove link"}
                      className={`absolute -top-2 -right-2 grid place-items-center transition-all ${
                        confirmLinkId === link.id
                          ? "px-2 h-6 border border-red-500/50 bg-black text-red-400 text-[9px] font-black uppercase"
                          : "h-6 w-6 border border-zinc-800 bg-black text-zinc-700 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-red-400 hover:border-red-500/40"
                      }`}
                    >
                      {confirmLinkId === link.id ? "Remove?" : <X size={12} />}
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}