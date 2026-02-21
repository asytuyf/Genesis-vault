"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { X, Plus, Tag, Clock, Activity, Timer, AlertTriangle } from "lucide-react";

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
  subgoals?: SubGoal[];
}

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

interface GoalDetailModalProps {
  goal: Goal;
  isAdmin: boolean;
  password: string;
  onClose: () => void;
  onUpdate: (updatedGoal: Goal) => Promise<void>;
}

export const GoalDetailModal = ({ goal, isAdmin, password, onClose, onUpdate }: GoalDetailModalProps) => {
  const [subgoals, setSubgoals] = useState<SubGoal[]>(goal.subgoals || []);
  const [newSubgoal, setNewSubgoal] = useState("");
  const [saving, setSaving] = useState(false);
  const [deadline, setDeadline] = useState(goal.deadline || "");
  const [showDeadlineInput, setShowDeadlineInput] = useState(false);

  const toggleSubgoal = (id: string) => {
    if (!isAdmin) return;
    setSubgoals(prev =>
      prev.map(sg => sg.id === id ? { ...sg, completed: !sg.completed } : sg)
    );
  };

  const addSubgoal = () => {
    if (!newSubgoal.trim() || !isAdmin) return;
    const newSg: SubGoal = {
      id: Date.now().toString(),
      text: newSubgoal.trim(),
      completed: false
    };
    setSubgoals(prev => [...prev, newSg]);
    setNewSubgoal("");
  };

  const removeSubgoal = (id: string) => {
    if (!isAdmin) return;
    setSubgoals(prev => prev.filter(sg => sg.id !== id));
  };

  const saveChanges = async () => {
    setSaving(true);
    const updatedGoal = {
      ...goal,
      subgoals,
      ...(deadline ? { deadline } : {}),
      ...(!deadline && goal.deadline ? { deadline: undefined } : {}),
    };
    // Clean up undefined deadline
    if (!deadline) delete updatedGoal.deadline;
    await onUpdate(updatedGoal);
    setSaving(false);
    onClose();
  };

  const completedCount = subgoals.filter(sg => sg.completed).length;
  const progress = subgoals.length > 0 ? (completedCount / subgoals.length) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative bg-[#0a0a0a] border border-zinc-800 w-full max-w-lg max-h-[85vh] overflow-hidden font-mono z-[610] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-800">
          <button onClick={onClose} className="absolute top-4 right-4 text-zinc-600 hover:text-emerald-400 transition-colors">
            <X size={20} />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex items-center gap-2 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-500 text-[10px] font-black uppercase">
              <Tag size={10} />
              {goal.project}
            </div>
            <div className="flex items-center gap-2 text-zinc-700 text-[10px] font-bold">
              <Clock size={12} /> {goal.date}
            </div>
            <div className={`flex items-center gap-2 px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
              goal.priority === 'High'
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}>
              <Activity size={10} />
              {goal.priority}
            </div>
          </div>

          <h2 className="text-xl font-bold uppercase tracking-tight text-white leading-tight">
            {goal.task}
          </h2>

          {/* Deadline display/edit */}
          {(deadline || showDeadlineInput) && (
            <div className="mt-4">
              {deadline && !showDeadlineInput && (
                <div
                  className={`flex items-center justify-between p-3 border rounded ${
                    (() => {
                      const cd = formatCountdown(deadline);
                      return cd.overdue
                        ? "bg-red-500/10 border-red-500/30"
                        : cd.urgent
                          ? "bg-yellow-500/10 border-yellow-500/30"
                          : "bg-zinc-900 border-zinc-800";
                    })()
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {formatCountdown(deadline).overdue ? (
                      <AlertTriangle size={16} className="text-red-400" />
                    ) : (
                      <Timer size={16} className={formatCountdown(deadline).urgent ? "text-yellow-400" : "text-emerald-400"} />
                    )}
                    <span className={`text-sm font-bold ${
                      formatCountdown(deadline).overdue
                        ? "text-red-400"
                        : formatCountdown(deadline).urgent
                          ? "text-yellow-400"
                          : "text-emerald-400"
                    }`}>
                      {formatCountdown(deadline).text}
                    </span>
                    <span className="text-[10px] text-zinc-600 uppercase">
                      {formatCountdown(deadline).overdue ? "overdue" : "remaining"}
                    </span>
                  </div>
                  {isAdmin && (
                    <button
                      onClick={() => setShowDeadlineInput(true)}
                      className="text-[10px] text-zinc-600 hover:text-emerald-400 uppercase font-bold"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
              {showDeadlineInput && isAdmin && (
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="flex-1 bg-black border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500/50 text-zinc-300"
                  />
                  <button
                    onClick={() => setShowDeadlineInput(false)}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-emerald-400 text-xs font-bold uppercase"
                  >
                    Done
                  </button>
                  <button
                    onClick={() => { setDeadline(""); setShowDeadlineInput(false); }}
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-red-400 text-xs font-bold uppercase"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Add deadline button if none set */}
          {!deadline && !showDeadlineInput && isAdmin && (
            <button
              onClick={() => setShowDeadlineInput(true)}
              className="mt-3 flex items-center gap-2 text-[10px] text-zinc-600 hover:text-emerald-400 uppercase font-bold transition-colors"
            >
              <Timer size={12} />
              Add deadline
            </button>
          )}

          {/* Progress bar */}
          {subgoals.length > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-[10px] font-bold uppercase mb-2">
                <span className="text-zinc-600">Progress</span>
                <span className="text-emerald-400">{completedCount}/{subgoals.length}</span>
              </div>
              <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Subgoals list */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="text-[10px] font-black uppercase tracking-wider text-zinc-600 mb-4">
            Sub-Tasks
          </div>

          {subgoals.length === 0 ? (
            <div className="text-zinc-700 text-sm py-8 text-center border border-dashed border-zinc-800 uppercase">
              No_Sub-Tasks_Found
            </div>
          ) : (
            <div className="space-y-1">
              {subgoals.map((sg) => (
                <motion.div
                  key={sg.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-3 p-3 border transition-all ${
                    sg.completed
                      ? 'bg-zinc-900/30 border-zinc-800'
                      : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <button
                    onClick={() => toggleSubgoal(sg.id)}
                    disabled={!isAdmin}
                    className={`font-mono text-sm transition-colors ${!isAdmin ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <span className={sg.completed ? 'text-emerald-500' : 'text-zinc-700 hover:text-zinc-500'}>
                      [{sg.completed ? <span className="text-emerald-400">■</span> : <span className="text-zinc-800">&nbsp;</span>}]
                    </span>
                  </button>
                  <span className={`flex-1 text-sm font-mono ${
                    sg.completed ? 'text-zinc-600 line-through' : 'text-zinc-400'
                  }`}>
                    {sg.text}
                  </span>
                  {isAdmin && (
                    <button
                      onClick={() => removeSubgoal(sg.id)}
                      className="text-zinc-800 hover:text-red-500 transition-colors text-xs font-mono"
                    >
                      [DEL]
                    </button>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Add subgoal + Save (Admin only) */}
        {isAdmin && (
          <div className="p-6 border-t border-zinc-800 space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="$ add sub-task..."
                value={newSubgoal}
                onChange={(e) => setNewSubgoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubgoal()}
                className="flex-1 bg-black border border-zinc-800 px-3 py-2 text-sm outline-none focus:border-emerald-500/50 text-zinc-300 placeholder:text-zinc-700 font-mono"
              />
              <button
                onClick={addSubgoal}
                className="px-3 py-2 bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-emerald-400 hover:border-emerald-500/30 transition-colors font-mono text-sm"
              >
                [+]
              </button>
            </div>
            <button
              onClick={saveChanges}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-emerald-500 px-4 py-2.5 text-sm font-bold uppercase border border-zinc-800 hover:border-emerald-500/30 hover:bg-zinc-900/80 transition-colors font-mono tracking-wider"
            >
              {saving ? "SYNCING..." : "SYNC_CHANGES"}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
