"use client";
// Things to remember: answers looked up once and worth keeping at hand, with
// no schedule to track. Each tip is a title, the details, and an optional tag
// to filter by.
//
// Built for catching a thing before it is forgotten: only the title is needed,
// Enter saves it, tags already used are one tap away, and once the list grows
// a search finds any tip by a word in it.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lightbulb, Pencil, Plus, Search, X } from "lucide-react";
import { type TrackerTip, type TipOp } from "@/lib/tips";
import { LinkifiedText } from "@/components/LinkifiedText";

const LINK = "text-orange-400 underline decoration-orange-400/40 underline-offset-2 hover:decoration-orange-400 wrap-anywhere";
/** Past this, a tip folds to a few lines until opened. */
const LONG_BODY = 260;
/** From this many tips on, a search box is shown. */
const SEARCH_FROM = 4;

interface Draft {
  title: string;
  body: string;
  tag: string;
}

const EMPTY: Draft = { title: "", body: "", tag: "" };

function TipForm({
  initial,
  tags,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: Draft;
  tags: string[];
  onSave: (d: Draft) => void;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [draft, setDraft] = useState<Draft>(initial);
  const canSave = !!draft.title.trim();
  const save = () => canSave && onSave(draft);
  const onEscape = (e: React.KeyboardEvent) => e.key === "Escape" && onCancel();

  return (
    <div className="p-4 border border-orange-500/30 bg-black/80 space-y-3" onKeyDown={onEscape}>
      <div>
        <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">What to remember</label>
        <input
          autoFocus
          placeholder="e.g. How long does creatine keep once mixed?"
          value={draft.title}
          enterKeyHint="done"
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && save()}
          className="w-full bg-transparent border-b-2 border-zinc-800 py-2 text-base text-white outline-none focus:border-orange-500 placeholder:text-zinc-700"
        />
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">
          Details <span className="text-zinc-700 normal-case tracking-normal font-normal">(optional)</span>
        </label>
        <textarea
          placeholder="The answer, a link, or a few lines starting with -"
          value={draft.body}
          rows={3}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && save()}
          className="w-full bg-black border border-zinc-800 px-3 py-2.5 text-base md:text-sm text-zinc-200 outline-none focus:border-orange-500 placeholder:text-zinc-700 resize-y min-h-[80px]"
        />
      </div>
      <div>
        <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-500 mb-1">
          Tag <span className="text-zinc-700 normal-case tracking-normal font-normal">(optional)</span>
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => {
            const on = draft.tag.trim().toLowerCase() === t.toLowerCase();
            return (
              <button
                key={t}
                type="button"
                onClick={() => setDraft({ ...draft, tag: on ? "" : t })}
                className={`px-2.5 py-1.5 border text-[10px] font-black uppercase tracking-wider transition-colors ${
                  on ? "border-orange-500 bg-orange-500 text-black" : "border-zinc-800 text-zinc-400 hover:border-orange-500/40 hover:text-orange-400"
                }`}
              >
                {t}
              </button>
            );
          })}
          <input
            placeholder={tags.length ? "or a new one" : "e.g. Gym, Uni, ESN"}
            value={tags.some((t) => t.toLowerCase() === draft.tag.trim().toLowerCase()) ? "" : draft.tag}
            enterKeyHint="done"
            onChange={(e) => setDraft({ ...draft, tag: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && save()}
            className="w-36 bg-black border border-zinc-800 px-2.5 py-1.5 text-base md:text-xs text-white outline-none focus:border-orange-500 placeholder:text-zinc-700"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={save}
          disabled={!canSave}
          className="flex-1 py-3 border border-orange-500/40 bg-orange-500/15 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/25 transition-colors disabled:opacity-30"
        >
          {saveLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-3 border border-zinc-800 text-zinc-500 text-xs font-black uppercase tracking-wider hover:border-zinc-700 transition-colors"
        >
          Cancel
        </button>
      </div>
      <div className="hidden md:block text-[10px] text-zinc-600">
        Enter saves · Ctrl/⌘ + Enter saves from the details · Esc cancels
      </div>
    </div>
  );
}

function TipCard({
  tip,
  tags,
  adminMode,
  onUpdate,
  onRemove,
}: {
  tip: TrackerTip;
  tags: string[];
  adminMode: boolean;
  onUpdate: (d: Draft) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const long = tip.body.length > LONG_BODY || tip.body.split("\n").length > 5;

  if (editing) {
    return (
      <div className="break-inside-avoid mb-4">
        <TipForm
          initial={{ title: tip.title, body: tip.body, tag: tip.tag ?? "" }}
          tags={tags}
          saveLabel="Save changes"
          onSave={(d) => {
            onUpdate(d);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative break-inside-avoid mb-4 p-4 md:p-5 border border-zinc-900 bg-[#0a0a0a] hover:border-orange-500/30 transition-colors"
    >
      <div className="flex items-start gap-3">
        <Lightbulb size={16} className="text-orange-400 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          {tip.tag && (
            <span className="inline-block mb-1.5 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-orange-300 bg-orange-500/10 border border-orange-500/25">
              {tip.tag}
            </span>
          )}
          <div className="text-sm font-bold text-white leading-snug">{tip.title}</div>
          {tip.body && (
            <div
              className={`mt-2 text-[12px] md:text-[13px] leading-relaxed text-zinc-400 whitespace-pre-wrap wrap-anywhere ${
                long && !open ? "line-clamp-5" : ""
              }`}
            >
              <LinkifiedText text={tip.body} linkClassName={LINK} />
            </div>
          )}
          {long && (
            <button
              onClick={() => setOpen(!open)}
              className="mt-2 text-[10px] font-black uppercase tracking-wider text-zinc-500 hover:text-orange-400"
            >
              {open ? "Show less" : "Show more"}
            </button>
          )}
        </div>
        {adminMode && (
          <div className="flex items-center gap-0.5 -mr-1 -mt-1 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="p-2 text-zinc-600 hover:text-white transition-colors"
              title="Edit"
              aria-label="Edit tip"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => (confirm ? onRemove() : setConfirm(true))}
              onBlur={() => setConfirm(false)}
              title={confirm ? "Tap again to delete" : "Delete"}
              aria-label={confirm ? "Confirm delete" : "Delete tip"}
              className={
                confirm
                  ? "px-2 py-1.5 border border-red-500/50 text-red-400 text-[9px] font-black uppercase"
                  : "p-2 text-zinc-600 hover:text-red-400 transition-colors"
              }
            >
              {confirm ? "Delete?" : <X size={14} />}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface Props {
  tips: TrackerTip[];
  adminMode: boolean;
  syncLabel?: React.ReactNode;
  queueOps: (ops: TipOp[]) => void;
}

export default function TipsBoard({ tips, adminMode, syncLabel, queueOps }: Props) {
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const tags = [...new Set(tips.map((t) => t.tag).filter((t): t is string => !!t))].sort((a, b) => a.localeCompare(b));
  // A tag whose last tip was deleted falls back to showing everything.
  const active = filter && tags.includes(filter) ? filter : null;
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = tips.filter(
    (t) =>
      (!active || t.tag === active) &&
      words.every((w) => `${t.title} ${t.body} ${t.tag ?? ""}`.toLowerCase().includes(w))
  );

  // "gym" typed while "Gym" exists joins it rather than starting a second tag.
  const canonTag = (tag: string) => tags.find((t) => t.toLowerCase() === tag.trim().toLowerCase()) ?? tag.trim();

  const addTip = (d: Draft) => {
    queueOps([{ type: "add", tip: { id: Date.now().toString(), title: d.title, body: d.body, tag: canonTag(d.tag) } }]);
    setAdding(false);
    setQuery("");
  };

  return (
    <section className="mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <Lightbulb size={20} className="text-orange-400" />
          <span className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Things to remember</span>
          {tips.length > 0 && <span className="text-[10px] text-zinc-600">{tips.length}</span>}
          {syncLabel}
        </div>
        {adminMode && tips.length > 0 && (
          <button
            onClick={() => setAdding(!adding)}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-orange-500/30 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/10 transition-colors"
          >
            <Plus size={14} />
            Add
          </button>
        )}
      </div>

      {!adminMode && tips.length > 0 && (
        <div className="mb-4 px-3 py-2 border border-zinc-800 bg-zinc-900/30 text-[10px] text-zinc-500 uppercase tracking-wider">
          View only — unlock in the menu (☰) to add or edit
        </div>
      )}

      <AnimatePresence>
        {adding && adminMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 overflow-hidden"
          >
            <TipForm
              initial={{ ...EMPTY, tag: active ?? "" }}
              tags={tags}
              saveLabel="Save tip"
              onCancel={() => setAdding(false)}
              onSave={addTip}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {(tips.length >= SEARCH_FROM || tags.length > 0) && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          {tips.length >= SEARCH_FROM && (
            <label className="relative sm:w-72">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
              <input
                type="search"
                placeholder="Search tips"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-black border border-zinc-800 pl-9 pr-3 py-2 text-base md:text-sm text-white outline-none focus:border-orange-500 placeholder:text-zinc-700"
              />
            </label>
          )}
          {tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {[null, ...tags].map((t) => (
                <button
                  key={t ?? "all"}
                  onClick={() => setFilter(t)}
                  className={`px-2.5 py-1.5 border text-[10px] font-black uppercase tracking-wider transition-colors ${
                    active === t
                      ? "border-orange-500 bg-orange-500 text-black"
                      : "border-zinc-800 text-zinc-500 hover:text-orange-400 hover:border-orange-500/40"
                  }`}
                >
                  {t ?? "All"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tips.length === 0 ? (
        !adding && (
          <div className="p-8 md:p-10 border border-dashed border-zinc-800 bg-black/20 text-center">
            <Lightbulb size={32} className="mx-auto mb-3 text-zinc-700" />
            <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Nothing to remember yet</p>
            <p className="text-zinc-600 text-[11px] mt-2 max-w-sm mx-auto">
              Keep the answers you looked up once, like how long creatine keeps once mixed, so you never search twice.
            </p>
            {adminMode ? (
              <button
                onClick={() => setAdding(true)}
                className="mt-5 inline-flex items-center gap-2 px-5 py-3 border border-orange-500/40 bg-orange-500/10 text-orange-400 text-xs font-black uppercase tracking-wider hover:bg-orange-500/20 transition-colors"
              >
                <Plus size={14} />
                Add your first tip
              </button>
            ) : (
              <p className="mt-4 text-[10px] uppercase tracking-wider text-zinc-600">Unlock in the menu (☰) to add one</p>
            )}
          </div>
        )
      ) : shown.length === 0 ? (
        <div className="p-6 border border-zinc-900 text-center text-xs text-zinc-500">
          No tips match.{" "}
          <button
            onClick={() => {
              setQuery("");
              setFilter(null);
            }}
            className="text-orange-400 underline underline-offset-2"
          >
            Show all
          </button>
        </div>
      ) : (
        <div className="columns-1 md:columns-2 gap-4">
          {shown.map((tip) => (
            <TipCard
              key={tip.id}
              tip={tip}
              tags={tags}
              adminMode={adminMode}
              onUpdate={(d) => queueOps([{ type: "update", id: tip.id, set: { title: d.title, body: d.body, tag: canonTag(d.tag) } }])}
              onRemove={() => queueOps([{ type: "remove", id: tip.id }])}
            />
          ))}
        </div>
      )}
    </section>
  );
}
