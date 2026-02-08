"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, ChevronLeft, Tag, Clock, Activity, Hash, Box } from "lucide-react";

export default function DirectiveLog() {
  const [goals, setGoals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/goals.json")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGoals([...data].reverse());
        }
      })
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = goals.filter(g => 
    g.task?.toLowerCase().includes(search.toLowerCase()) || 
    g.project?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="relative min-h-screen bg-[#050505] text-[#f4f4f5] font-mono overflow-hidden p-12 md:p-24">
      <div className="tv-static fixed inset-0 opacity-[0.03] pointer-events-none" />
      
      {/* HAZARD BARS */}
      <div className="fixed inset-x-0 top-0 h-[28px] hazard-bar z-[150] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>SYSTEM DIRECTIVES // OPERATIONAL LOG //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] hazard-bar z-[150] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>SYSTEM DIRECTIVES // OPERATIONAL LOG //</span>)}
        </motion.div>
      </div>

      <header className="relative z-10 mb-20 py-10">
        {/* UPDATED RETURN LINK */}
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-emerald-500 mb-12 transition-colors group text-xs font-black uppercase">
          <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          cd .. / return_to_index
        </Link>
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white uppercase leading-none mb-8">
          DIRECTIVE<br/><span className="text-zinc-800">_LOG.</span>
        </h1>

        <div className="relative max-w-md">
          <input 
            type="text" 
            placeholder="GREP_DIRECTIVES..." 
            className="w-full bg-transparent border-b-2 border-zinc-800 px-0 py-3 text-xs font-bold outline-none focus:border-emerald-500 transition-all uppercase placeholder:text-zinc-800" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
          <Search className="absolute right-0 top-3 text-zinc-800" size={18} />
        </div>
      </header>

      <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-20">
        {loading ? (
            <div className="col-span-full py-20 text-zinc-800 uppercase font-black text-2xl animate-pulse text-center">
                Accessing Manifest...
            </div>
        ) : filtered.length === 0 ? (
            <div className="col-span-full py-20 text-zinc-800 uppercase font-black text-xl text-center border border-dashed border-zinc-900">
                Zero_Directives_Found
            </div>
        ) : (
          filtered.map((g, i) => (
            <motion.div 
                initial={{ opacity: 0, y: 20 }} 
                animate={{ opacity: 1, y: 0 }} 
                key={i} 
                className="group bg-[#0a0a0a] border border-zinc-800 p-8 hover:border-emerald-500 transition-all shadow-xl relative overflow-hidden"
            >
              {/* DECORATIVE CORNER */}
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
                <Hash size={12} className="text-emerald-500" />
              </div>

              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 text-[10px] font-black uppercase tracking-widest group-hover:border-emerald-500/30 group-hover:text-emerald-500 transition-colors">
                    <Tag size={10} />
                    {g.project}
                </div>
                <div className="flex items-center gap-2 text-zinc-700 text-[10px] font-bold">
                    <Clock size={12} /> {g.date}
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-zinc-100 group-hover:text-white transition-colors leading-tight">
                    {g.task}
                </h3>
              </div>

              <div className="flex justify-between items-center border-t border-zinc-900 pt-6">
                <div className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${
                    g.priority === 'High' 
                    ? 'bg-red-500/10 text-red-500 border-red-500/20' 
                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                }`}>
                    <Activity size={10} />
                    Lvl_{g.priority}
                </div>
                <span className="text-[10px] text-zinc-800 font-mono">REF_{g.id}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* BACKGROUND DECO */}
      <div className="fixed inset-0 z-0 opacity-[0.02] pointer-events-none flex items-center justify-center">
        <Box size={600} strokeWidth={0.5} />
      </div>
    </main>
  );
}