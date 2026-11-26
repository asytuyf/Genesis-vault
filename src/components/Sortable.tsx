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
//
// A lifted item only ever moves, never changes size. Left to itself the
// library stretches it to the height of whatever it passes over, so a one-line
// to-do crossing a two-line one grew by half and snapped back at every row,
// which read as shaking (worst in Safari, which redraws stretched text
// roughly). It also stays inside the visible list: dragged past the bottom it
// used to make the list longer, which made it scroll, which made it longer.
//
// A list can also drag a floating copy instead of the row itself (give it
// renderOverlay). The copy lives outside the scrolling list, on top of the
// page, so the list scrolling under it near an edge cannot make it tremble;
// the row stays behind as a faint placeholder showing where it will land.
//
// Rows are measured when a drag starts, not on every movement: a trackpad
// held down sends a steady stream of tiny movements, and re-measuring every
// row for each one kept a long list redrawing (and shimmering) while still.
// The drop zone does not need it either: it is checked against where it is
// on screen at that moment.

import { createContext, useContext, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { restrictToFirstScrollableAncestor, restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
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
/**
 * Scrolling by itself while dragging, for a finger only: in the outer tenth of
 * the list, at an easy pace. With a mouse the list never scrolls on its own,
 * since a list that keeps scrolling (and rows that keep stepping aside as new
 * ones pass under the pointer) while the mouse is held still near an edge
 * reads as everything shaking. The wheel or trackpad scrolls it mid-drag
 * instead, so nothing moves unless you move it.
 */
const TOUCH_AUTO_SCROLL = { threshold: { x: 0, y: 0.1 }, acceleration: 3 };
const startedByTouch = (event: Event | null): boolean => !!event && event.type.startsWith("touch");
/**
 * Rows that also swipe sideways (to delete) only lift on an up-or-down pull:
 * a mouse that heads sideways first is left to the swipe.
 */
const ROW_MOUSE = { distance: { y: MOUSE_DISTANCE }, tolerance: { x: 8 } };

const EnabledContext = createContext(false);
/** The list drags a floating copy, so the row itself only marks the spot. */
const OverlayContext = createContext(false);
/** How the floating copy settles into place on drop. */
const DROP_ANIMATION = { duration: 180, easing: "cubic-bezier(0.2, 0, 0, 1)" };

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
  /** The rows also swipe left, so a sideways pull must not lift them. */
  swipeRows?: boolean;
  /**
   * An extra place to drop an item, outside the list (see DropZone). Dropped
   * there, the item is handed to onDropZone instead of being reordered.
   */
  dropZoneId?: string;
  onDropZone?: (id: string) => void;
  children: ReactNode;
  onDragStateChange?: (draggingId: string | null) => void;
  /** What follows the pointer while an item is dragged, instead of the item itself. */
  renderOverlay?: (id: string) => ReactNode;
}

export function SortableList({
  ids,
  onReorder,
  enabled = true,
  layout = "list",
  swipeRows = false,
  dropZoneId,
  onDropZone,
  children,
  onDragStateChange,
  renderOverlay,
}: SortableListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [touchDrag, setTouchDrag] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: swipeRows ? ROW_MOUSE : { distance: MOUSE_DISTANCE } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: TOUCH_DELAY_MS, tolerance: TOUCH_TOLERANCE },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const oneColumn = useOneColumn();
  const asGrid = layout === "grid" && !oneColumn;

  const strategy = asGrid ? rectSortingStrategy : verticalListSortingStrategy;
  const modifiers = useMemo(
    () => (asGrid ? [restrictToParentElement] : [restrictToVerticalAxis, restrictToFirstScrollableAncestor]),
    [asGrid]
  );

  const handleStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
    setTouchDrag(startedByTouch(event.activatorEvent));
    onDragStateChange?.(String(event.active.id));
  };

  // The drop zone counts only while the finger (or pointer) is really inside
  // it; everywhere else the list sorts as usual and ignores the zone. Where it
  // is gets read off the screen each time: it stays pinned to the top while
  // the list scrolls, and the library's own record of it moves with the
  // scroll, so after any scrolling the zone could no longer be hit.
  const collision = useMemo<CollisionDetection>(() => {
    if (!dropZoneId) return closestCorners;
    return (args) => {
      const zone = args.droppableContainers.find((c) => c.id === dropZoneId);
      const el = zone?.node.current;
      const p = args.pointerCoordinates;
      if (zone && el && p && !zone.disabled) {
        const r = el.getBoundingClientRect();
        if (p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom) {
          return [{ id: dropZoneId, data: { droppableContainer: zone, value: 0 } }];
        }
      }
      return closestCorners({
        ...args,
        droppableContainers: args.droppableContainers.filter((c) => c.id !== dropZoneId),
      });
    };
  }, [dropZoneId]);

  const handleEnd = (event: DragEndEvent) => {
    setActiveId(null);
    onDragStateChange?.(null);
    const { active, over } = event;
    if (over && dropZoneId && over.id === dropZoneId) {
      onDropZone?.(String(active.id));
      return;
    }
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
    <OverlayContext.Provider value={!!renderOverlay}>
      <DndContext
        sensors={sensors}
        collisionDetection={collision}
        modifiers={modifiers}
        autoScroll={touchDrag ? TOUCH_AUTO_SCROLL : false}
        onDragStart={handleStart}
        onDragEnd={handleEnd}
        onDragCancel={() => {
          setActiveId(null);
          onDragStateChange?.(null);
        }}
      >
        <SortableContext items={ids} strategy={strategy}>
          {children}
        </SortableContext>
        {/* On the page itself, not inside a window that may be moved or scaled
            by its own animation, which would throw the copy off the pointer. */}
        {renderOverlay &&
          typeof document !== "undefined" &&
          createPortal(
            // Lets the wheel and trackpad reach the list under the copy, so it
            // can be scrolled mid-drag.
            <DragOverlay dropAnimation={DROP_ANIMATION} zIndex={950} style={{ pointerEvents: "none" }}>
              {activeId ? renderOverlay(activeId) : null}
            </DragOverlay>,
            document.body
          )}
      </DndContext>
    </OverlayContext.Provider>
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
  const overlay = useContext(OverlayContext);
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
      // Translate only: no scaling to the size of the item underneath.
      transform: CSS.Translate.toString(transform),
      transition,
      // Lifted items ride above the rest and ignore pointer tests. With a
      // floating copy, the row left behind is only a faint marker.
      ...(isDragging ? (overlay ? { opacity: 0.25 } : { zIndex: 50, opacity: 0.85, cursor: "grabbing" }) : {}),
      // Stops iOS offering to select text or showing the callout menu on a hold.
      WebkitTouchCallout: "none",
      WebkitUserSelect: "none",
      userSelect: "none",
    } as React.CSSProperties,
  };
}

/**
 * A place to drop a dragged item that is not a slot in the list. Render it
 * inside the SortableList whose dropZoneId it carries; it renders whatever it
 * is given, told whether an item is hovering over it.
 */
export function DropZone({
  id,
  active,
  children,
}: {
  id: string;
  /** Only listens while something is being dragged. */
  active: boolean;
  children: (isOver: boolean, ref: (node: HTMLElement | null) => void) => ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, disabled: !active });
  return <>{children(isOver, setNodeRef)}</>;
}
