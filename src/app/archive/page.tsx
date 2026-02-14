"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Search, ChevronLeft, Terminal, Copy, Clock, Trash2, Lock, Unlock } from "lucide-react";

export default function CommandArchive() {
  const [snippets, setSnippets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [glitchPhase, setGlitchPhase] = useState(0); // 0=normal, 1=glitching, 2=copied

  const copyToClipboard = (cmd: string, id: string) => {
    navigator.clipboard.writeText(cmd);

    // Glitch sequence
    setGlitchPhase(1);
    setTimeout(() => {
      setCopiedId(id);
      setGlitchPhase(2);
    }, 400);

    // Revert after delay
    setTimeout(() => {
      setGlitchPhase(1);
      setTimeout(() => {
        setCopiedId(null);
        setGlitchPhase(0);
      }, 400);
    }, 4000);
  };


  useEffect(() => {
      // We fetch from GitHub Raw to get the REAL, live data
      // Added ?t=${Date.now()} to force the browser to never use a cache
      const liveUrl = `/snippets.json?t=${Date.now()}`;

      fetch(liveUrl)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) {
            setSnippets([...data].reverse());
          }
        })
        .catch(() => setSnippets([]));
    }, []);



  const filtered = snippets.filter(s => 
    s.cmd?.toLowerCase().includes(search.toLowerCase()) || 
    s.desc?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-x-hidden px-6 pb-6 pt-[56px] md:p-24">
      {/* HAZARD BARS */}
      <div className={`fixed inset-x-0 top-0 h-[28px] z-[150] flex items-center overflow-hidden border-b-2 border-black transition-colors duration-100 ${glitchPhase === 1 ? 'bg-black' : 'bg-cyan-500'}`}>
        <motion.div
          animate={{ x: [0, -1000] }}
          transition={{ repeat: Infinity, duration: glitchPhase === 1 ? 2 : 20, ease: "linear" }}
          className={`flex whitespace-nowrap text-[12px] font-black tracking-[2em] transition-colors duration-100 ${glitchPhase === 1 ? 'text-cyan-500' : 'text-black'}`}
        >
          {[...Array(10)].map((_, i) => (
            <span key={i} className={glitchPhase === 1 ? 'animate-pulse' : ''}>
              {glitchPhase === 1
                ? '▓▒░ INJECTING ░▒▓ BUFFER_OVERFLOW ▓▒░'
                : copiedId
                  ? 'DATA EXTRACTED // CLIPBOARD INJECTED //'
                  : 'UNDER CONSTRUCTION // MEN AT WORK //'}
            </span>
          ))}
        </motion.div>
      </div>
      <div className={`fixed inset-x-0 bottom-0 h-[28px] z-[150] flex items-center overflow-hidden border-t-2 border-black transition-colors duration-100 ${glitchPhase === 1 ? 'bg-black' : 'bg-cyan-500'}`}>
        <motion.div
          animate={{ x: [-1000, 0] }}
          transition={{ repeat: Infinity, duration: glitchPhase === 1 ? 2 : 20, ease: "linear" }}
          className={`flex whitespace-nowrap text-[12px] font-black tracking-[2em] transition-colors duration-100 ${glitchPhase === 1 ? 'text-cyan-500' : 'text-black'}`}
        >
          {[...Array(10)].map((_, i) => (
            <span key={i} className={glitchPhase === 1 ? 'animate-pulse' : ''}>
              {glitchPhase === 1
                ? '▓▒░ INJECTING ░▒▓ BUFFER_OVERFLOW ▓▒░'
                : copiedId
                  ? 'DATA EXTRACTED // CLIPBOARD INJECTED //'
                  : 'UNDER CONSTRUCTION // MEN AT WORK //'}
            </span>
          ))}
        </motion.div>
      </div>

      {/* BIG BACKGROUND SYMBOL */}
      <div className="fixed inset-0 z-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
        <Terminal size={800} strokeWidth={0.5} />
      </div>

      <header className="relative z-10 mb-20">
        <div className="flex flex-col mb-12">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white uppercase leading-[0.8]">COMMAND</h1>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-800 uppercase leading-[0.8]">_ARCHIVE.</h1>
        </div>

        <div className="text-zinc-600 mb-10 text-xs md:text-sm font-black uppercase tracking-wider">
          <div className="flex items-center gap-2 mb-2 hidden md:flex">
            <Terminal size={14} />
            <span>Hover on the left edge to open file explorer</span>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <Terminal size={14} />
            <span>Tap the top-left menu to open file explorer</span>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              placeholder="grep -i 'archive'..."
              className="w-full bg-transparent border-b-2 border-zinc-900 px-0 py-2 text-sm font-black outline-none focus:border-cyan-500 transition-all uppercase placeholder:text-zinc-800 text-cyan-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-40">
        {filtered.map((s, i) => (
          <motion.div layout key={`${s.cmd}-${i}`} className="group bg-[#0a0a0a] border border-zinc-900 p-10 hover:border-cyan-500 transition-none relative overflow-hidden">
            


            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-black px-2 py-0.5 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded uppercase">{s.cat}</span>
              <div className="flex items-center gap-2 text-zinc-700 text-[10px] font-bold"><Clock size={12} /> {s.date}</div>
            </div>
            
            <div className="relative mb-4 group/cmd">
              <code className="block bg-black p-4 pr-12 border border-zinc-900 text-sm text-zinc-300 font-bold overflow-x-auto group-hover/cmd:border-zinc-700 transition-none">
                <span className="text-cyan-500 mr-2">$</span>{s.cmd}
              </code>
              <button
                onClick={() => copyToClipboard(s.cmd, `${s.cmd}-${i}`)}
                className="absolute top-1/2 right-2 -translate-y-1/2 p-2 text-zinc-700 hover:text-cyan-400 transition-colors"
                title="Copy command"
              >
                <Copy size={16} />
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
