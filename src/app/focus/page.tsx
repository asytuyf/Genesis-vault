"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  Terminal, Play, Pause, RotateCcw, Coffee, Zap,
  ExternalLink, Youtube, Volume2, VolumeX, Plus, X,
  Settings, ChevronDown, ChevronUp
} from "lucide-react";

const DEFAULT_LINKS = [
  { name: "GitHub", url: "https://github.com", color: "text-white" },
  { name: "Stack Overflow", url: "https://stackoverflow.com", color: "text-orange-400" },
  { name: "MDN Docs", url: "https://developer.mozilla.org", color: "text-blue-400" },
  { name: "ChatGPT", url: "https://chat.openai.com", color: "text-emerald-400" },
];

const FOCUS_PLAYLISTS = [
  { name: "Lo-Fi Beats", id: "jfKfPfyJRdk" }, // lofi girl
  { name: "Synthwave", id: "4xDzrJKXOOY" },
  { name: "Deep Focus", id: "lTRiuFIWV54" },
  { name: "Coding Music", id: "M5QY2_8704o" },
];

export default function FocusPage() {
  // Timer state
  const [mode, setMode] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState(FOCUS_PLAYLISTS[0]);
  const [isMuted, setIsMuted] = useState(false);
  const [links, setLinks] = useState(DEFAULT_LINKS);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [showAddLink, setShowAddLink] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load saved data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedLinks = localStorage.getItem("focus_links");
      const savedSessions = localStorage.getItem("focus_sessions");
      const savedWork = localStorage.getItem("focus_work_duration");
      const savedBreak = localStorage.getItem("focus_break_duration");

      if (savedLinks) setLinks(JSON.parse(savedLinks));
      if (savedSessions) setSessions(parseInt(savedSessions));
      if (savedWork) {
        setWorkDuration(parseInt(savedWork));
        setTimeLeft(parseInt(savedWork) * 60);
      }
      if (savedBreak) setBreakDuration(parseInt(savedBreak));
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer finished
      playNotification();
      if (mode === "work") {
        setSessions((s) => {
          const newSessions = s + 1;
          localStorage.setItem("focus_sessions", String(newSessions));
          return newSessions;
        });
        setMode("break");
        setTimeLeft(breakDuration * 60);
      } else {
        setMode("work");
        setTimeLeft(workDuration * 60);
      }
      setIsRunning(false);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, mode, workDuration, breakDuration]);

  const playNotification = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(mode === "work" ? "Break time!" : "Back to work!", {
          body: mode === "work" ? "Great session! Take a break." : "Let's get back to it.",
          icon: "/favicon.ico"
        });
      }
    }
    // Play beep sound
    const audio = new Audio("data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU");
    audio.play().catch(() => {});
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? workDuration * 60 : breakDuration * 60);
  };

  const toggleMode = () => {
    setIsRunning(false);
    if (mode === "work") {
      setMode("break");
      setTimeLeft(breakDuration * 60);
    } else {
      setMode("work");
      setTimeLeft(workDuration * 60);
    }
  };

  const saveSettings = () => {
    localStorage.setItem("focus_work_duration", String(workDuration));
    localStorage.setItem("focus_break_duration", String(breakDuration));
    setTimeLeft(mode === "work" ? workDuration * 60 : breakDuration * 60);
    setShowSettings(false);
  };

  const addLink = () => {
    if (newLinkName && newLinkUrl) {
      const newLinks = [...links, { name: newLinkName, url: newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`, color: "text-purple-400" }];
      setLinks(newLinks);
      localStorage.setItem("focus_links", JSON.stringify(newLinks));
      setNewLinkName("");
      setNewLinkUrl("");
      setShowAddLink(false);
    }
  };

  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    setLinks(newLinks);
    localStorage.setItem("focus_links", JSON.stringify(newLinks));
  };

  const progress = mode === "work"
    ? ((workDuration * 60 - timeLeft) / (workDuration * 60)) * 100
    : ((breakDuration * 60 - timeLeft) / (breakDuration * 60)) * 100;

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-x-hidden px-6 pb-6 pt-[56px] md:p-24">
      {/* HAZARD BARS */}
      <div className="fixed inset-x-0 top-0 h-[28px] bg-purple-500 z-[150] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] bg-purple-500 z-[150] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>

      {/* BIG BACKGROUND SYMBOL */}
      <div className="fixed inset-0 z-0 opacity-[0.02] flex items-center justify-center pointer-events-none">
        <Zap size={800} strokeWidth={0.5} />
      </div>

      <header className="relative z-10 mb-12">
        <div className="flex flex-col mb-8">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">FOCUS</h1>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-800 uppercase leading-[0.8]">_MODE.</h1>
        </div>
        <div className="flex items-center gap-4 text-zinc-600 text-xs font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-purple-400" />
            <span>{sessions} sessions completed today</span>
          </div>
        </div>
      </header>

      <div className="relative z-10 grid gap-8 lg:grid-cols-3">
        {/* MAIN TIMER */}
        <div className="lg:col-span-2">
          <div className="bg-[#0a0a0a] border border-zinc-900 p-8 md:p-12 relative overflow-hidden">
            {/* Progress bar background */}
            <div className="absolute inset-0 opacity-10">
              <div
                className={`h-full transition-all duration-1000 ${mode === "work" ? "bg-purple-500" : "bg-emerald-500"}`}
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Mode indicator */}
            <div className="relative flex items-center justify-between mb-8">
              <button
                onClick={toggleMode}
                className={`flex items-center gap-2 px-4 py-2 border transition-all ${
                  mode === "work"
                    ? "border-purple-500/30 bg-purple-500/10 text-purple-400"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {mode === "work" ? <Zap size={16} /> : <Coffee size={16} />}
                <span className="text-xs font-black uppercase tracking-wider">
                  {mode === "work" ? "WORK_SESSION" : "BREAK_TIME"}
                </span>
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-zinc-600 hover:text-purple-400 transition-colors"
              >
                <Settings size={20} />
              </button>
            </div>

            {/* Settings panel */}
            {showSettings && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="relative mb-8 p-4 border border-zinc-800 bg-black/50"
              >
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2">Work (min)</label>
                    <input
                      type="number"
                      value={workDuration}
                      onChange={(e) => setWorkDuration(Math.max(1, parseInt(e.target.value) || 25))}
                      className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-purple-400 outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-2">Break (min)</label>
                    <input
                      type="number"
                      value={breakDuration}
                      onChange={(e) => setBreakDuration(Math.max(1, parseInt(e.target.value) || 5))}
                      className="w-full bg-black border border-zinc-800 px-3 py-2 text-sm text-emerald-400 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
                <button
                  onClick={saveSettings}
                  className="w-full py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-black uppercase tracking-wider hover:bg-purple-500/20 transition-colors"
                >
                  Save Settings
                </button>
              </motion.div>
            )}

            {/* Timer display */}
            <div className="relative text-center mb-8">
              <div className={`text-[80px] md:text-[140px] font-black tracking-tighter leading-none ${
                mode === "work" ? "text-purple-400" : "text-emerald-400"
              } ${isRunning ? "animate-pulse" : ""}`}>
                {formatTime(timeLeft)}
              </div>
              <div className="text-zinc-600 text-xs font-black uppercase tracking-[0.3em] mt-2">
                {isRunning ? "// RUNNING //" : "// PAUSED //"}
              </div>
            </div>

            {/* Controls */}
            <div className="relative flex items-center justify-center gap-4">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`flex items-center justify-center w-16 h-16 border-2 transition-all ${
                  mode === "work"
                    ? "border-purple-500 text-purple-400 hover:bg-purple-500/20"
                    : "border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                {isRunning ? <Pause size={28} /> : <Play size={28} />}
              </button>
              <button
                onClick={resetTimer}
                className="flex items-center justify-center w-12 h-12 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-600 transition-all"
              >
                <RotateCcw size={20} />
              </button>
            </div>
          </div>

          {/* FOCUS MUSIC */}
          <div className="mt-6 bg-[#0a0a0a] border border-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-purple-400">
                <Youtube size={18} />
                <span className="text-xs font-black uppercase tracking-wider">Focus_Music</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-2 text-zinc-600 hover:text-purple-400 transition-colors"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button
                  onClick={() => setShowVideo(!showVideo)}
                  className="p-2 text-zinc-600 hover:text-purple-400 transition-colors"
                >
                  {showVideo ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
            </div>

            {/* Playlist selector */}
            <div className="flex flex-wrap gap-2 mb-4">
              {FOCUS_PLAYLISTS.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => setCurrentPlaylist(pl)}
                  className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border transition-all ${
                    currentPlaylist.id === pl.id
                      ? "border-purple-500/50 bg-purple-500/10 text-purple-400"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  }`}
                >
                  {pl.name}
                </button>
              ))}
            </div>

            {/* YouTube embed */}
            {showVideo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="aspect-video bg-black border border-zinc-800 overflow-hidden"
              >
                <iframe
                  width="100%"
                  height="100%"
                  src={`https://www.youtube.com/embed/${currentPlaylist.id}?autoplay=1&mute=${isMuted ? 1 : 0}`}
                  title="Focus Music"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </motion.div>
            )}
          </div>
        </div>

        {/* QUICK LINKS */}
        <div className="lg:col-span-1">
          <div className="bg-[#0a0a0a] border border-zinc-900 p-6 sticky top-20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2 text-purple-400">
                <ExternalLink size={18} />
                <span className="text-xs font-black uppercase tracking-wider">Quick_Links</span>
              </div>
              <button
                onClick={() => setShowAddLink(!showAddLink)}
                className="p-1.5 text-zinc-600 hover:text-purple-400 transition-colors border border-zinc-800 hover:border-purple-500/30"
              >
                <Plus size={14} />
              </button>
            </div>

            {/* Add link form */}
            {showAddLink && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mb-4 p-3 border border-zinc-800 bg-black/50"
              >
                <input
                  type="text"
                  placeholder="Name"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-800 px-0 py-2 text-xs text-white outline-none focus:border-purple-500 mb-2"
                />
                <input
                  type="text"
                  placeholder="URL"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="w-full bg-transparent border-b border-zinc-800 px-0 py-2 text-xs text-white outline-none focus:border-purple-500 mb-3"
                />
                <button
                  onClick={addLink}
                  className="w-full py-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-black uppercase tracking-wider hover:bg-purple-500/20 transition-colors"
                >
                  Add Link
                </button>
              </motion.div>
            )}

            {/* Links list */}
            <div className="space-y-2">
              {links.map((link, i) => (
                <div key={i} className="group flex items-center gap-3 p-3 border border-zinc-900 hover:border-purple-500/30 transition-all bg-black/30">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-1 text-sm font-bold ${link.color} hover:text-purple-300 transition-colors truncate`}
                  >
                    {link.name}
                  </a>
                  <button
                    onClick={() => removeLink(i)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-600 hover:text-red-400 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Session stats */}
            <div className="mt-8 pt-6 border-t border-zinc-900">
              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-4">Session_Stats</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border border-zinc-900 bg-black/30 text-center">
                  <div className="text-2xl font-black text-purple-400">{sessions}</div>
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mt-1">Today</div>
                </div>
                <div className="p-4 border border-zinc-900 bg-black/30 text-center">
                  <div className="text-2xl font-black text-emerald-400">{sessions * workDuration}</div>
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider mt-1">Minutes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
