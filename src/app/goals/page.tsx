"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Tag, Clock, Activity, Hash, Box, Trash2, Plus, Terminal, ListChecks, Timer, ArrowUpDown } from "lucide-react";
import { AddGoalForm } from "@/components/AddGoalForm";
import { GoalDetailModal } from "@/components/GoalDetailModal";

interface SubGoal {
  id: string;
  text: string;
  completed: boolean;
}

interface Goal {
  id: string;
  task: string;
  project: string;
  priority: string;
  date: string;
  deadline?: string;
  description?: string;
  subgoals?: SubGoal[];
}

// Helper to format countdown
const formatCountdown = (deadline: string): { text: string; urgent: boolean; overdue: boolean } => {
  const now = new Date().getTime();
  const target = new Date(deadline).getTime();
  const diff = target - now;

  if (diff < 0) {
    const absDiff = Math.abs(diff);
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return { text: `${days}d ${hours}h overdue`, urgent: true, overdue: true };
    if (hours > 0) return { text: `${hours}h overdue`, urgent: true, overdue: true };
    return { text: "Just passed", urgent: true, overdue: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return { text: `${days}d ${hours}h`, urgent: days < 2, overdue: false };
  if (hours > 0) return { text: `${hours}h ${minutes}m`, urgent: hours < 6, overdue: false };
  return { text: `${minutes}m`, urgent: true, overdue: false };
};

const OrderInput = ({ index, totalGoals, moveGoalToIndex, loadingAction }: any) => {
  const [val, setVal] = useState((index + 1).toString());

  useEffect(() => {
    setVal((index + 1).toString());
  }, [index]);

  const handleCommit = () => {
    let parsed = parseInt(val, 10);
    if (isNaN(parsed)) {
      setVal((index + 1).toString());
      return;
    }
    if (parsed < 1) parsed = 1;
    if (parsed > totalGoals) parsed = totalGoals;
    setVal(parsed.toString());
    const newIndex = parsed - 1;
    if (newIndex !== index) {
      moveGoalToIndex(index, newIndex);
    }
  };

  return (
    <input
      type="number"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
      }}
      disabled={loadingAction}
      className="w-8 bg-transparent border-b border-zinc-700/50 text-center text-[10px] text-zinc-500 font-mono focus:text-emerald-400 focus:border-emerald-400 outline-none disabled:opacity-50 m-0 p-0"
      style={{ WebkitAppearance: 'none', MozAppearance: 'textfield' }}
      onClick={(e) => e.stopPropagation()}
    />
  );
};

