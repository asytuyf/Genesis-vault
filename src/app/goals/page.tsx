"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion"; // Import AnimatePresence
import Link from "next/link";
import { Search, ChevronLeft, Tag, Clock, Activity, Hash, Box, Lock, Unlock, Trash2, Plus, Terminal } from "lucide-react"; // Keep Plus for the button to open modal
import { AddGoalForm } from "@/components/AddGoalForm"; // Import the new component

export default function DirectiveLog() {
  const [goals, setGoals] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false); // State for modal visibility

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

  const nukeGoal = async (idToDelete: string) => {
    if (!confirm("NUKE_THIS_ENTRY?")) return;
    setLoadingAction(true);

    const newMasterList = goals.filter(g => g.id !== idToDelete).reverse(); // Remove the goal, then reverse for GitHub storage

    const res = await fetch('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ password, updatedGoals: newMasterList })
    });

    if (res.ok) {
      setGoals(goals.filter(g => g.id !== idToDelete));
      alert("MANIFEST_CLEARED");
    } else {
      alert("AUTH_FAILURE");
    }
    setLoadingAction(false);
  };



  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-hidden p-12 md:p-24">
      <div className="tv-static fixed inset-0 opacity-[0.03] pointer-events-none" />
      
      {/* HAZARD BARS */}
      <div className="fixed inset-x-0 top-0 h-[28px] bg-emerald-500 z-[150] flex items-center overflow-hidden border-b-2 border-black">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>
      <div className="fixed inset-x-0 bottom-0 h-[28px] bg-emerald-500 z-[150] flex items-center overflow-hidden border-t-2 border-black">
        <motion.div animate={{ x: [-1000, 0] }} transition={{ repeat: Infinity, duration: 20, ease: "linear" }} className="flex whitespace-nowrap text-[12px] font-black text-black tracking-[2em]">
          {[...Array(10)].map((_, i) => <span key={i}>UNDER CONSTRUCTION // MEN AT WORK //</span>)}
        </motion.div>
      </div>

      <header className="relative z-10 mb-20 py-10">

        
        <div className="flex flex-col mb-10 select-none">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.85] md:leading-[0.8]">
            TASK
          </h1>
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-700 uppercase leading-[0.85] md:leading-[0.8]">
            _FORGE.
          </h2>
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
                        <div className="relative max-w-md">

                          <input

                            type="text"

                            placeholder="grep -i 'goals log'..."

                            className="w-full bg-transparent border-b-2 border-zinc-900 px-0 py-2 text-sm font-black outline-none focus:border-emerald-400 transition-all uppercase placeholder:text-zinc-800 text-emerald-400"

                            value={search}

                            onChange={(e) => setSearch(e.target.value)}

                          />

                        </div>

                

                                                                <div className="flex flex-wrap items-center gap-4 mt-6"> {/* Increased gap */}

                

                                                                  {/* ADMIN LOGIN PANEL */}

                

                                                                  <div className="flex items-center gap-3 bg-zinc-950 p-2 border border-zinc-900 max-w-fit">

                

                                                                      <input

                

                                                                          type="password"

                

                                                                          placeholder="ADMIN_KEY"

                

                                                                          className="bg-black border border-zinc-800 px-3 py-1.5 text-sm w-28 outline-none focus:border-emerald-400" /* Wider input, larger text */

                

                                                                          value={password}

                

                                                                          onChange={(e) => setPassword(e.target.value)}

                

                                                                      />

                

                                                                      <button onClick={() => setIsAdmin(password === "genesis2026")} className={isAdmin ? "text-emerald-400" : "text-zinc-700"}>

                

                                                                          {isAdmin ? <Unlock size={20} /> : <Lock size={20} />} {/* Larger icons */}

                

                                                                      </button>

                

                                                                  </div>

                

                                                    

                

                                                                  {isAdmin && (

                

                                                                      <button

                

                                                                          onClick={() => setIsAddGoalModalOpen(true)}

                

                                                                          className="flex items-center gap-2 bg-emerald-700/30 text-emerald-400 px-5 py-2.5 text-base font-bold uppercase border border-emerald-500/30 hover:bg-emerald-700/50 transition-colors mt-0 md:mt-0" /* Larger button, text, padding */

                

                                                                      >

                

                                                                          <Plus size={20} /> ADD NEW GOAL

                

                                                                      </button>

                

                                                                  )}

                

                                                                </div>

                

                                                    </header>

                

                                              

                

                                                    <AnimatePresence>

                

                                                      {isAddGoalModalOpen && isAdmin && (

                

                                                        <AddGoalForm

                

                                                          password={password}

                

                                                          setGoals={setGoals}

                

                                                          currentGoals={goals}

                

                                                          setLoadingAction={setLoadingAction}

                

                                                          loadingAction={loadingAction}

                

                                                          onClose={() => setIsAddGoalModalOpen(false)}

                

                                                        />

                

                                                      )}

                

                                                    </AnimatePresence>

                

                                                    

                

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
              {/* NUKE BUTTON (Visible only when unlocked) */}
              {isAdmin && (
                  <button 
                      onClick={() => nukeGoal(g.id)}
                      className="absolute top-4 right-4 text-zinc-800 hover:text-red-500 transition-none z-20"
                      disabled={loadingAction}
                  >
                      <Trash2 size={18} />
                  </button>
              )}
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
                <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-zinc-100 group-hover:text-white transition-colors leading-tight">
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
