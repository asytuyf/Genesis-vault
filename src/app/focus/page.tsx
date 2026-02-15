"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, RotateCcw,
  Youtube, Settings,
  ExternalLink, Plus, X, Sparkles, Layers, Clock,
  Volume2, VolumeX, SkipForward
} from "lucide-react";

interface QuickLink {
  name: string;
  url: string;
}

export default function FocusPage() {
  // Timer state
  const [mode, setMode] = useState<"work" | "break">("work");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [workDuration, setWorkDuration] = useState(25);
  const [breakDuration, setBreakDuration] = useState(5);

  // YouTube state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [playlistId, setPlaylistId] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showYoutubeInput, setShowYoutubeInput] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(50);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Send commands to YouTube iframe via postMessage
  const sendYouTubeCommand = (func: string, args?: any[]) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args: args || [] }),
        "*"
      );
    }
  };

  // Handle volume changes
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
      sendYouTubeCommand("mute");
    } else {
      if (isMuted) {
        setIsMuted(false);
        sendYouTubeCommand("unMute");
      }
      sendYouTubeCommand("setVolume", [newVolume]);
    }
  };

  // Handle skip to next video
  const handleSkip = () => {
    sendYouTubeCommand("nextVideo");
  };

  // Preset playlists
  const PRESET_PLAYLISTS = [
    { name: "Focus Vibes", id: "PLBwpZUfqzPLtvrrUbW_zjBF_jT074rRy7" },
  ];

  // Quick links state
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");

  // Widget visibility
  const [showWidgets, setShowWidgets] = useState(true);
  const [showStats, setShowStats] = useState(true);
  const [showLinks, setShowLinks] = useState(true);

  // Fun state
  const [showCelebration, setShowCelebration] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Pre-calculated star positions to avoid hydration mismatch
  const stars = [
    { id: 0, x: 8.33, y: 10, size: 35, hue: 0 },
    { id: 1, x: 25, y: 10, size: 40, hue: 12 },
    { id: 2, x: 41.67, y: 10, size: 35, hue: 24 },
    { id: 3, x: 58.33, y: 10, size: 30, hue: 36 },
    { id: 4, x: 75, y: 10, size: 35, hue: 48 },
    { id: 5, x: 91.67, y: 10, size: 40, hue: 60 },
    { id: 6, x: 16.67, y: 30, size: 38, hue: 72 },
    { id: 7, x: 33.33, y: 30, size: 35, hue: 84 },
    { id: 8, x: 50, y: 30, size: 32, hue: 96 },
    { id: 9, x: 66.67, y: 30, size: 35, hue: 108 },
    { id: 10, x: 83.33, y: 30, size: 38, hue: 120 },
    { id: 11, x: 8.33, y: 50, size: 35, hue: 132 },
    { id: 12, x: 25, y: 50, size: 40, hue: 144 },
    { id: 13, x: 41.67, y: 50, size: 35, hue: 156 },
    { id: 14, x: 58.33, y: 50, size: 30, hue: 168 },
    { id: 15, x: 75, y: 50, size: 35, hue: 180 },
    { id: 16, x: 91.67, y: 50, size: 40, hue: 192 },
    { id: 17, x: 16.67, y: 70, size: 38, hue: 204 },
    { id: 18, x: 33.33, y: 70, size: 35, hue: 216 },
    { id: 19, x: 50, y: 70, size: 32, hue: 228 },
    { id: 20, x: 66.67, y: 70, size: 35, hue: 240 },
    { id: 21, x: 83.33, y: 70, size: 38, hue: 252 },
    { id: 22, x: 8.33, y: 90, size: 35, hue: 264 },
    { id: 23, x: 25, y: 90, size: 40, hue: 276 },
    { id: 24, x: 41.67, y: 90, size: 35, hue: 288 },
    { id: 25, x: 58.33, y: 90, size: 30, hue: 300 },
    { id: 26, x: 75, y: 90, size: 35, hue: 312 },
    { id: 27, x: 91.67, y: 90, size: 40, hue: 324 },
  ];

  // Format time helper (defined early for tab title)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Extract video ID or playlist ID from YouTube URL
  const extractYoutubeIds = (url: string): { videoId: string; playlistId: string } => {
    let vid = "";
    let pid = "";

    // Check for playlist
    const playlistMatch = url.match(/[?&]list=([^&\n?#]+)/);
    if (playlistMatch) pid = playlistMatch[1];

    // Check for video
    const videoPatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of videoPatterns) {
      const match = url.match(pattern);
      if (match) {
        vid = match[1];
        break;
      }
    }

    return { videoId: vid, playlistId: pid };
  };

  // Load saved data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedSessions = localStorage.getItem("focus_sessions_today");
      const savedMinutes = localStorage.getItem("focus_minutes_today");
      const savedDate = localStorage.getItem("focus_sessions_date");
      const savedWork = localStorage.getItem("focus_work_duration");
      const savedBreak = localStorage.getItem("focus_break_duration");
      const savedYoutube = localStorage.getItem("focus_youtube_url");
      const savedLinks = localStorage.getItem("focus_quick_links");

      const today = new Date().toDateString();
      if (savedDate === today) {
        if (savedSessions) setSessions(parseInt(savedSessions));
        if (savedMinutes) setTotalMinutes(parseInt(savedMinutes));
      }

      if (savedWork) {
        setWorkDuration(parseInt(savedWork));
        setTimeLeft(parseInt(savedWork) * 60);
      }
      if (savedBreak) setBreakDuration(parseInt(savedBreak));
      if (savedYoutube) {
        setYoutubeUrl(savedYoutube);
        const { videoId: vid, playlistId: pid } = extractYoutubeIds(savedYoutube);
        setVideoId(vid);
        setPlaylistId(pid);
      }
      if (savedLinks) setLinks(JSON.parse(savedLinks));
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => t - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      if (mode === "work") {
        const newSessions = sessions + 1;
        const newMinutes = totalMinutes + workDuration;
        setSessions(newSessions);
        setTotalMinutes(newMinutes);
        localStorage.setItem("focus_sessions_today", String(newSessions));
        localStorage.setItem("focus_minutes_today", String(newMinutes));
        localStorage.setItem("focus_sessions_date", new Date().toDateString());
        setMode("break");
        setTimeLeft(breakDuration * 60);
        setShowCelebration(true);
        setTimeout(() => setShowCelebration(false), 3000);
      } else {
        setMode("work");
        setTimeLeft(workDuration * 60);
      }
      setIsRunning(false);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timeLeft, mode, workDuration, breakDuration, sessions, totalMinutes]);

  // Update tab title with timer
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (timeLeft === 0) {
        document.title = mode === "work" ? "BREAK TIME" : "BACK TO WORK";
      } else {
        document.title = `${formatTime(timeLeft)} - ${mode === "work" ? "FOCUS" : "BREAK"}`;
      }
    }
    return () => {
      if (typeof window !== "undefined") {
        document.title = "Focus";
      }
    };
  }, [timeLeft, mode]);

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === "work" ? workDuration * 60 : breakDuration * 60);
  };

  const handleYoutubeSubmit = () => {
    const { videoId: vid, playlistId: pid } = extractYoutubeIds(youtubeUrl);
    setVideoId(vid);
    setPlaylistId(pid);
    if (vid || pid) {
      localStorage.setItem("focus_youtube_url", youtubeUrl);
    }
    setShowYoutubeInput(false);
  };

  const loadPresetPlaylist = (id: string) => {
    setPlaylistId(id);
    setVideoId("");
    setYoutubeUrl(`https://youtube.com/playlist?list=${id}`);
    localStorage.setItem("focus_youtube_url", `https://youtube.com/playlist?list=${id}`);
    setShowYoutubeInput(false);
  };

  const saveSettings = () => {
    localStorage.setItem("focus_work_duration", String(workDuration));
    localStorage.setItem("focus_break_duration", String(breakDuration));
    if (!isRunning) {
      setTimeLeft(mode === "work" ? workDuration * 60 : breakDuration * 60);
    }
    setShowSettings(false);
  };

  const addLink = () => {
    if (!newLinkName.trim() || !newLinkUrl.trim()) return;
    const newLinks = [...links, {
      name: newLinkName,
      url: newLinkUrl.startsWith("http") ? newLinkUrl : `https://${newLinkUrl}`
    }];
    setLinks(newLinks);
    localStorage.setItem("focus_quick_links", JSON.stringify(newLinks));
    setNewLinkName("");
    setNewLinkUrl("");
    setShowAddLink(false);
  };

  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    setLinks(newLinks);
    localStorage.setItem("focus_quick_links", JSON.stringify(newLinks));
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

      {/* YOUTUBE VIDEO BACKGROUND */}
      {(videoId || playlistId) && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 scale-150">
            <iframe
              ref={iframeRef}
              src={
                playlistId
                  ? `https://www.youtube.com/embed/videoseries?list=${playlistId}&autoplay=1&mute=1&loop=1&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`
                  : `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`
              }
              title="Background Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; autoplay"
              className="w-full h-full pointer-events-none"
              style={{ border: 'none' }}
            />
          </div>
          {/* Purple overlay */}
          <div className="absolute inset-0 bg-purple-950/70 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/50" />

          {/* Psychedelic starburst overlay - diffraction glasses effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Rainbow gradient definition */}
            <svg className="absolute w-0 h-0">
              <defs>
                <linearGradient id="rainbow-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff00ff" />
                  <stop offset="25%" stopColor="#00ffff" />
                  <stop offset="50%" stopColor="#ffff00" />
                  <stop offset="75%" stopColor="#ff00ff" />
                  <stop offset="100%" stopColor="#00ffff" />
                </linearGradient>
              </defs>
            </svg>
            {stars.map((star) => {
              // Stars intensify as progress increases (time running out)
              const intensity = isRunning ? 0.2 + (progress / 100) * 0.8 : 0.3;
              const starScale = 1 + (progress / 100) * 0.5;
              const glowAmount = progress / 100 * 20;

              return (
                <motion.div
                  key={star.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${star.x}%`,
                    top: `${star.y}%`,
                    width: star.size * starScale,
                    height: star.size * starScale,
                    filter: `drop-shadow(0 0 ${glowAmount}px rgba(255, 100, 255, ${intensity}))`,
                  }}
                  animate={{
                    opacity: [intensity * 0.5, intensity, intensity * 0.5],
                    scale: [0.9, 1.1, 0.9],
                    rotate: [0, 360],
                  }}
                  transition={{
                    opacity: { duration: 6 - (progress / 100) * 3, delay: star.id * 0.1, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 6 - (progress / 100) * 3, delay: star.id * 0.1, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 18 - (progress / 100) * 10, repeat: Infinity, ease: "linear" },
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full" style={{ filter: `hue-rotate(${star.hue + progress * 2}deg) saturate(${1 + progress / 50})` }}>
                    {/* 6-point star - pre-calculated coordinates */}
                    <line x1="50" y1="50" x2="98" y2="50" stroke="url(#rainbow-grad)" strokeWidth={2.5 + progress / 40} strokeLinecap="round" opacity={0.5 + intensity * 0.5} />
                    <line x1="50" y1="50" x2="74" y2="8" stroke="url(#rainbow-grad)" strokeWidth={2.5 + progress / 40} strokeLinecap="round" opacity={0.5 + intensity * 0.5} />
                    <line x1="50" y1="50" x2="26" y2="8" stroke="url(#rainbow-grad)" strokeWidth={2.5 + progress / 40} strokeLinecap="round" opacity={0.5 + intensity * 0.5} />
                    <line x1="50" y1="50" x2="2" y2="50" stroke="url(#rainbow-grad)" strokeWidth={2.5 + progress / 40} strokeLinecap="round" opacity={0.5 + intensity * 0.5} />
                    <line x1="50" y1="50" x2="26" y2="92" stroke="url(#rainbow-grad)" strokeWidth={2.5 + progress / 40} strokeLinecap="round" opacity={0.5 + intensity * 0.5} />
                    <line x1="50" y1="50" x2="74" y2="92" stroke="url(#rainbow-grad)" strokeWidth={2.5 + progress / 40} strokeLinecap="round" opacity={0.5 + intensity * 0.5} />
                    {/* Secondary rays */}
                    <line x1="50" y1="50" x2="78" y2="27" stroke="url(#rainbow-grad)" strokeWidth={1.5 + progress / 60} strokeLinecap="round" opacity={0.3 + intensity * 0.4} />
                    <line x1="50" y1="50" x2="50" y2="2" stroke="url(#rainbow-grad)" strokeWidth={1.5 + progress / 60} strokeLinecap="round" opacity={0.3 + intensity * 0.4} />
                    <line x1="50" y1="50" x2="22" y2="27" stroke="url(#rainbow-grad)" strokeWidth={1.5 + progress / 60} strokeLinecap="round" opacity={0.3 + intensity * 0.4} />
                    <line x1="50" y1="50" x2="22" y2="73" stroke="url(#rainbow-grad)" strokeWidth={1.5 + progress / 60} strokeLinecap="round" opacity={0.3 + intensity * 0.4} />
                    <line x1="50" y1="50" x2="50" y2="98" stroke="url(#rainbow-grad)" strokeWidth={1.5 + progress / 60} strokeLinecap="round" opacity={0.3 + intensity * 0.4} />
                    <line x1="50" y1="50" x2="78" y2="73" stroke="url(#rainbow-grad)" strokeWidth={1.5 + progress / 60} strokeLinecap="round" opacity={0.3 + intensity * 0.4} />
                    <circle cx="50" cy="50" r={5 + progress / 20} fill="white" opacity={0.7 + intensity * 0.3} />
                    <circle cx="50" cy="50" r={10 + progress / 10} fill="white" opacity={0.1 + intensity * 0.2} />
                  </svg>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* DEFAULT BACKGROUND (no video) */}
      {!videoId && !playlistId && (
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
            <Clock size={800} strokeWidth={0.5} />
          </div>
          {/* Psychedelic starburst overlay - diffraction glasses effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <svg className="absolute w-0 h-0">
              <defs>
                <linearGradient id="purple-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#c084fc" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>
            {stars.map((star) => {
              const intensity = isRunning ? 0.1 + (progress / 100) * 0.6 : 0.2;
              const starScale = 0.5 + (progress / 100) * 0.3;
              const glowAmount = progress / 100 * 15;

              return (
                <motion.div
                  key={star.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${star.x}%`,
                    top: `${star.y}%`,
                    width: star.size * starScale,
                    height: star.size * starScale,
                    filter: `drop-shadow(0 0 ${glowAmount}px rgba(168, 85, 247, ${intensity}))`,
                  }}
                  animate={{
                    opacity: [intensity * 0.5, intensity, intensity * 0.5],
                    scale: [0.9, 1.1, 0.9],
                    rotate: [0, 360],
                  }}
                  transition={{
                    opacity: { duration: 6 - (progress / 100) * 3, delay: star.id * 0.1, repeat: Infinity, ease: "easeInOut" },
                    scale: { duration: 6 - (progress / 100) * 3, delay: star.id * 0.1, repeat: Infinity, ease: "easeInOut" },
                    rotate: { duration: 18 - (progress / 100) * 10, repeat: Infinity, ease: "linear" },
                  }}
                >
                  <svg viewBox="0 0 100 100" className="w-full h-full" style={{ filter: `saturate(${1 + progress / 50})` }}>
                    <line x1="50" y1="50" x2="95" y2="50" stroke="url(#purple-grad)" strokeWidth={2 + progress / 50} strokeLinecap="round" opacity={0.4 + intensity * 0.5} />
                    <line x1="50" y1="50" x2="72" y2="11" stroke="url(#purple-grad)" strokeWidth={2 + progress / 50} strokeLinecap="round" opacity={0.4 + intensity * 0.5} />
                    <line x1="50" y1="50" x2="28" y2="11" stroke="url(#purple-grad)" strokeWidth={2 + progress / 50} strokeLinecap="round" opacity={0.4 + intensity * 0.5} />
                    <line x1="50" y1="50" x2="5" y2="50" stroke="url(#purple-grad)" strokeWidth={2 + progress / 50} strokeLinecap="round" opacity={0.4 + intensity * 0.5} />
                    <line x1="50" y1="50" x2="28" y2="89" stroke="url(#purple-grad)" strokeWidth={2 + progress / 50} strokeLinecap="round" opacity={0.4 + intensity * 0.5} />
                    <line x1="50" y1="50" x2="72" y2="89" stroke="url(#purple-grad)" strokeWidth={2 + progress / 50} strokeLinecap="round" opacity={0.4 + intensity * 0.5} />
                    <circle cx="50" cy="50" r={4 + progress / 25} fill="#a855f7" opacity={0.6 + intensity * 0.4} />
                  </svg>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}



      {/* FLOATING CONTROLS */}
      <div className="fixed top-12 right-4 z-[100] flex flex-col gap-2">
        <button
          onClick={() => setShowWidgets(!showWidgets)}
          className={`p-3 border backdrop-blur-sm transition-all ${
            showWidgets ? "border-purple-500/50 bg-purple-500/20 text-purple-400" : "border-zinc-800 bg-black/60 text-zinc-500"
          }`}
          title="Toggle widgets"
        >
          <Layers size={18} />
        </button>
        <button
          onClick={() => setShowYoutubeInput(!showYoutubeInput)}
          className={`p-3 border backdrop-blur-sm transition-all ${
            (videoId || playlistId) ? "border-purple-500/50 bg-purple-500/20 text-purple-400" : "border-zinc-800 bg-black/60 text-zinc-500"
          }`}
          title="Set background video"
        >
          <Youtube size={18} />
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 border border-zinc-800 bg-black/60 text-zinc-500 hover:text-purple-400 hover:border-purple-500/50 transition-all backdrop-blur-sm"
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* MUSIC CONTROLS - Bottom left */}
      {(videoId || playlistId) && (
        <div className="fixed bottom-12 left-4 z-[100] flex items-center gap-3 px-4 py-3 border border-zinc-800/50 bg-black/60 backdrop-blur-sm rounded-lg">
          <button
            onClick={() => {
              if (isMuted) {
                setIsMuted(false);
                sendYouTubeCommand("unMute");
                sendYouTubeCommand("setVolume", [volume]);
              } else {
                setIsMuted(true);
                sendYouTubeCommand("mute");
              }
            }}
            className={`transition-all ${
              isMuted ? "text-zinc-500" : "text-purple-400"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>

          <input
            type="range"
            min="0"
            max="100"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
            className="w-24 h-1 accent-purple-500 cursor-pointer"
            title={`Volume: ${isMuted ? 0 : volume}%`}
          />

          {playlistId && (
            <>
              <div className="w-px h-4 bg-zinc-700" />
              <button
                onClick={handleSkip}
                className="text-zinc-500 hover:text-purple-400 transition-all"
                title="Next video"
              >
                <SkipForward size={18} />
              </button>
            </>
          )}
        </div>
      )}


      {/* YOUTUBE INPUT MODAL */}
      <AnimatePresence>
        {showYoutubeInput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            onClick={() => setShowYoutubeInput(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg p-6 border border-zinc-800 bg-black"
            >
              <div className="flex items-center gap-3 mb-6">
                <Youtube size={20} className="text-purple-400" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Background Video</span>
              </div>

              {/* Preset Playlists */}
              <div className="mb-4">
                <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Presets</div>
                <div className="flex gap-2 flex-wrap">
                  {PRESET_PLAYLISTS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => loadPresetPlaylist(preset.id)}
                      className={`px-3 py-2 border text-xs font-bold transition-all ${
                        playlistId === preset.id
                          ? "border-purple-500 bg-purple-500/20 text-purple-400"
                          : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">Or paste URL</div>
              <input
                type="text"
                placeholder="YouTube video or playlist URL..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleYoutubeSubmit()}
                className="w-full bg-black border border-zinc-800 px-4 py-3 text-sm text-white outline-none focus:border-purple-500 transition-colors placeholder:text-zinc-700 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleYoutubeSubmit}
                  className="flex-1 py-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-black uppercase tracking-wider hover:bg-purple-500/20 transition-colors"
                >
                  Set Background
                </button>
                {(videoId || playlistId) && (
                  <button
                    onClick={() => { setVideoId(""); setPlaylistId(""); setYoutubeUrl(""); localStorage.removeItem("focus_youtube_url"); setShowYoutubeInput(false); }}
                    className="px-6 py-3 border border-red-500/30 text-red-400 text-xs font-black uppercase tracking-wider hover:bg-red-500/10 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg p-6 border border-zinc-800 bg-black"
            >
              <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-6">Timer Settings</div>
              <div className="grid grid-cols-2 gap-4 mb-6">
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

              <div className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400 mb-4">Widget Visibility</div>
              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={showStats} onChange={(e) => setShowStats(e.target.checked)} className="accent-purple-500" />
                  <span className="text-sm text-zinc-400">Show Stats</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={showLinks} onChange={(e) => setShowLinks(e.target.checked)} className="accent-purple-500" />
                  <span className="text-sm text-zinc-400">Show Quick Links</span>
                </label>
              </div>

              <button
                onClick={saveSettings}
                className="w-full py-3 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-black uppercase tracking-wider hover:bg-purple-500/20 transition-colors"
              >
                Save
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20">

        {/* MODE INDICATOR */}
        <div className={`mb-6 px-4 py-2 border backdrop-blur-sm ${
          mode === "work" ? "border-purple-500/30 text-purple-400" : "border-emerald-500/30 text-emerald-400"
        }`}>
          <span className="text-[10px] font-black uppercase tracking-[0.3em]">
            {mode === "work" ? "Focus Mode" : "Break Time"}
          </span>
        </div>

        {/* TIMER */}
        <div className="relative mb-8">
          <motion.div
            animate={isRunning ? { opacity: [1, 0.7, 1] } : { opacity: 1 }}
            transition={isRunning ? { repeat: Infinity, duration: 2 } : {}}
            className={`relative text-[80px] md:text-[140px] font-black tracking-tighter leading-none ${
              mode === "work" ? "text-white" : "text-emerald-400"
            }`}
            style={{
              textShadow: `0 0 ${40 + progress * 0.6}px rgba(168, 85, 247, ${0.3 + progress * 0.007})`
            }}
          >
            {formatTime(timeLeft)}
          </motion.div>
        </div>

        {/* CONTROLS */}
        <div className="flex items-center gap-4 mb-12">
          <motion.button
            onClick={() => setIsRunning(!isRunning)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`flex items-center justify-center w-16 h-16 border-2 backdrop-blur-sm transition-all ${
              mode === "work"
                ? "border-purple-500 text-purple-400 hover:bg-purple-500/20"
                : "border-emerald-500 text-emerald-400 hover:bg-emerald-500/20"
            }`}
          >
            {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
          </motion.button>

          <motion.button
            onClick={resetTimer}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-12 h-12 border border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 transition-all backdrop-blur-sm"
          >
            <RotateCcw size={20} />
          </motion.button>
        </div>

        {/* WIDGETS */}
        <AnimatePresence>
          {showWidgets && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="w-full max-w-3xl grid md:grid-cols-2 gap-4"
            >
              {/* STATS */}
              {showStats && (
                <div className="p-5 border border-zinc-800/50 bg-black/40 backdrop-blur-md">
                  <div className="flex items-center gap-3 mb-4">
                    <Sparkles size={16} className="text-purple-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Today</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border border-zinc-800/50 bg-black/30 text-center">
                      <div className="text-2xl font-black text-purple-400">{sessions}</div>
                      <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">Sessions</div>
                    </div>
                    <div className="p-3 border border-zinc-800/50 bg-black/30 text-center">
                      <div className="text-2xl font-black text-purple-400">{totalMinutes}</div>
                      <div className="text-[8px] font-bold text-zinc-600 uppercase tracking-wider">Minutes</div>
                    </div>
                  </div>
                </div>
              )}

              {/* QUICK LINKS */}
              {showLinks && (
                <div className="p-5 border border-zinc-800/50 bg-black/40 backdrop-blur-md">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <ExternalLink size={16} className="text-purple-400" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Quick Links</span>
                    </div>
                    <button onClick={() => setShowAddLink(!showAddLink)} className="text-zinc-600 hover:text-purple-400">
                      <Plus size={14} />
                    </button>
                  </div>

                  {showAddLink && (
                    <div className="mb-3 p-3 border border-zinc-800/50 bg-black/30">
                      <input
                        type="text"
                        placeholder="Name"
                        value={newLinkName}
                        onChange={(e) => setNewLinkName(e.target.value)}
                        className="w-full bg-transparent border-b border-zinc-800 px-0 py-1 text-xs text-white outline-none focus:border-purple-500 mb-2"
                      />
                      <input
                        type="text"
                        placeholder="URL"
                        value={newLinkUrl}
                        onChange={(e) => setNewLinkUrl(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addLink()}
                        className="w-full bg-transparent border-b border-zinc-800 px-0 py-1 text-xs text-white outline-none focus:border-purple-500 mb-2"
                      />
                      <button onClick={addLink} className="w-full py-2 bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase">
                        Add
                      </button>
                    </div>
                  )}

                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {links.map((link, i) => (
                      <div key={i} className="group flex items-center gap-2 p-2 border border-zinc-800/50 bg-black/30 hover:border-purple-500/30">
                        <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs text-zinc-400 hover:text-purple-400 truncate">
                          {link.name}
                        </a>
                        <button onClick={() => removeLink(i)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400">
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {links.length === 0 && !showAddLink && (
                      <div className="text-center py-3 text-zinc-700 text-[10px]">No links yet</div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CELEBRATION OVERLAY */}
        <AnimatePresence>
          {showCelebration && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none bg-black/50 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="text-center"
              >
                <div className="text-5xl md:text-7xl font-black text-purple-400 mb-4" style={{ textShadow: "0 0 60px rgba(168, 85, 247, 0.5)" }}>
                  SESSION COMPLETE
                </div>
                <div className="text-lg text-purple-300">Take a break. You earned it.</div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
