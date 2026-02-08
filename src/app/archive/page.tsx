"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Search, ChevronLeft, Terminal, Copy, Clock, Trash2, Lock, Unlock } from "lucide-react";

export default function CommandArchive() {
  const [snippets, setSnippets] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/snippets.json").then(res => res.json()).then(data => setSnippets([...data].reverse()));
  }, []);

  const nukeSnippet = async (indexInFiltered: number) => {
    if (!confirm("NUKE_THIS_ENTRY?")) return;
    setLoading(true);

    // 1. Find the actual snippet in the original array
    const snippetToDelete = filtered[indexInFiltered];
    const newMasterList = snippets.filter(s => s.cmd !== snippetToDelete.cmd).reverse(); // Flip back for GitHub storage

    // 2. Send to API
    const res = await fetch('/api/archive', {
      method: 'POST',
      body: JSON.stringify({ password, updatedSnippets: newMasterList })
    });

    if (res.ok) {
      setSnippets(snippets.filter(s => s.cmd !== snippetToDelete.cmd));
      alert("MANIFEST_CLEARED");
    } else {
      alert("AUTH_FAILURE");
    }
    setLoading(false);
  };

  const filtered = snippets.filter(s => 
    s.cmd?.toLowerCase().includes(search.toLowerCase()) || 
    s.desc?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="relative min-h-screen bg-[#050505] text-[#f4f4f5] font-mono overflow-x-hidden p-6 md:p-24">
      {/* BIG BACKGROUND SYMBOL */}
      <div className="fixed inset-0 z-0 opacity-[0.03] flex items-center justify-center pointer-events-none">
        <Terminal size={800} strokeWidth={0.5} />
      </div>

      <header className="relative z-10 mb-20">
        <Link href="/" className="inline-flex items-center gap-2 text-zinc-600 hover:text-cyan-400 mb-12 text-xs font-black uppercase transition-none">
          <ChevronLeft size={14} /> cd .. / return_to_index
        </Link>
        
        <div className="flex flex-col mb-12">
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-white uppercase leading-[0.8]">COMMAND</h1>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter text-zinc-800 uppercase leading-[0.8]">_ARCHIVE.</h1>
        </div>

        <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
            <div className="relative w-full max-w-md">
                <input type="text" placeholder="grep -i 'archive'..." className="w-full bg-transparent border-b-2 border-zinc-900 px-0 py-2 text-sm font-black outline-none focus:border-cyan-500 transition-all uppercase placeholder:text-zinc-800 text-cyan-400" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {/* ADMIN LOGIN PANEL */}
            <div className="flex items-center gap-3 bg-zinc-950 p-2 border border-zinc-900">
                <input 
                    type="password" 
                    placeholder="ADMIN_KEY" 
                    className="bg-black border border-zinc-800 px-3 py-1 text-[10px] w-28 outline-none focus:border-cyan-500"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <button onClick={() => setIsAdmin(!isAdmin)} className={isAdmin ? "text-cyan-400" : "text-zinc-700"}>
                    {isAdmin ? <Unlock size={18} /> : <Lock size={18} />}
                </button>
            </div>
        </div>
      </header>

      <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-40">
        {filtered.map((s, i) => (
          <motion.div layout key={`${s.cmd}-${i}`} className="group bg-[#0a0a0a] border border-zinc-900 p-8 hover:border-cyan-500 transition-none relative overflow-hidden">
            
            {/* NUKE BUTTON (Visible only when unlocked) */}
            {isAdmin && (
                <button 
                    onClick={() => nukeSnippet(i)}
                    className="absolute top-4 right-4 text-zinc-800 hover:text-red-500 transition-none z-20"
                >
                    <Trash2 size={18} />
                </button>
            )}

            <div className="flex justify-between items-center mb-8">
              <span className="text-[10px] font-black px-2 py-0.5 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded uppercase">{s.cat}</span>
              <div className="flex items-center gap-2 text-zinc-700 text-[10px] font-bold"><Clock size={12} /> {s.date}</div>
            </div>
            
            <div className="relative mb-4 group/cmd">
              <code className="block bg-black p-4 border border-zinc-900 text-sm text-zinc-300 font-bold overflow-x-auto group-hover/cmd:border-zinc-700 transition-none">
                <span className="text-cyan-500 mr-2">$</span>{s.cmd}
              </code>
            </div>
            <p className="text-[10px] text-zinc-500 font-bold uppercase leading-relaxed">{s.desc}</p>
          </motion.div>
        ))}
      </div>
    </main>
  );
}