"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, ChevronLeft, Tag, Clock, Activity, Hash, Box, Lock, Unlock, Trash2 } from "lucide-react";

export default function DirectiveLog() {
  const [goals, setGoals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Fetch live data from GitHub to prevent "resurrection" bug
    const liveUrl = `https://raw.githubusercontent.com/Asytuyf/nixos-config/main/public/goals.json?t=${Date.now()}`;
    fetch(liveUrl)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGoals([...data].reverse());
      })
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, []);

  const nukeGoal = async (idToDelete: number) => {
    if (!confirm("CONFIRM_DELETION?")) return;
    setLoading(true);

    const newGoalsList = goals.filter(g => g.id !== idToDelete).reverse();

    const res = await fetch('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ password, updatedGoals: newGoalsList })
    });

    if (res.ok) {
      setGoals(goals.filter(g => g.id !== idToDelete));
      alert("DIRECTIVE_LOG_UPDATED");
    } else {
      alert("AUTH_FAILURE: CHECK PASSWORD");
    }
    setLoading(false);
  };

  const filtered = goals.filter(g => 
    g.task?.toLowerCase().includes(search.toLowerCase()) || 
    g.project?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="relative min-h-screen bg-[#050505] text-[#f4f4f5] font-mono overflow-x-hidden p-6 md:p-24">
      <div className="tv-static fixed inset-0 opacity-[0.03] pointer-events-none" />
      
      <header className="relative z-10 mb-20">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-emerald-500 mb-12 text-xs font-black uppercase">
          <ChevronLeft size={16} /> &lt; cd .. / return_to_index
        </Link>
        
        <div className="flex flex-col mb-12">
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white uppercase leading-[0.8]">DIRECTIVE</h1>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-zinc-800 uppercase leading-[0.8]">_LOG.</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
            <div className="relative w-full max-w-md">
                <input type="text" placeholder="grep -i 'directives'..." className="w-full bg-transparent border-b-2 border-zinc-900 px-0 py-2 text-sm font-black outline-none focus:border-emerald-500 transition-all uppercase placeholder:text-zinc-800 text-emerald-400" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            
            {/* ADMIN PANEL */}
            <div className="flex items-center gap-3 bg-zinc-950 p-2 border border-zinc-900">
                <input type="password" placeholder="ADMIN_KEY" className="bg-black border border-zinc-800 px-3 py-1 text-[10px] w-28 outline-none focus:border-emerald-500" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button onClick={() => setIsAdmin(!isAdmin)} className={isAdmin ? "text-emerald-400" : "text-zinc-700"}>
                    {isAdmin ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
            </div>
        </div>
      </header>

      <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-40">
        {loading ? (
            <div className="col-span-full py-20 text-center text-zinc-800 uppercase font-black text-2xl animate-pulse">Accessing Manifest...</div>
        ) : (
          filtered.map((g, i) => (
            <motion.div layout key={g.id} className="group bg-[#0a0a0a] border border-zinc-900 p-8 hover:border-emerald-500 transition-none relative">
              {isAdmin && (
                <button onClick={() => nukeGoal(g.id)} className="absolute top-4 right-4 text-zinc-800 hover:text-red-500 z-20">
                    <Trash2 size={18} />
                </button>
              )}
              {/* ... Rest of your existing card code ... */}
            </motion.div>
          ))
        )}
      </div>

      <div className="fixed inset-0 z-0 opacity-[0.05] pointer-events-none flex items-center justify-center select-none">
        <Box size={800} strokeWidth={0.2} />
      </div>
    </main>
  );
}