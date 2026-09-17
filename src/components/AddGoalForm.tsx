"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X, Lock, Eye } from "lucide-react";
import { type Goal, hoursFromNow } from "@/lib/goals";

interface AddGoalFormProps {
  /** Hands the new goal to the page, which queues it for saving. */
  onAdd: (goal: Goal) => void;
  onClose: () => void;
}

export const AddGoalForm = ({ onAdd, onClose }: AddGoalFormProps) => {
  const [task, setTask] = useState("");
  const [project, setProject] = useState("");
  const [priority, setPriority] = useState("Low");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState("");

  const handleAddGoal = () => {
    if (!task.trim()) {
      setError("A goal needs a title.");
      return;
    }

    // ISO date (YYYY-MM-DD), matching every goal already stored.
    const dateStr = new Date().toISOString().split("T")[0];

    const newGoal: Goal = {
      id: Date.now().toString(),
      task: task.trim(),
      project: project.trim() || "GLOBAL",
      priority,
      date: dateStr,
      ...(deadline && { deadline }),
      ...(description.trim() && { description: description.trim() }),
      ...(isPrivate && { private: true }),
    };

    onAdd(newGoal);
    onClose();
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
      <div className="relative bg-[#0a0a0a] border border-zinc-800 p-8 rounded-xl shadow-2xl w-full max-w-md font-mono z-[610] max-h-[90dvh] overflow-y-auto">
        <button onClick={onClose} aria-label="Close" className="absolute top-4 right-4 text-zinc-600 hover:text-emerald-400 transition-colors">
            <X size={20} />
        </button>
        <h4 className="text-emerald-400 text-xl font-black uppercase tracking-wider mb-6 border-b border-zinc-700 pb-3">Add New Goal:</h4>

        <div className="flex flex-col gap-4">
            <input
                type="text"
                placeholder="Task Title..."
                className="bg-black border border-zinc-800 px-4 py-2.5 text-base outline-none focus:border-emerald-400 text-zinc-300 placeholder:text-zinc-600"
                value={task}
                onChange={(e) => { setTask(e.target.value); if (error) setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAddGoal()}
                autoFocus
            />
            {error && <div className="text-red-400 text-xs font-bold -mt-2">{error}</div>}
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
                      onClick={() => setDeadline(hoursFromNow(preset.hours))}
                      className="px-2.5 py-1.5 bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-xs font-bold uppercase hover:border-emerald-500/30 hover:text-emerald-400 transition-colors"
                    >
                      +{preset.label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                    <input
                        type="datetime-local"
                        className="flex-1 min-w-0 bg-black border border-zinc-800 px-4 py-2.5 text-base outline-none focus:border-emerald-400 text-zinc-300 font-mono"
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
            <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-2">
                  Who can see it
                </label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setIsPrivate(false)}
                        className={`flex-1 py-2.5 inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider border transition-colors ${
                          isPrivate
                            ? "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                            : "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                        }`}
                    >
                        <Eye size={13} /> Anyone
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsPrivate(true)}
                        className={`flex-1 py-2.5 inline-flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider border transition-colors ${
                          isPrivate
                            ? "border-zinc-400/50 text-zinc-100 bg-zinc-100/10"
                            : "border-zinc-800 text-zinc-500 hover:border-zinc-700"
                        }`}
                    >
                        <Lock size={13} /> Only me
                    </button>
                </div>
                {isPrivate && (
                  <p className="text-[10px] text-zinc-600 mt-2 leading-relaxed">
                    Kept out of the page entirely for anyone without the admin key.
                  </p>
                )}
            </div>
            <button
                onClick={handleAddGoal}
                className="flex items-center justify-center gap-2 bg-emerald-700/30 text-emerald-400 px-4 py-2.5 text-base font-bold uppercase border border-emerald-500/30 hover:bg-emerald-700/50 transition-colors"
            >
                <Plus size={18} /> ADD GOAL
            </button>
        </div>
      </div>
    </motion.div>
  );
};
