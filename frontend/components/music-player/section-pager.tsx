"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const HINT_KEY = "sections_hint_seen";
const SWIPE_THRESHOLD = 48;
const AXIS_LOCK = 8;

export interface SwipeHandlers {
  onPointerDown: React.PointerEventHandler<HTMLElement>;
  onPointerMove: React.PointerEventHandler<HTMLElement>;
  onPointerUp: React.PointerEventHandler<HTMLElement>;
  onPointerCancel: React.PointerEventHandler<HTMLElement>;
}

/**
 * Horizontal pager gesture. Only attach it to the header (and a few free
 * areas) — never to lists, sliders or lyrics.
 */
export function useSectionSwipe(
  activeIndex: number,
  count: number,
  onChange: (index: number) => void,
  onActivity?: () => void,
): SwipeHandlers {
  const startRef = useRef<{
    x: number;
    y: number;
    pointerId: number;
    axis: "x" | "y" | null;
  } | null>(null);

  const activeRef = useRef(activeIndex);
  const changeRef = useRef(onChange);
  const activityRef = useRef(onActivity);
  activeRef.current = activeIndex;
  changeRef.current = onChange;
  activityRef.current = onActivity;

  return useMemo(() => {
    const reset = () => {
      startRef.current = null;
    };

    return {
      onPointerDown: (event) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        startRef.current = {
          x: event.clientX,
          y: event.clientY,
          pointerId: event.pointerId,
          axis: null,
        };
      },
      onPointerMove: (event) => {
        const start = startRef.current;
        if (!start || start.pointerId !== event.pointerId) return;

        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;

        if (!start.axis) {
          if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
          start.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
          if (start.axis === "x") {
            activityRef.current?.();
            try {
              (event.currentTarget as HTMLElement).setPointerCapture(
                event.pointerId,
              );
            } catch {
              // Pointer capture is a best-effort optimization.
            }
          }
        }
      },
      onPointerUp: (event) => {
        const start = startRef.current;
        if (!start) return;

        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        reset();

        if (start.axis !== "x") return;
        if (Math.abs(dx) < SWIPE_THRESHOLD) return;
        if (Math.abs(dx) <= Math.abs(dy) * 1.2) return;

        // Circular: swiping past either edge wraps to the other end.
        const direction = dx < 0 ? 1 : -1;
        const next = (activeRef.current + direction + count) % count;
        changeRef.current(next);
      },
      onPointerCancel: reset,
    };
  }, [count]);
}

interface SectionPagerProps {
  activeIndex: number;
  onChange: (index: number) => void;
  labels: string[];
  activity: number;
  swipe: SwipeHandlers;
  children: React.ReactNode[];
}

/** Shortest circular distance: -2..2 for five sections. */
function relativeOffset(index: number, activeIndex: number, count: number): number {
  let distance = (index - activeIndex) % count;
  if (distance > count / 2) distance -= count;
  if (distance < -count / 2) distance += count;
  return distance;
}

export function SectionPager({
  activeIndex,
  onChange,
  labels,
  activity,
  swipe,
  children,
}: SectionPagerProps) {
  const [indicatorVisible, setIndicatorVisible] = useState(true);
  const [hintSeen, setHintSeen] = useState(true);
  const previousIndexRef = useRef(activeIndex);
  const previousOffsetsRef = useRef<number[] | null>(null);

  const offsets = children.map((_, index) =>
    relativeOffset(index, activeIndex, children.length),
  );
  const previousOffsets = previousOffsetsRef.current ?? offsets;
  const jumped = offsets.map(
    (offset, index) => Math.abs(offset - (previousOffsets[index] ?? offset)) > 1,
  );

  useEffect(() => {
    previousOffsetsRef.current = offsets;
  });

  useEffect(() => {
    try {
      setHintSeen(localStorage.getItem(HINT_KEY) === "1");
    } catch {
      setHintSeen(true);
    }
  }, []);

  useEffect(() => {
    if (previousIndexRef.current === activeIndex) return;
    previousIndexRef.current = activeIndex;
    setHintSeen(true);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      // Private mode can block storage; the hint just shows again.
    }
  }, [activeIndex]);

  useEffect(() => {
    setIndicatorVisible(true);
    const timer = setTimeout(() => setIndicatorVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [activeIndex, activity]);

  const goTo = useCallback(
    (index: number) => {
      if (index === activeIndex) return;
      onChange(index);
      if (!hintSeen) {
        setHintSeen(true);
        try {
          localStorage.setItem(HINT_KEY, "1");
        } catch {
          // Private mode can block storage; the hint just shows again.
        }
      }
    },
    [activeIndex, hintSeen, onChange],
  );

  return (
    <div className="relative h-full w-full overflow-hidden">
      {children.map((child, index) => {
        const offset = offsets[index];
        const transition = jumped[index]
          ? { duration: 0 }
          : { type: "spring" as const, stiffness: 320, damping: 34, mass: 0.9 };

        return (
          <motion.div
            key={index}
            className="absolute inset-0 h-full w-full will-change-transform"
            initial={false}
            animate={{ x: `${offset * 100}%` }}
            transition={transition}
            style={{
              zIndex: offset === 0 ? 2 : 1,
              pointerEvents: offset === 0 ? "auto" : "none",
            }}
            aria-hidden={offset !== 0}
          >
            {child}
          </motion.div>
        );
      })}

      <AnimatePresence>
        {!hintSeen && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+78px)] z-40 px-8 text-center text-[11px] font-medium text-white/60"
          >
            Desliza para cambiar de sección
          </motion.p>
        )}
      </AnimatePresence>

      {/* Page indicator: top of the screen, tappable. */}
      <motion.nav
        aria-label="Secciones"
        className="absolute inset-x-0 top-0 z-40 flex justify-center pt-[max(env(safe-area-inset-top),8px)]"
        animate={{ opacity: indicatorVisible ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ pointerEvents: indicatorVisible ? "auto" : "none" }}
      >
        <div className="flex items-center">
          {labels.map((label, index) => {
            const active = index === activeIndex;
            return (
              <button
                key={label}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ir a ${label}`}
                aria-current={active ? "page" : undefined}
                className="flex h-9 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <motion.span
                  animate={{
                    width: active ? 20 : 6,
                    opacity: active ? 1 : 0.35,
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="block h-1.5 rounded-full bg-white"
                />
              </button>
            );
          })}
        </div>
      </motion.nav>

      {/* Swipe strip: bottom of the screen, transparent. */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 z-30 flex h-[calc(env(safe-area-inset-bottom)+64px)] items-center justify-center bg-transparent"
        style={{ touchAction: "pan-y" }}
        {...swipe}
      >
        <span className="h-1 w-10 rounded-full bg-white/30" />
      </div>
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  swipe?: SwipeHandlers;
  children?: React.ReactNode;
}

/** Section title at the top. The swipe affordance lives in the bottom strip. */
export function PageHeader({ title, subtitle, swipe, children }: PageHeaderProps) {
  return (
    <header
      className="relative flex flex-shrink-0 select-none items-center bg-transparent px-5 pb-2"
      style={{
        paddingTop: "calc(max(env(safe-area-inset-top), 8px) + 40px)",
        background: "transparent",
        touchAction: "pan-y",
      }}
      {...swipe}
    >
      <div className="min-w-0 flex-1">
        <h1
          className="truncate text-[22px] font-bold tracking-tight text-white"
          style={{ color: "#ffffff" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="truncate text-[11px] font-medium text-white/55">
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </header>
  );
}
