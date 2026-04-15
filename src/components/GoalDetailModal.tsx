"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Plus, Tag, Clock, Activity, Timer, AlertTriangle, Pencil, Check } from "lucide-react";

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
  const [title, setTitle] = useState(goal.task);
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState(goal.description || "");
  const [editingDescription, setEditingDescription] = useState(false);
  const [project, setProject] = useState(goal.project);
  const [editingProject, setEditingProject] = useState(false);
  const [priority, setPriority] = useState(goal.priority);

  // Lock scroll on the background body when modal opens
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

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
    const updatedGoal: Goal = {
      ...goal,
      task: title,
      project,
      priority,
      subgoals,
      description: description.trim() || undefined,
    };
    if (deadline) {
      updatedGoal.deadline = deadline;
    } else {
      delete updatedGoal.deadline;
    }
    if (!updatedGoal.description) {
      delete updatedGoal.description;
    }
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
        {/* Close Button - Always visible at top right */}
        <button onClick={onClose} className="absolute top-4 right-4 z-[620] text-zinc-500 hover:text-emerald-400 transition-colors bg-[#0a0a0a]/80 backdrop-blur-sm rounded-full p-1">
          <X size={20} />
        </button>

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* Info Section */}
          <div className="p-6 border-b border-zinc-800">
            {/* Title - editable */}
            {editingTitle && isAdmin ? (
              <div className="flex items-center gap-2 mb-4 w-[90%]">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && setEditingTitle(false)}
                  className="flex-1 bg-black border border-zinc-800 px-3 py-2.5 text-lg font-bold uppercase tracking-tight text-white outline-none focus:border-emerald-500/50 font-mono"
                  autoFocus
                />
                <button
                  onClick={() => setEditingTitle(false)}
                  className="px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <h2
                onClick={() => isAdmin && setEditingTitle(true)}
                className={`text-xl font-bold uppercase tracking-tight text-white leading-tight group flex items-center gap-2 mb-4 w-[90%] ${isAdmin ? 'cursor-pointer hover:text-emerald-100' : ''}`}
              >
                {title}
                {isAdmin && <Pencil size={14} className="opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity" />}
              </h2>
            )}

            {/* Meta row: Project, Date, Priority */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              {/* Project - editable */}
              {editingProject && isAdmin ? (
                <div className="flex items-center">
                  <div className="flex items-center gap-2 px-2 py-1 bg-black border border-zinc-800 border-r-0">
                    <Tag size={10} className="text-zinc-600" />
                  </div>
                  <input
                    type="text"
                    value={project}
                    onChange={(e) => setProject(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingProject(false)}
                    className="bg-black border border-zinc-800 border-r-0 px-2 py-1 text-[10px] font-black uppercase text-emerald-400 outline-none focus:border-emerald-500/50 w-28 font-mono"
                    autoFocus
                  />
                  <button
                    onClick={() => setEditingProject(false)}
                    className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <Check size={10} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => isAdmin && setEditingProject(true)}
                  className={`flex items-center gap-2 px-2.5 py-1 bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-[10px] font-black uppercase group transition-colors ${isAdmin ? 'hover:border-emerald-500/30 hover:text-emerald-400 cursor-pointer' : ''}`}
                >
                  <Tag size={10} />
                  {project}
                  {isAdmin && <Pencil size={8} className="opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity" />}
                </button>
              )}

              <div className="flex items-center gap-2 px-2.5 py-1 bg-zinc-900/50 border border-zinc-800 text-zinc-600 text-[10px] font-bold">
                <Clock size={10} /> {goal.date}
              </div>

              {/* Priority - styled buttons */}
              <div className={`flex items-center gap-2 px-2.5 py-1 border text-[10px] font-black uppercase ${
                priority === 'High'
                  ? 'bg-red-500/10 text-red-400 border-red-500/30'
                  : priority === 'Medium'
                    ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              }`}>
                <Activity size={10} />
                {priority}
              </div>
            </div>

            {/* Priority selector - admin only */}
            {isAdmin && (
              <div className="mb-4">
                <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700 mb-2">Priority Level</div>
                <div className="flex gap-1">
                  {['Low', 'Medium', 'High'].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider border transition-all ${
                        priority === p
                          ? p === 'High'
                            ? 'bg-red-500/20 text-red-400 border-red-500/50'
                            : p === 'Medium'
                              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50'
                              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          : 'bg-zinc-900/30 text-zinc-600 border-zinc-800 hover:border-zinc-700 hover:text-zinc-500'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div className="mb-4">
              <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700 mb-2">Description</div>
              {editingDescription && isAdmin ? (
                <div className="space-y-2">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description..."
                    className="w-full bg-black border border-zinc-800 px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-emerald-500/50 resize-y min-h-[6rem] font-mono placeholder:text-zinc-700"
                    autoFocus
                  />
                  <button
                    onClick={() => setEditingDescription(false)}
                    className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase hover:bg-emerald-500/20 transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : description ? (
                <p
                  onClick={() => isAdmin && setEditingDescription(true)}
                  className={`text-sm text-zinc-500 leading-relaxed p-3 bg-zinc-900/30 border border-zinc-800 group whitespace-pre-wrap ${isAdmin ? 'cursor-pointer hover:border-zinc-700 hover:text-zinc-400 transition-colors' : ''}`}
                >
                  {description}
                  {isAdmin && <Pencil size={10} className="inline ml-2 opacity-0 group-hover:opacity-100 text-emerald-400 transition-opacity" />}
                </p>
              ) : isAdmin ? (
                <button
                  onClick={() => setEditingDescription(true)}
                  className="w-full p-3 border border-dashed border-zinc-800 text-zinc-700 hover:border-emerald-500/30 hover:text-emerald-400 text-[10px] font-bold uppercase transition-colors"
                >
                  + Add description
                </button>
              ) : (
                <div className="p-3 border border-zinc-800 text-zinc-700 text-sm italic">No description</div>
              )}
            </div>

            {/* Deadline section */}
            <div className="mb-4">
              <div className="text-[9px] font-black uppercase tracking-wider text-zinc-700 mb-2">Deadline</div>
              {showDeadlineInput && isAdmin ? (
                <div className="space-y-3">
                  {/* Quick presets */}
                  <div className="flex flex-wrap gap-1">
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
                        onClick={() => {
                          const date = new Date();
                          date.setHours(date.getHours() + preset.hours);
                          const iso = date.toISOString().slice(0, 16);
                          setDeadline(iso);
                        }}
                        className="px-2.5 py-1 bg-zinc-900/50 border border-zinc-800 text-zinc-500 text-[10px] font-bold uppercase hover:border-emerald-500/30 hover:text-emerald-400 transition-colors"
                      >
                        +{preset.label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="datetime-local"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-black border border-zinc-800 px-3 py-2.5 text-sm outline-none focus:border-emerald-500/50 text-zinc-300 font-mono"
                  />
                  {deadline && (
                    <div className="text-[10px] text-zinc-600 font-mono">
                      {new Date(deadline).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" })} at {new Date(deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowDeadlineInput(false)}
                      className="flex-1 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold uppercase hover:bg-emerald-500/20 transition-colors"
                    >
                      Done
                    </button>
                    <button
                      onClick={() => { setDeadline(""); setShowDeadlineInput(false); }}
                      className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase hover:bg-red-500/20 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              ) : deadline ? (
                <div
                  onClick={() => isAdmin && setShowDeadlineInput(true)}
                  className={`p-3 border group transition-colors ${
                    (() => {
                      const cd = formatCountdown(deadline);
                      return cd.overdue
                        ? "bg-red-500/10 border-red-500/30"
                        : cd.urgent
                          ? "bg-yellow-500/10 border-yellow-500/30"
                          : "bg-zinc-900/30 border-zinc-800";
                    })()
                  } ${isAdmin ? 'cursor-pointer hover:border-zinc-700' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {formatCountdown(deadline).overdue ? (
                        <AlertTriangle size={16} className="text-red-400" />
                      ) : (
                        <Timer size={16} className={formatCountdown(deadline).urgent ? "text-yellow-400" : "text-emerald-400"} />
                      )}
                      <span className={`text-sm font-bold font-mono ${
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
                    {isAdmin && <Pencil size={12} className="text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {new Date(deadline).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })} at {new Date(deadline).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}
                  </div>
                </div>
              ) : isAdmin ? (
                <button
                  onClick={() => setShowDeadlineInput(true)}
                  className="w-full p-3 border border-dashed border-zinc-800 text-zinc-700 hover:border-emerald-500/30 hover:text-emerald-400 text-[10px] font-bold uppercase transition-colors flex items-center justify-center gap-2"
                >
                  <Timer size={12} />
                  Add deadline
                </button>
              ) : (
                <div className="p-3 border border-zinc-800 text-zinc-700 text-sm italic">No deadline set</div>
              )}
            </div>

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
          <div className="p-6">
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
