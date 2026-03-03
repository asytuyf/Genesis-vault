"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react"; // Import X for close button
import React from "react";

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
  deadline?: string; // ISO datetime for countdown (optional)
  description?: string;
  subgoals?: SubGoal[];
}

interface AddGoalFormProps {
  password: string;
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  currentGoals: Goal[];
  setLoadingAction: React.Dispatch<React.SetStateAction<boolean>>;
  loadingAction: boolean;
  onClose: () => void; // Function to close the modal
}

export const AddGoalForm = ({ password, setGoals, currentGoals, setLoadingAction, loadingAction, onClose }: AddGoalFormProps) => {
  const [task, setTask] = useState("");
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState("Low");
  const [deadline, setDeadline] = useState(""); // Optional deadline datetime
  const [description, setDescription] = useState("");

  const handleAddGoal = async () => {
    if (!task.trim()) {
      alert("Goal task cannot be empty.");
      return;
    }
    setLoadingAction(true);

    // Use ISO date format (YYYY-MM-DD) to match PC addgoal function
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];

    const newGoal: Goal = {
      id: Date.now().toString(),
      task: task.trim(),
      project: project.trim() || "GLOBAL",
      priority: priority,
      date: dateStr,
      ...(deadline && { deadline }), // Only include if set
      ...(description.trim() && { description: description.trim() }), // Only include if set
    };

    // currentGoals is displayed reversed (newest first), so reverse back for storage (oldest first)
    // then add new goal at the end
    const goalsForStorage = [...currentGoals].reverse();
    goalsForStorage.push(newGoal);

    const res = await fetch('/api/goals', {
      method: 'POST',
      body: JSON.stringify({ password, updatedGoals: goalsForStorage })
    });

    if (res.ok) {
      setGoals([newGoal, ...currentGoals]); // Add to front of display (newest first)
      setTask("");
      setProject("");
      setPriority("Low");
      setDeadline("");
      setDescription("");
      onClose();
    }
    setLoadingAction(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="relative bg-[#0a0a0a] border border-zinc-800 p-8 rounded-xl shadow-2xl w-full max-w-md font-mono z-[610]">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-600 hover:text-emerald-400 transition-colors">
            <X size={20} />
        </button>
        <h4 className="text-emerald-400 text-xl font-black uppercase tracking-wider mb-6 border-b border-zinc-700 pb-3">Add New Goal:</h4>
        
        <div className="flex flex-col gap-4">
            <input
                type="text"
                placeholder="Task Title..."
                className="bg-black border border-zinc-800 px-4 py-2.5 text-base outline-none focus:border-emerald-400 text-zinc-300 placeholder:text-zinc-600"
                value={task}
                onChange={(e) => setTask(e.target.value)}
            />
            <textarea
                placeholder="Description (optional)..."
                className="bg-black border border-zinc-800 px-4 py-2.5 text-base outline-none focus:border-emerald-400 text-zinc-300 placeholder:text-zinc-600 resize-none h-20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
            />
            <input
                type="text"
                placeholder="Project/Tags (e.g., UI, Backend)..."
                className="bg-black border border-zinc-800 px-4 py-2.5 text-base outline-none focus:border-emerald-400 text-zinc-300 placeholder:text-zinc-600"
                value={project}
                onChange={(e) => setProject(e.target.value)}
            />
            <select
                className="bg-black border border-zinc-800 px-4 py-2.5 text-base outline-none focus:border-emerald-400 text-zinc-300 appearance-none pr-8 bg-no-repeat bg-right bg-origin-content"
                style={{backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2371717A' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`}}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
            >
                <option value="Low" className="bg-zinc-800 text-zinc-300">Low Priority</option>
                <option value="Medium" className="bg-zinc-800 text-zinc-300">Medium Priority</option>
                <option value="High" className="bg-zinc-800 text-zinc-300">High Priority</option>
            </select>
            <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">
                  Deadline (optional)
                </label>
                {/* Quick presets */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {[
                    { label: "1h", hours: 1 },
                    { label: "3h", hours: 3 },
                    { label: "6h", hours: 6 },
                    { label: "12h", hours: 12 },
                    { label: "24h", hours: 24 },
                    { label: "2d", hours: 48 },
                    { label: "1w", hours: 168 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const date = new Date();
                        date.setHours(date.getHours() + preset.hours);
                        const iso = date.toISOString().slice(0, 16);
                        setDeadline(iso);
                      }}
                      className="px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-xs font-bold uppercase hover:border-emerald-500/30 hover:text-emerald-400 transition-colors"
                    >
                      +{preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                    <input
                        type="datetime-local"
                        className="flex-1 bg-black border border-zinc-800 px-4 py-2.5 text-base outline-none focus:border-emerald-400 text-zinc-300 font-mono"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                    />
                    {deadline && (
                        <button
                            type="button"
                            onClick={() => setDeadline("")}
                            className="px-3 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-bold uppercase transition-colors"
                        >
                            Clear
                        </button>
                    )}
                </div>
                {deadline && (
                  <div className="text-[10px] text-zinc-500 font-mono mt-2">
                    {new Date(deadline).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at {new Date(deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </div>
                )}
            </div>
            <button
                onClick={handleAddGoal}
                className="flex items-center justify-center gap-2 bg-emerald-700/30 text-emerald-400 px-4 py-2.5 text-base font-bold uppercase border border-emerald-500/30 hover:bg-emerald-700/50 transition-colors"
                disabled={loadingAction}
            >
                <Plus size={18} /> {loadingAction ? "Adding..." : "ADD GOAL"}
            </button>
        </div>
      </div>
    </motion.div>
  );
};
