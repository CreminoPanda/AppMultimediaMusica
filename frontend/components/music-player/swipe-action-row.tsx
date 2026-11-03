"use client";

import { useRef, type ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ListPlus, Trash2 } from "lucide-react";

interface SwipeActionRowProps {
  action: "add" | "remove";
  onAction: () => void;
  disabled?: boolean;
  label?: string;
  children: ReactNode;
  className?: string;
}

const AXIS_LOCK = 8;

/**
 * One row that can be swiped horizontally. Vertical movement is left to the
 * native scroll, horizontal movement is locked to this row only.
 */
export function SwipeActionRow({
  action,
  onAction,
  disabled = false,
  label,
  children,
  className = "",
}: SwipeActionRowProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{
    x: number;
    y: number;
    pointerId: number;
    axis: "x" | "y" | null;
  } | null>(null);
  const didSwipeRef = useRef(false);
  const busyRef = useRef(false);

  const x = useMotionValue(0);
  const revealOpacity = useTransform(x, (value) =>
    Math.min(1, Math.abs(value) / 48),
  );
  const reduceMotion = useReducedMotion();

  const isAdd = action === "add";
  const text = label ?? (isAdd ? "Agregar a la cola" : "Quitar de la cola");
  const Icon = isAdd ? ListPlus : Trash2;

  const springBack = () => {
    animate(
      x,
      0,
      reduceMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 420, damping: 36 },
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ touchAction: "pan-y" }}
    >
      <motion.div
        aria-hidden
        style={{ opacity: revealOpacity }}
        className={`pointer-events-none absolute inset-0 flex items-center gap-2 px-4 text-[11px] font-bold ${
          isAdd
            ? "justify-start bg-emerald-500/90 text-white"
            : "justify-end bg-red-500/90 text-white"
        }`}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{text}</span>
      </motion.div>

      {!disabled && (
        <button
          type="button"
          onClick={onAction}
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-1/2 focus:z-20 focus:-translate-y-1/2 focus:rounded-lg focus:bg-black focus:px-3 focus:py-1.5 focus:text-[11px] focus:font-semibold focus:text-white"
        >
          {text}
        </button>
      )}

      <motion.div
        style={{ x, touchAction: "pan-y" }}
        onClickCapture={(event) => {
          if (!didSwipeRef.current) return;
          didSwipeRef.current = false;
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerDown={(event) => {
          if (disabled || busyRef.current) return;
          if (event.pointerType === "mouse" && event.button !== 0) return;
          startRef.current = {
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId,
            axis: null,
          };
          didSwipeRef.current = false;
        }}
        onPointerMove={(event) => {
          const start = startRef.current;
          if (!start || start.pointerId !== event.pointerId) return;

          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;

          if (!start.axis) {
            if (Math.abs(dx) < AXIS_LOCK && Math.abs(dy) < AXIS_LOCK) return;
            start.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";

            if (start.axis === "y") {
              startRef.current = null;
              return;
            }

            try {
              event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
              // Best effort only.
            }
          }

          const width = containerRef.current?.offsetWidth ?? 320;
          const limited = isAdd
            ? Math.max(0, Math.min(width, dx))
            : Math.min(0, Math.max(-width, dx));
          x.set(limited);
        }}
        onPointerUp={(event) => {
          const start = startRef.current;
          if (!start) return;

          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          startRef.current = null;

          if (start.axis !== "x") return;

          const width = containerRef.current?.offsetWidth ?? 320;
          const threshold = Math.max(72, width * 0.35);
          const rightDirection = dx > 0;

          if (rightDirection === isAdd && Math.abs(dx) >= threshold) {
            busyRef.current = true;
            didSwipeRef.current = true;

            if (isAdd) {
              onAction();
              busyRef.current = false;
              springBack();
            } else {
              animate(x, -width, { duration: reduceMotion ? 0 : 0.18 }).then(() => {
                onAction();
                x.set(0);
                busyRef.current = false;
              });
            }
            return;
          }

          if (Math.abs(dx) > AXIS_LOCK && Math.abs(dx) > Math.abs(dy)) {
            didSwipeRef.current = true;
          }
          springBack();
        }}
        onPointerCancel={() => {
          startRef.current = null;
          springBack();
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
