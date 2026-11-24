"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Flame, GitCommit, Plus, X, Target, TrendingUp, RefreshCw, ExternalLink, Bookmark, Globe,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import {
  type Habit, type HabitOp,
  applyHabitOps, getStreak, todayLocal, weekDays as buildWeekDays, parseLocal,
} from "@/lib/habits";
import { type TrackerLink, type LinkOp, applyLinkOps, hostOf, safeUrl } from "@/lib/links";
import { type TrackerTip, type TipOp, applyTipOps } from "@/lib/tips";
import { useOpSync, type SyncState } from "@/lib/useOpSync";
import ContributionCalendar from "@/components/ContributionCalendar";
import HabitCard, { ColorPicker, TargetPicker } from "@/components/HabitCard";
import TipsBoard from "@/components/TipsBoard";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const LinkIcon = ({ url }: { url: string }) => {
  const [failed, setFailed] = useState(false);
  const host = hostOf(url);
  if (failed || !host) return <Globe size={28} className="text-zinc-600" />;
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`}
      alt=""
      className="w-9 h-9 md:w-10 md:h-10 object-contain"
      onError={() => setFailed(true)}
      draggable="false"
    />
  );
};

/** The parts of a public GitHub event the day list reads. */
interface GhEvent {
  type: string;
  created_at?: string;
  repo?: { name?: string };
  payload?: {
    head?: string;
    commits?: { sha: string; message: string }[];
    pull_request?: { html_url?: string };
    issue?: { html_url?: string };
    release?: { html_url?: string };
  };
}

const SYNC_LABEL: Record<SyncState, { text: string; cls: string }> = {
  synced: { text: "● SYNCED", cls: "text-emerald-600" },
  syncing: { text: "◌ SYNCING", cls: "text-orange-400 animate-pulse" },
  unsaved: { text: "○ QUEUED", cls: "text-zinc-500" },
  error: { text: "! UNSENT_KEPT_ON_DEVICE", cls: "text-red-400" },
  rejected: { text: "! ADMIN_KEY_REJECTED · LOCK, RE-ENTER, UNLOCK", cls: "text-red-400" },
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
    unlocked: adminMode,
  });

  const [showAddHabit, setShowAddHabit] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitColor, setNewHabitColor] = useState("orange");
  const [newHabitTarget, setNewHabitTarget] = useState(7);
  const [weekOffset, setWeekOffset] = useState(0);

  const now = new Date();
  const [githubUsername, setGithubUsername] = useState("asytuyf");
  // Contribution counts per calendar year, fetched as each year is viewed.
  const [githubYears, setGithubYears] = useState<Record<number, Record<string, number>>>({});
  const [githubEvents, setGithubEvents] = useState<GhEvent[]>([]);
  const [ghView, setGhView] = useState<"month" | "year">("month");
  const [ghYear, setGhYear] = useState(now.getFullYear());
  const [ghMonth, setGhMonth] = useState(now.getMonth());
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
    unlocked: adminMode,
  });

  // Things to remember, synced the same way.
  const { items: tips, syncState: tipSync, queueOps: queueTipOps } = useOpSync<TrackerTip, TipOp>({
    endpoint: "/api/tips",
    apply: applyTipOps,
    resultKey: "tips",
    password,
    unlocked: adminMode,
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
  // calendar as a GitHub profile, so private work counts too.
  const loadYear = useCallback(async (username: string, year: number) => {
    if (!username) return;
    setLoadingGithub(true);
    try {
      const res = await fetch(`/api/github?user=${encodeURIComponent(username)}&year=${year}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.days === "object") {
          setGithubYears((prev) => ({ ...prev, [year]: data.days as Record<string, number> }));
          setGithubFetchedAt(typeof data.fetchedAt === "string" ? data.fetchedAt : "");
        }
      }
      localStorage.setItem("streaks_github_username", username);
    } catch (e) {
      console.error("Failed to load contributions:", e);
    }
    setLoadingGithub(false);
  }, []);

  // The public events feed is kept only to list what happened on a day you tap.
  const loadEvents = useCallback(async (username: string) => {
    try {
      const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events/public?per_page=100`);
      const events = await res.json();
      if (Array.isArray(events)) setGithubEvents(events);
    } catch {
      // The detail list is a nice extra, not worth failing the page over.
    }
  }, []);

  const syncUsername = (username: string) => {
    setGithubYears({});
    loadYear(username, ghYear);
    loadEvents(username);
    setShowGithubInput(false);
  };

  useEffect(() => {
    const saved = localStorage.getItem("streaks_github_username") || "asytuyf";
    setGithubUsername(saved);
    loadEvents(saved);
  }, [loadEvents]);

  // Fetch a year the first time it is shown.
  useEffect(() => {
    const user = localStorage.getItem("streaks_github_username") || githubUsername;
    if (user && !githubYears[ghYear]) loadYear(user, ghYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ghYear, loadYear]);

  const addHabit = () => {
    if (!newHabitName.trim()) return;
    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName.trim(),
      color: newHabitColor,
      history: [],
      perWeek: newHabitTarget,
      // Kept for older copies of the app that still read "every X days".
      frequency: newHabitTarget === 7 ? 1 : Math.max(1, Math.round(7 / newHabitTarget)),
    };
    queueOps([{ type: "add", habit: newHabit }]);
    setNewHabitName("");
    setNewHabitColor("orange");
    setNewHabitTarget(7);
    setShowAddHabit(false);
  };

  const getEventsForDay = (date: string) => {
    return githubEvents.filter((e) => e.created_at?.startsWith(date));
  };

  const formatEventType = (type: string) => {
    return type.replace(/Event$/, "").replace(/([A-Z])/g, " $1").trim();
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

  const today = todayLocal();
  const thisWeek = buildWeekDays(0);
  const shownWeek = buildWeekDays(weekOffset);
  const allContribs: Record<string, number> = Object.assign({}, ...Object.values(githubYears));
  const githubThisWeek = thisWeek.reduce((acc, day) => acc + (allContribs[day.date] || 0), 0);

  // What the heatmap is showing, and its totals.
  const yearDays = githubYears[ghYear] || {};
  const monthPrefix = `${ghYear}-${String(ghMonth + 1).padStart(2, "0")}-`;
  const viewDays = ghView === "month"
    ? Object.entries(yearDays).filter(([d]) => d.startsWith(monthPrefix))
    : Object.entries(yearDays).filter(([d]) => d.startsWith(`${ghYear}-`));
  const viewTotal = viewDays.reduce((a, [, n]) => a + n, 0);
  const viewActive = viewDays.filter(([, n]) => n > 0).length;
  const atLatest = ghView === "month"
    ? ghYear === now.getFullYear() && ghMonth === now.getMonth()
    : ghYear === now.getFullYear();

  const stepGithub = (dir: -1 | 1) => {
    setSelectedDay(null);
    if (ghView === "year") {
      setGhYear((y) => Math.min(now.getFullYear(), Math.max(2008, y + dir)));
      return;
    }
    let m = ghMonth + dir;
    let y = ghYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    if (y < 2008 || (y === now.getFullYear() && m > now.getMonth()) || y > now.getFullYear()) return;
    setGhMonth(m);
    setGhYear(y);
  };

  const weekLabel = (() => {
    const first = parseLocal(shownWeek[0].date);
    const last = parseLocal(shownWeek[6].date);
    const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `${fmt(first)} – ${fmt(last)}`;
  })();

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-x-hidden px-4 sm:px-6 pb-6 pt-[56px] md:p-24">
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

        {/* GITHUB CONTRIBUTIONS */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <GitCommit size={20} className="text-orange-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Contributions</span>
              {githubUsername && <span className="text-[10px] text-zinc-500">@{githubUsername}</span>}
              {githubFetchedAt && (
                <span className="text-[9px] text-zinc-700 uppercase tracking-wider hidden sm:inline">
                  read {new Date(githubFetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border border-zinc-800">
                {(["month", "year"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => { setGhView(v); setSelectedDay(null); }}
                    className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-colors ${
                      ghView === v ? "bg-orange-500 text-black" : "text-zinc-500 hover:text-orange-400"
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <button
                onClick={() => { loadYear(githubUsername, ghYear); loadEvents(githubUsername); }}
                disabled={loadingGithub}
                title="Refresh"
                className={`p-2 border border-zinc-800 text-zinc-500 hover:border-orange-500/30 hover:text-orange-400 transition-colors ${loadingGithub ? "opacity-50" : ""}`}
              >
                <RefreshCw size={12} className={loadingGithub ? "animate-spin" : ""} />
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
                    onKeyDown={(e) => e.key === "Enter" && syncUsername(githubUsername)}
                    className="flex-1 min-w-0 bg-black border border-zinc-800 px-4 py-2 text-sm text-white outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={() => syncUsername(githubUsername)}
                    disabled={loadingGithub}
                    className="px-6 py-2 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-black uppercase hover:bg-orange-500/20 disabled:opacity-50"
                  >
                    {loadingGithub ? "..." : "Sync"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="p-4 md:p-6 border border-zinc-800 bg-black/50">
            {/* Period picker */}
            <div className="flex items-center justify-between gap-3 mb-4">
              <button
                onClick={() => stepGithub(-1)}
                className="p-2 border border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="text-center min-w-0">
                <div className="text-sm md:text-base font-black uppercase tracking-wider text-white">
                  {ghView === "month" ? `${MONTH_NAMES[ghMonth]} ${ghYear}` : ghYear}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">
                  <span className="text-orange-400 font-bold">{viewTotal}</span> contributions · {viewActive} active days
                </div>
              </div>
              <button
                onClick={() => stepGithub(1)}
                disabled={atLatest}
                className="p-2 border border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 transition-colors disabled:opacity-20 disabled:pointer-events-none"
                aria-label="Next"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {githubYears[ghYear] || !loadingGithub ? (
              <ContributionCalendar
                days={yearDays}
                view={ghView}
                year={ghYear}
                month={ghMonth}
                today={today}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                onOpenMonth={(m) => { setGhMonth(m); setGhView("month"); setSelectedDay(null); }}
              />
            ) : (
              <div className="py-16 text-center text-[10px] uppercase tracking-widest text-zinc-600 animate-pulse">Reading calendar…</div>
            )}
          </div>

          {/* Selected Day Details */}
          <AnimatePresence>
            {selectedDay && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 border border-t-0 border-zinc-800 bg-black/60 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-bold text-white">
                    {parseLocal(selectedDay).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                    <span className="ml-3 text-orange-400">{allContribs[selectedDay] || 0}</span>
                    <span className="ml-1 text-[10px] text-zinc-500 uppercase">contribs</span>
                  </span>
                  <button onClick={() => setSelectedDay(null)} className="text-zinc-600 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getEventsForDay(selectedDay).length > 0 ? (
                    getEventsForDay(selectedDay).map((event, i) => {
                      const repoName = event.repo?.name;
                      const baseUrl = repoName ? `https://github.com/${repoName}` : "#";

                      // Handle PushEvent to show individual commits
                      if (event.type === "PushEvent" && event.payload && event.payload.commits && event.payload.commits.length > 0) {
                        return event.payload.commits.map((commit, commitIndex) => {
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
                    <div className="text-center py-4 text-zinc-600 text-xs">
                      {(allContribs[selectedDay] || 0) > 0
                        ? "Private work or too long ago to list — the count above still includes it."
                        : "No activity this day"}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* HABITS */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
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
              <button
                onClick={() => refreshHabits()}
                disabled={loadingHabits}
                title="Refresh"
                className={`p-2 border border-zinc-800 text-zinc-500 hover:border-orange-500/30 hover:text-orange-400 transition-colors ${loadingHabits ? "opacity-50" : ""}`}
              >
                <RefreshCw size={12} className={loadingHabits ? "animate-spin" : ""} />
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

          {/* Week picker, Monday to Sunday */}
          <div className="flex items-center justify-between gap-3 mb-4 px-1">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              className="p-2 border border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 transition-colors"
              aria-label="Previous week"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="text-center"
              title="Back to this week"
            >
              <div className="text-sm font-black uppercase tracking-wider text-white">
                {weekOffset === 0 ? "This week" : weekOffset === -1 ? "Last week" : `${-weekOffset} weeks ago`}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mt-0.5">{weekLabel}</div>
            </button>
            <button
              onClick={() => setWeekOffset((w) => Math.min(0, w + 1))}
              disabled={weekOffset === 0}
              className="p-2 border border-zinc-800 text-zinc-400 hover:text-orange-400 hover:border-orange-500/40 transition-colors disabled:opacity-20 disabled:pointer-events-none"
              aria-label="Next week"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* View-only notice */}
          {!adminMode && habits.length > 0 && (
            <div className="mb-4 px-3 py-2 border border-zinc-800 bg-zinc-900/30 text-[10px] text-zinc-500 uppercase tracking-wider">
              View only — unlock in the menu (☰) to tick days or edit
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

                <div className="mb-4 md:mb-6">
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-3">Color</div>
                  <ColorPicker value={newHabitColor} onChange={setNewHabitColor} />
                </div>

                <div className="mb-4 md:mb-6">
                  <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-3">How often</div>
                  <TargetPicker value={newHabitTarget} color={newHabitColor} onChange={setNewHabitTarget} />
                </div>

                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={addHabit}
                    className="flex-1 py-3 border border-orange-500/40 bg-orange-500/10 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/20 transition-colors"
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
            {habits.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                week={shownWeek}
                today={today}
                isThisWeek={weekOffset === 0}
                adminMode={adminMode}
                onToggle={(date) => toggleHabitForDate(habit.id, date)}
                onUpdate={(set) => queueOps([{ type: "update", id: habit.id, set }])}
                onRemove={() => queueOps([{ type: "remove", id: habit.id }])}
              />
            ))}

            {habits.length === 0 && !showAddHabit && (
              <div className="text-center py-16 border border-zinc-800 bg-black/20">
                <Flame size={48} className="mx-auto mb-4 text-zinc-800" />
                <p className="text-zinc-600 text-sm font-bold uppercase tracking-wider">No habits yet</p>
                <p className="text-zinc-700 text-xs mt-2">
                  {adminMode ? <>Tap &quot;Add&quot; above to create one</> : <>Unlock in the menu (☰) to add one</>}
                </p>
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
              <div className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider mt-2">Contribs This Week</div>
            </div>
          </div>
        </section>

        {/* THINGS TO REMEMBER */}
        <TipsBoard
          tips={tips}
          adminMode={adminMode}
          queueOps={queueTipOps}
          syncLabel={
            adminMode && tipSync !== "synced" ? (
              <span className={`text-[10px] font-bold ${SYNC_LABEL[tipSync].cls}`}>{SYNC_LABEL[tipSync].text}</span>
            ) : null
          }
        />

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
                    placeholder="Address, e.g. arena.ai/leaderboard/agent/code"
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
            <div className="grid gap-3 md:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {links.map((link) => (
                <motion.div key={link.id} layout className="relative group">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-stretch border border-zinc-900 bg-[#0a0a0a] hover:border-orange-500/40 hover:bg-orange-500/[0.03] transition-colors h-full min-h-[76px]"
                  >
                    {/* The logo takes the card's full height, flush to its edge. */}
                    <span className="w-[76px] shrink-0 grid place-items-center border-r border-zinc-900 bg-black group-hover:border-orange-500/30 transition-colors">
                      <LinkIcon url={link.url} />
                    </span>
                    <span className="min-w-0 flex-1 px-4 py-3 flex flex-col justify-center">
                      <span className="block text-sm font-black uppercase tracking-wide text-white truncate group-hover:text-orange-300 transition-colors">
                        {link.title}
                      </span>
                      {link.note && <span className="block text-[11px] text-zinc-500 truncate mt-0.5">{link.note}</span>}
                      <span className="block text-[10px] text-zinc-700 font-mono truncate mt-1">{hostOf(link.url)}</span>
                    </span>
                    <ExternalLink
                      size={14}
                      className="text-zinc-800 group-hover:text-orange-400 transition-colors shrink-0 mt-3 mr-3"
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
