"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal, Play, Pause, RotateCcw, Coffee, Zap,
  Youtube, Volume2, VolumeX, Eye, EyeOff, Settings
} from "lucide-react";

export default function FocusPage() {
  // Timer state
  const [mode, setMode] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [showVideo, setShowVideo] = useState(false); // false = audio only, true = video visible
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string) => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return "";
  };

  // Load saved data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSessions = localStorage.getItem("focus_sessions_today");
      const savedDate = localStorage.getItem("focus_sessions_date");
      const savedWork = localStorage.getItem("focus_work_duration");
      const savedBreak = localStorage.getItem("focus_break_duration");
      const savedYoutube = localStorage.getItem("focus_youtube_url");

      const today = new Date().toDateString();
      if (savedDate === today && savedSessions) {
        setSessions(parseInt(savedSessions));
      }

      if (savedWork) {
        setWorkDuration(parseInt(savedWork));
        setTimeLeft(parseInt(savedWork) * 60);
      }
      if (savedBreak) setBreakDuration(parseInt(savedBreak));
      if (savedYoutube) {
        setYoutubeUrl(savedYoutube);
        setVideoId(extractVideoId(savedYoutube));
      }

      // Request notification permission
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      // Timer finished
      playNotification();
      if (mode === "work") {
        const newSessions = sessions + 1;
        setSessions(newSessions);
        localStorage.setItem("focus_sessions_today", String(newSessions));
        localStorage.setItem("focus_sessions_date", new Date().toDateString());
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
  }, [isRunning, timeLeft, mode, workDuration, breakDuration, sessions]);

  const playNotification = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification(mode === "work" ? "Break Time" : "Back to Work", {
          body: mode === "work" ? "Great session. Take a break." : "Let's focus.",
          icon: "/favicon.ico"
        });
      }
    }
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

  const handleYoutubeSubmit = () => {
    const id = extractVideoId(youtubeUrl);
    setVideoId(id);
    if (id) {
      localStorage.setItem("focus_youtube_url", youtubeUrl);
      setIsPlaying(true);
    }
  };

  const saveSettings = () => {
    localStorage.setItem("focus_work_duration", String(workDuration));
    localStorage.setItem("focus_break_duration", String(breakDuration));
    if (!isRunning) {
      setTimeLeft(mode === "work" ? workDuration * 60 : breakDuration * 60);
    }
    setShowSettings(false);
  };

  const progress = mode === "work"
    ? ((workDuration * 60 - timeLeft) / (workDuration * 60)) * 100
    : ((breakDuration * 60 - timeLeft) / (breakDuration * 60)) * 100;

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-hidden">
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

      {/* CINEMATIC BACKGROUND */}
      <div className="fixed inset-0 z-0">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-950/20 via-transparent to-purple-950/30" />

        {/* Animated glow */}
        <motion.div
          animate={{
            opacity: [0.03, 0.06, 0.03],
            scale: [1, 1.1, 1],
          }}
          transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <Zap size={900} strokeWidth={0.3} className="text-purple-500" />
        </motion.div>

        {/* Scan lines */}
        <div className="absolute inset-0 opacity-[0.015] pointer-events-none" style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)"
        }} />
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20">

        {/* SESSION COUNTER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 px-6 py-3 border border-purple-500/20 bg-purple-500/5 backdrop-blur-sm">
            <Zap size={16} className="text-purple-400" />
            <span className="text-xs font-black uppercase tracking-[0.3em] text-purple-300">
              {sessions} {sessions === 1 ? "session" : "sessions"} today
            </span>
          </div>
        </motion.div>

        {/* MODE TOGGLE */}
        <motion.button
          onClick={toggleMode}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`mb-12 flex items-center gap-3 px-8 py-4 border-2 transition-all ${
            mode === "work"
              ? "border-purple-500/50 bg-purple-500/10 text-purple-300"
              : "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {mode === "work" ? <Zap size={20} /> : <Coffee size={20} />}
          <span className="text-sm font-black uppercase tracking-[0.2em]">
            {mode === "work" ? "Deep Work" : "Break Time"}
          </span>
        </motion.button>

        {/* TIMER */}
        <div className="relative mb-12">
          {/* Progress ring effect */}
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={mode === "work" ? "rgba(168, 85, 247, 0.1)" : "rgba(16, 185, 129, 0.1)"}
              strokeWidth="2"
            />
            <circle
              cx="100"
              cy="100"
              r="90"
              fill="none"
              stroke={mode === "work" ? "rgba(168, 85, 247, 0.5)" : "rgba(16, 185, 129, 0.5)"}
              strokeWidth="2"
              strokeDasharray={565}
              strokeDashoffset={565 - (565 * progress) / 100}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>

          <motion.div
            animate={isRunning ? { opacity: [1, 0.7, 1] } : { opacity: 1 }}
            transition={isRunning ? { repeat: Infinity, duration: 2 } : {}}
            className={`relative text-[100px] md:text-[160px] font-black tracking-tighter leading-none ${
              mode === "work" ? "text-purple-400" : "text-emerald-400"
            }`}
            style={{ textShadow: mode === "work" ? "0 0 60px rgba(168, 85, 247, 0.3)" : "0 0 60px rgba(16, 185, 129, 0.3)" }}
          >
            {formatTime(timeLeft)}
          </motion.div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-6 mb-16">
          <motion.button
            onClick={() => setIsRunning(!isRunning)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center justify-center w-20 h-20 border-2 transition-all ${
              mode === "work"
                ? "border-purple-500 text-purple-400 hover:bg-purple-500/20"
                : "border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            {isRunning ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
          </motion.button>

          <motion.button
            onClick={resetTimer}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-14 h-14 border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition-all"
          >
            <RotateCcw size={22} />
          </motion.button>

          <motion.button
            onClick={() => setShowSettings(!showSettings)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-14 h-14 border border-zinc-700 text-zinc-500 hover:text-purple-400 hover:border-purple-500/50 transition-all"
          >
            <Settings size={22} />
          </motion.button>
        </div>

        {/* SETTINGS PANEL */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, y: 20, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 20, height: 0 }}
              className="w-full max-w-md mb-12 overflow-hidden"
            >
              <div className="p-6 border border-zinc-800 bg-black/60 backdrop-blur-sm">
                <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500 mb-4">Timer Settings</div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Work (min)</label>
                    <input
                      type="number"
                      value={workDuration}
                      onChange={(e) => setWorkDuration(Math.max(1, parseInt(e.target.value) || 25))}
                      className="w-full bg-black border border-zinc-800 px-4 py-3 text-lg text-purple-400 font-bold outline-none focus:border-purple-500 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Break (min)</label>
                    <input
                      type="number"
                      value={breakDuration}
                      onChange={(e) => setBreakDuration(Math.max(1, parseInt(e.target.value) || 5))}
                      className="w-full bg-black border border-zinc-800 px-4 py-3 text-lg text-emerald-400 font-bold outline-none focus:border-emerald-500 text-center"
                    />
                  </div>
                </div>
                <button
                  onClick={saveSettings}
                  className="w-full py-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-black uppercase tracking-wider hover:bg-purple-500/20 transition-colors"
                >
                  Save
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* YOUTUBE PLAYER */}
        <div className="w-full max-w-2xl">
          <div className="p-6 border border-zinc-800 bg-black/40 backdrop-blur-sm">
            <div className="flex items-center gap-3 mb-6">
              <Youtube size={20} className="text-purple-400" />
              <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Focus Music</span>
            </div>

            {/* URL Input */}
            <div className="flex gap-3 mb-6">
              <input
                type="text"
                placeholder="Paste YouTube URL or video ID..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleYoutubeSubmit()}
                className="flex-1 bg-black border border-zinc-800 px-4 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-700"
              />
              <button
                onClick={handleYoutubeSubmit}
                className="px-6 py-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-black uppercase tracking-wider hover:bg-purple-500/20 transition-colors"
              >
                Load
              </button>
            </div>

            {/* Video Player */}
            {videoId && (
              <div className="space-y-4">
                {/* Controls */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowVideo(!showVideo)}
                    className={`flex items-center gap-2 px-4 py-2 border text-xs font-black uppercase tracking-wider transition-all ${
                      showVideo
                        ? "border-purple-500/50 text-purple-400 bg-purple-500/10"
                        : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    }`}
                  >
                    {showVideo ? <Eye size={14} /> : <EyeOff size={14} />}
                    {showVideo ? "Watching" : "Audio Only"}
                  </button>

                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="flex items-center gap-2 px-4 py-2 border border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700 text-xs font-black uppercase tracking-wider transition-all"
                  >
                    {isPlaying ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    {isPlaying ? "Stop" : "Play"}
                  </button>
                </div>

                {/* Iframe */}
                <AnimatePresence>
                  {isPlaying && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: showVideo ? "auto" : 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className={`aspect-video border border-zinc-800 ${!showVideo ? "h-0 overflow-hidden" : ""}`}>
                        <iframe
                          width="100%"
                          height="100%"
                          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`}
                          title="Focus Music"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Hidden iframe for audio-only mode */}
                {isPlaying && !showVideo && (
                  <div className="h-0 overflow-hidden">
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}`}
                      title="Focus Music Audio"
                      allow="autoplay"
                    />
                  </div>
                )}
              </div>
            )}

            {!videoId && (
              <div className="text-center py-8 text-zinc-700">
                <Youtube size={48} className="mx-auto mb-4 opacity-30" />
                <p className="text-xs font-bold uppercase tracking-wider">Paste a YouTube link to add focus music</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
