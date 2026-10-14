"use client";
import { useRef, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, type PanInfo } from "framer-motion";
import { Trash2 } from "lucide-react";

// Swipe a row to the left to delete it: a finger on a phone, or press and drag
// with a mouse. Only the row's transform moves, so it costs nothing while idle
// and stays smooth while dragging. Vertical scrolling is left to the browser.

/** Pulled at least this far, the row goes. */
const DISTANCE = 110;
/** Or flicked this fast, once it has moved a little. */
const FLICK = 650;

interface SwipeToDeleteProps {
  onDelete: () => void;
  disabled?: boolean;
  /** Classes for the row itself (its background must be opaque). */
  className?: string;
  children: ReactNode;
}

export const SwipeToDelete = ({ onDelete, disabled, className = "", children }: SwipeToDeleteProps) => {
  const x = useMotionValue(0);
  const hint = useTransform(x, [-DISTANCE, -12, 0], [1, 0.35, 0]);
  const iconScale = useTransform(x, [-DISTANCE, -40], [1.15, 0.8]);
  const box = useRef<HTMLDivElement>(null);
  // A drag must never also count as a tap on the tick box or the text.
  const dragged = useRef(false);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    setTimeout(() => (dragged.current = false), 0);
    const gone = info.offset.x < -DISTANCE || (info.velocity.x < -FLICK && info.offset.x < -30);
    if (gone) {
      const width = box.current?.offsetWidth ?? 400;
      animate(x, -width, { duration: 0.16, ease: "easeIn" }).then(onDelete);
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
    }
  };

  return (
    <div ref={box} className="relative overflow-hidden flex-1 min-w-0">
      <motion.div
        aria-hidden
        style={{ opacity: hint }}
        className="absolute inset-0 flex items-center justify-end pr-5 bg-rose-400/15 text-rose-200/80"
      >
        <motion.span style={{ scale: iconScale }} className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider">
          <Trash2 size={14} /> Delete
        </motion.span>
      </motion.div>

      <motion.div
        drag={disabled ? false : "x"}
        dragDirectionLock
        dragConstraints={{ right: 0 }}
        dragElastic={0}
        dragMomentum={false}
        onDragStart={() => (dragged.current = true)}
        onDragEnd={onDragEnd}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
        style={{ x, touchAction: "pan-y" }}
        className={`relative ${className}`}
      >
        {children}
      </motion.div>
    </div>
  );
};
