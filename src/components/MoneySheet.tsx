"use client";

// The window the spend page's forms open in. Escape closes it; ⌘+Enter in any
// of its fields saves.

import { useEffect } from "react";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { isSaveCombo } from "@/lib/keys";

export const field =
  "w-full bg-black border border-zinc-800 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-cyan-500/60 placeholder:text-zinc-700 font-mono";
export const label = "block text-[9px] font-black uppercase tracking-wider text-zinc-600 mb-1.5";
export const hint = "text-[10px] text-zinc-700 mt-1.5 leading-relaxed";

interface MoneySheetProps {
  title: string;
  saveLabel: string;
  error?: string;
  onSave: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

export function MoneySheet({ title, saveLabel, error, onSave, onClose, children }: MoneySheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-sheet
      className="fixed inset-0 z-[600] flex items-end md:items-center justify-center md:p-4"
    >
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 380, damping: 34 }}
        onKeyDown={(e) => {
          if (!isSaveCombo(e)) return;
          e.preventDefault();
          onSave();
        }}
        className="pwa-sheet pwa-sheet-bottom relative bg-[#0a0a0a] border border-zinc-800 w-full md:max-w-md max-h-[92dvh] overflow-y-auto font-mono z-[610] p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black uppercase tracking-wider text-cyan-400">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="text-zinc-600 hover:text-cyan-400 transition-colors">
            <X size={18} />
          </button>
        </div>

        {children}

        {error && <p className="text-[11px] text-red-400 font-bold">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onSave}
            className="flex-1 py-2.5 inline-flex items-center justify-center gap-2 border border-cyan-500/40 bg-cyan-500/10 text-cyan-400 text-xs font-black uppercase tracking-wider hover:bg-cyan-500/20 transition-colors"
          >
            <Check size={14} /> {saveLabel}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