const GoalItem = ({ g, index, totalGoals, isAdmin, sortBy, search, moveGoalToIndex, nukeGoal, setSelectedGoal, loadingAction }: any) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.3 } }}
      layout
      onClick={() => setSelectedGoal(g)}
      className="group bg-[#0a0a0a] border border-zinc-800 p-8 hover:border-emerald-500 transition-all shadow-xl relative overflow-hidden cursor-pointer"
    >
      {isAdmin && sortBy === "custom" && search.trim() === "" && (
        <div className="absolute top-3 left-4 flex items-center z-20">
          <span className="text-[10px] text-zinc-700 font-mono mr-1">#</span>
          <OrderInput index={index} totalGoals={totalGoals} moveGoalToIndex={moveGoalToIndex} loadingAction={loadingAction} />
        </div>
      )}
      {isAdmin && (
        <button
          onClick={(e) => { e.stopPropagation(); nukeGoal(g.id); }}
          className="absolute top-4 right-4 text-zinc-800 hover:text-red-500 transition-none z-20"
          disabled={loadingAction}
        >
          <Trash2 size={18} />
        </button>
      )}
      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-100 transition-opacity">
        <Hash size={12} className="text-emerald-500" />
      </div>

      <div className="flex flex-wrap items-start gap-2 mb-8 mt-2">
        <div className="inline-flex flex-none items-center gap-2 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 text-[10px] font-black uppercase tracking-widest group-hover:border-emerald-500/30 group-hover:text-emerald-500 transition-colors w-fit max-w-full">
          <Tag size={10} />
          <span className="whitespace-normal break-words">{g.project}</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-700 text-[10px] font-bold whitespace-nowrap ml-auto">
          <Clock size={12} /> {g.date}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-xl md:text-2xl font-bold uppercase tracking-tight text-zinc-100 group-hover:text-white transition-colors leading-tight break-words">
          {g.task}
        </h3>
      </div>

      {g.description && (
        <p className="text-sm text-zinc-600 mb-6 line-clamp-2 leading-relaxed">
          {g.description}
        </p>
      )}

      {g.deadline && (
        <div className="mb-6">
          {(() => {
            const countdown = formatCountdown(g.deadline);
            return (
              <div className={`flex items-center gap-2 text-xs font-bold ${
                countdown.overdue ? "text-red-400" : countdown.urgent ? "text-yellow-400" : "text-zinc-500"
              }`}>
                <Timer size={14} />
                <span>{countdown.text}</span>
              </div>
            );
          })()}
        </div>
      )}

      {g.subgoals && g.subgoals.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-2">
            <span className="flex items-center gap-1.5 text-zinc-600">
              <ListChecks size={12} />
              Sub-tasks
            </span>
            <span className={g.subgoals.filter((s: SubGoal) => s.completed).length === g.subgoals.length ? 'text-emerald-400' : 'text-zinc-600'}>
              {g.subgoals.filter((s: SubGoal) => s.completed).length}/{g.subgoals.length}
            </span>
          </div>
          <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(g.subgoals.filter((s: SubGoal) => s.completed).length / g.subgoals.length) * 100}%` }}
            />
          </div>
        </div>
      )}

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
  );
};

export default function DirectiveLog() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [isAddGoalModalOpen, setIsAddGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [, forceUpdate] = useState(0);
  const [sortBy, setSortBy] = useState<"custom" | "newest" | "deadline" | "priority" | "oldest">("custom");

  useEffect(() => {
    const interval = setInterval(() => forceUpdate(n => n + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/goals")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setGoals([...data].reverse());
        }
      })
      .catch(() => setGoals([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedKey = window.localStorage.getItem("goals_admin_key") || "";
    const savedMode = window.localStorage.getItem("goals_admin_mode") === "1";
    setPassword(savedKey);
    setIsAdmin(!!savedKey && savedMode);

    const keyHandler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string") {
        setPassword(detail);
        if (!detail) {
          setIsAdmin(false);
        }
      }
    };

    const modeHandler = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setIsAdmin(Boolean(detail));
    };

    window.addEventListener("goals-admin-key", keyHandler as EventListener);
    window.addEventListener("goals-admin-mode", modeHandler as EventListener);

    return () => {
      window.removeEventListener("goals-admin-key", keyHandler as EventListener);
      window.removeEventListener("goals-admin-mode", modeHandler as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!password && isAdmin) {
      setIsAdmin(false);
    }
  }, [password, isAdmin]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("goals_admin_mode", isAdmin ? "1" : "0");
  }, [isAdmin]);

  const filtered = goals.filter(g =>
    g.task?.toLowerCase().includes(search.toLowerCase()) ||
    g.project?.toLowerCase().includes(search.toLowerCase())
  );

  const sortedGoals = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "deadline":
        if (a.deadline && !b.deadline) return -1;
        if (!a.deadline && b.deadline) return 1;
        if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        }
        return 0;
      case "priority":
        const priorityOrder = { High: 0, Medium: 1, Low: 2 };
        return (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
               (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
      case "oldest":
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      case "newest":
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      case "custom":
      default:
        return 0;
    }
  });

  const moveGoalToIndex = async (fromIndex: number, toIndex: number) => {
    if (search.trim() !== "" || !isAdmin || !password) return;
    if (fromIndex === toIndex) return;
    
    const newGoals = [...goals];
    const [movedItem] = newGoals.splice(fromIndex, 1);
    newGoals.splice(toIndex, 0, movedItem);
    
    setGoals(newGoals);
    
    setLoadingAction(true);
    const goalsForGitHub = [...newGoals].reverse();
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, updatedGoals: goalsForGitHub })
      });
      if (!res.ok) console.error("Failed to update order");
    } catch (e) {
      console.error(e);
    }
    setLoadingAction(false);
  };

  const nukeGoal = async (idToDelete: string) => {
    setLoadingAction(true);

    const remainingGoals = goals.filter(g => g.id !== idToDelete);
    const goalsForGitHub = [...remainingGoals].reverse();

    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, updatedGoals: goalsForGitHub })
    });

    if (res.ok) {
      setGoals(remainingGoals);
    }
    setLoadingAction(false);
  };

  const updateGoal = async (updatedGoal: Goal) => {
    const updatedGoals = goals.map(g => g.id === updatedGoal.id ? updatedGoal : g);
    setGoals(updatedGoals);

    if (!isAdmin || !password) {
      return;
    }
    if (isAdmin && password) {
      setLoadingAction(true);
      const goalsForGitHub = [...updatedGoals].reverse();

      try {
        const res = await fetch('/api/goals', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password, updatedGoals: goalsForGitHub })
        });

        if (!res.ok) {
          const text = await res.text();
          console.error("Failed to update goal:", res.status, text);
          alert(`Failed to save: ${res.status} - ${text}`);
        }
      } catch (e) {
        console.error("Failed to update goal:", e);
        alert(`Failed to save: ${e}`);
      }
      setLoadingAction(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#0d0d0d] text-[#f4f4f5] font-mono overflow-hidden px-4 py-12 pt-14 md:p-24">
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

      <header className="relative z-10 mb-10 md:mb-20 py-6 md:py-10">
        <div className="flex flex-col mb-6 md:mb-10 select-none">
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.85] md:leading-[0.8]">
            TASK
          </h1>
          <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-zinc-700 uppercase leading-[0.85] md:leading-[0.8]">
            _FORGE.
          </h2>
        </div>

        <div className="text-zinc-600 mb-6 md:mb-10 text-[10px] md:text-sm font-black uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <Terminal size={12} className="shrink-0" />
            <span className="hidden md:inline">Click the top-left menu to open file explorer</span>
            <span className="md:hidden">Tap menu for file explorer</span>
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

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3 sm:gap-4 mt-6">
          <div className="grid grid-cols-5 sm:flex sm:items-center w-full sm:w-auto">
            {[
              { value: "custom", label: "Custom" },
              { value: "newest", label: "New" },
              { value: "deadline", label: "Due" },
              { value: "priority", label: "Priority" },
              { value: "oldest", label: "Old" },
            ].map((option, index) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value as typeof sortBy)}
                className={`flex items-center justify-center gap-1 px-2 sm:px-4 py-2 text-[10px] sm:text-sm font-bold uppercase border transition-colors ${
                  index === 0 ? "" : "border-l-0"
                } ${
                  sortBy === option.value
                    ? "bg-emerald-700/30 text-emerald-400 border-emerald-500/30"
                    : "bg-zinc-900/30 text-zinc-600 border-zinc-800 hover:bg-zinc-800/50 hover:text-zinc-400"
                }`}
              >
                {index === 0 && <ArrowUpDown size={12} className="hidden sm:block" />}
                <span className="sm:hidden">{option.label}</span>
                <span className="hidden sm:inline">{option.value === "custom" ? "Custom" : option.value === "newest" ? "Newest" : option.value === "deadline" ? "Deadline" : option.value === "priority" ? "Priority" : "Oldest"}</span>
              </button>
            ))}
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsAddGoalModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-emerald-700/30 text-emerald-400 px-4 sm:px-5 py-2.5 text-sm sm:text-base font-bold uppercase border border-emerald-500/30 hover:bg-emerald-700/50 transition-colors w-full sm:w-auto"
            >
              <Plus size={18} /> ADD NEW GOAL
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

      <AnimatePresence>
        {selectedGoal && (
          <GoalDetailModal
            goal={selectedGoal}
            isAdmin={isAdmin}
            password={password}
            onClose={() => setSelectedGoal(null)}
            onUpdate={updateGoal}
          />
        )}
      </AnimatePresence>

      {loading ? (
        <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-20">
          <div className="col-span-full py-20 text-zinc-800 uppercase font-black text-2xl animate-pulse text-center">
            Accessing Manifest...
          </div>
        </div>
      ) : sortedGoals.length === 0 ? (
        <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-20">
          <div className="col-span-full py-20 text-zinc-800 uppercase font-black text-xl text-center border border-dashed border-zinc-900">
            Zero_Directives_Found
          </div>
        </div>
      ) : (
        <div className="relative z-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3 pb-20">
          <AnimatePresence mode="popLayout">
            {sortedGoals.map((g, index) => (
              <GoalItem
                key={g.id}
                g={g}
                index={index}
                totalGoals={sortedGoals.length}
                isAdmin={isAdmin}
                sortBy={sortBy}
                search={search}
                moveGoalToIndex={moveGoalToIndex}
                nukeGoal={nukeGoal}
                setSelectedGoal={setSelectedGoal}
                loadingAction={loadingAction}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <div className="fixed inset-0 z-0 opacity-[0.02] pointer-events-none flex items-center justify-center">
        <Box size={600} strokeWidth={0.5} />
      </div>
    </main>
  );
}
