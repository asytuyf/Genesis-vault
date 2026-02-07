"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, ChevronLeft, Terminal, Copy, Clock, Hash, Zap } from "lucide-react";

export default function CommandArchive() {
  const [snippets, setSnippets] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/snippets.json")
      .then(res => res.json())
      .then(data => setSnippets([...data].reverse()))
      .catch(() => setSnippets([]));
  }, []);

  const filtered = snippets.filter(s => 
    s.cmd?.toLowerCase().includes(search.toLowerCase()) || 
    s.cat?.toLowerCase().includes(search.toLowerCase()) ||
    s.desc?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="relative min-h-screen bg-[#050505] text-[#f4f4f5] font-mono overflow-hidden p-12 md:p-24">
      <div className="tv-static fixed inset-0 opacity-[0.03] pointer-events-none" />
      
      {/* HAZARD BARS FOR ARCHIVE */}
      <div className="fixed inset-x-0 top-0 h-[28px] hazard-bar z-[150] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>MEN AT WORK // UNDER CONSTRUCTION //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] hazard-bar z-[150] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>MEN AT WORK // UNDER CONSTRUCTION //</span>)}
        </motion.div>
      </div>

      <header className="relative z-10 mb-20 py-10">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-[#facc15] mb-12 transition-colors group text-xs font-black uppercase">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          cd .. / return_to_index
        </Link>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase leading-none mb-8">COMMAND<br/><span className="text-zinc-800">_ARCHIVE.</span></h1>
        <div className="relative max-w-md">
          <input type="text" placeholder="GREP_ARCHIVE..." className="w-full bg-transparent border-b-2 border-zinc-800 px-0 py-3 text-xs font-bold outline-none focus:border-cyan-500 transition-all uppercase placeholder:text-zinc-800" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Search className="absolute right-0 top-3 text-zinc-800" size={18} />
        </div>
      </header>

      <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-20">
        {filtered.map((s, i) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} key={i} className="group bg-[#0a0a0a] border border-zinc-800 p-6 hover:border-cyan-500 transition-all shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-black px-2 py-0.5 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded uppercase">{s.cat}</span>
              <div className="flex items-center gap-2 text-zinc-700 text-[10px] font-bold"><Clock size={12} /> {s.date}</div>
            </div>
            <div className="relative mb-4 group/cmd">
              <code className="block bg-black p-4 border border-zinc-900 text-sm text-zinc-300 font-bold overflow-x-auto whitespace-pre group-hover/cmd:border-zinc-700 transition-colors"><span className="text-cyan-500 mr-2">$</span>{s.cmd}</code>
              <button onClick={() => { navigator.clipboard.writeText(s.cmd); alert("COPIED"); }} className="absolute right-2 top-2 p-2 bg-zinc-900 text-zinc-500 opacity-0 group-hover/cmd:opacity-100 hover:text-white border border-zinc-800"><Copy size={14} /></button>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </main>
  );
}