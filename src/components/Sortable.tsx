"use client";

// Drag to rearrange, built to work with a finger.
//
// The earlier version drove framer-motion's Reorder from a pointerdown on a
// small grip. On a phone that fights the list's own scrolling: iOS decides
// between scrolling and dragging within the first few pixels, and a drag that
// starts a moment late is already a scroll, which is why rearranging on the
// phone was a mess.
//
// Here a touch has to rest for a moment before anything is picked up. Until
// then the finger scrolls as usual; once the item is lifted, scrolling is held
// off for the rest of the gesture. A mouse skips the wait and starts after a
// few pixels of travel, so a click still opens what it always opened.

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/** Hold this long before a touch becomes a drag. Long enough to scroll past. */
const TOUCH_DELAY_MS = 180;
/** Finger wobble allowed during that hold, in pixels. */
const TOUCH_TOLERANCE = 8;
/** Mouse travel before a press counts as a drag rather than a click. */
const MOUSE_DISTANCE = 5;

const EnabledContext = createContext(false);

/**
 * A grid that has collapsed to one column behaves like a list, and reads much
 * better with the list strategy: tall cards shift as you drag, and the rect
 * strategy then drops them a slot too far.
 */
const NARROW = "(max-width: 767px)";

function useOneColumn(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia(NARROW);
      query.addEventListener("change", notify);
      return () => query.removeEventListener("change", notify);
    },
    () => window.matchMedia(NARROW).matches,
    () => false
  );
}

interface SortableListProps {
  /** Item ids, in the order shown. */
  ids: string[];
  /** The new order, once the item is dropped somewhere else. */
  onReorder: (ids: string[]) => void;
  /** Off while sorting or searching, when the shown order is not the stored one. */
  enabled?: boolean;
  /** A list runs vertically; a grid can be rearranged in both directions. */
  layout?: "list" | "grid";
  children: ReactNode;
  onDragStateChange?: (draggingId: string | null) => void;
}

export function SortableList({
  ids,
  onReorder,
  enabled = true,
  layout = "list",
  children,
  onDragStateChange,
}: SortableListProps) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: MOUSE_DISTANCE } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DELAY_MS, tolerance: TOUCH_TOLERANCE },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const oneColumn = useOneColumn();
  const asGrid = layout === "grid" && !oneColumn;

  const strategy = asGrid ? rectSortingStrategy : verticalListSortingStrategy;
  const modifiers = useMemo(
    () => (asGrid ? [restrictToParentElement] : [restrictToVerticalAxis]),
    [asGrid]
  );

  const handleStart = (event: DragStartEvent) => {
    onDragStateChange?.(String(event.active.id));
  };

  const handleEnd = (event: DragEndEvent) => {
    onDragStateChange?.(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorder(next);
  };

  if (!enabled) return <EnabledContext.Provider value={false}>{children}</EnabledContext.Provider>;

  return (
    <EnabledContext.Provider value={true}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        modifiers={modifiers}
        onDragStart={handleStart}
        onDragEnd={handleEnd}
        onDragCancel={() => onDragStateChange?.(null)}
      >
        <SortableContext items={ids} strategy={strategy}>
          {children}
        </SortableContext>
      </DndContext>
    </EnabledContext.Provider>
  );
}

export interface SortableHandleProps {
  /** Spread on whatever the person grabs: a grip, or the whole card. */
  handle: Record<string, unknown>;
  setNodeRef: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
  isDragging: boolean;
  /** True when this list is actually rearrangeable right now. */
  enabled: boolean;
}

/**
 * One rearrangeable item. `handle` carries the listeners: put it on a grip for
 * a list of rows, or on the whole element for cards.
 */
export function useSortableItem(id: string): SortableHandleProps {
  const enabled = useContext(EnabledContext);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !enabled,
  });

  return {
    enabled,
    isDragging,
    setNodeRef,
    handle: enabled ? { ...attributes, ...listeners } : {},
    style: {
      transform: CSS.Transform.toString(transform),
      transition,
      // Lifted items ride above the rest and ignore pointer tests.
      ...(isDragging ? { zIndex: 50, opacity: 0.85, cursor: "grabbing" } : {}),
      // Stops iOS offering to select text or showing the callout menu on a hold.
      WebkitTouchCallout: "none",
      WebkitUserSelect: "none",
      userSelect: "none",
    } as React.CSSProperties,
  };
}
