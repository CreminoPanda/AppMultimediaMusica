"use client";

import { memo, useCallback, useMemo, useRef } from "react";
import { Reorder, useDragControls } from "framer-motion";
import {
  AlertCircle,
  Disc3,
  GripVertical,
  ListMusic,
  Loader2,
  Music2,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "./section-pager";
import type { SwipeHandlers } from "./section-pager";
import { SwipeActionRow } from "./swipe-action-row";
import type { QueueItem, QueueState } from "@/lib/api";

interface QueuePanelProps {
  queue: QueueState | null;
  loading: boolean;
  error: string | null;
  unavailable: boolean;
  swipe: SwipeHandlers;
  onRefresh: () => void;
  onPlayAt: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (from: number, to: number) => void;
  onDragChange: (dragging: boolean) => void;
}

// The player keeps a rolling buffer; the APK shows that window, not the whole
// library behind it.
const QUEUE_WINDOW = 50;

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return "";
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`;
}

function Cover({ src, alt }: { src?: string; alt: string }) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-white/5">
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/30">
          <Music2 className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}

const FutureRow = memo(function FutureRow({
  item,
  localIndex,
  absoluteIndex,
  onPlay,
  onRemove,
  onDragStart,
  onDragEnd,
}: {
  item: QueueItem;
  localIndex: number;
  absoluteIndex: number;
  onPlay: (index: number) => void;
  onRemove: (index: number) => void;
  onDragStart: (localIndex: number) => void;
  onDragEnd: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={item}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      className="list-none"
    >
      <SwipeActionRow action="remove" onAction={() => onRemove(absoluteIndex)}>
        <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-white/5">
          <button
            type="button"
            onClick={() => onPlay(absoluteIndex)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
          >
            <span className="w-4 shrink-0 text-center text-[10px] tabular-nums text-white/30">
              {localIndex + 1}
            </span>
            <Cover src={item.coverUrl} alt={item.title} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">
                {item.title}
              </p>
              <p className="truncate text-[10px] text-white/40">
                {item.artists.join(", ") || item.album || "Sin artista"}
              </p>
            </div>
            <span className="text-[10px] tabular-nums text-white/30">
              {formatDuration(item.duration)}
            </span>
          </button>

          <button
            type="button"
            onPointerDown={(event) => {
              event.stopPropagation();
              onDragStart(localIndex);
              controls.start(event);
            }}
            onPointerUp={onDragEnd}
            className="flex h-9 w-7 shrink-0 items-center justify-center rounded-lg text-white/25 transition-colors hover:bg-white/5 hover:text-white/60"
            aria-label={`Reordenar ${item.title}`}
            style={{ touchAction: "none" }}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </div>
      </SwipeActionRow>
    </Reorder.Item>
  );
});

export function QueuePanel({
  queue,
  loading,
  error,
  unavailable,
  swipe,
  onRefresh,
  onPlayAt,
  onRemove,
  onReorder,
  onDragChange,
}: QueuePanelProps) {
  const dragFromRef = useRef<number | null>(null);

  const windowItems = useMemo(() => {
    if (!queue) return [];
    const start = Math.max(0, queue.index);
    return queue.items.slice(start, start + QUEUE_WINDOW);
  }, [queue]);

  const current =
    queue && queue.index >= 0 ? windowItems[0] ?? null : null;
  const future =
    queue && queue.index >= 0 ? windowItems.slice(1) : windowItems;

  const beginDrag = useCallback(
    (localIndex: number) => {
      dragFromRef.current = localIndex;
      onDragChange(true);
    },
    [onDragChange],
  );

  const endDrag = useCallback(() => {
    onDragChange(false);
  }, [onDragChange]);

  const handleReorder = useCallback(
    (next: QueueItem[]) => {
      const fromLocal = dragFromRef.current;
      dragFromRef.current = null;
      endDrag();

      if (fromLocal === null || !queue) return;

      const moved = future[fromLocal];
      if (!moved) return;

      const toLocal = next.indexOf(moved);
      if (toLocal < 0 || toLocal === fromLocal) return;

      const base = queue.index + 1;
      onReorder(base + fromLocal, base + toLocal);
    },
    [endDrag, future, onReorder, queue],
  );

  const subtitle = queue
    ? `${windowItems.length} ${
        windowItems.length === 1 ? "canción" : "canciones"
      }`
    : undefined;

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Cola" subtitle={subtitle} swipe={swipe} />

      <div className="settings-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-24">
        {unavailable ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
            <ListMusic className="h-8 w-8 text-white/30" />
            <p className="text-sm font-semibold text-white/70">
              Cola no disponible
            </p>
            <p className="text-xs text-white/35">
              El reproductor no expone los endpoints de la cola.
            </p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-1 flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-white/80"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        ) : error ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 px-6 text-center">
            <AlertCircle className="h-8 w-8 text-red-400/60" />
            <p className="text-xs text-red-300">{error}</p>
            <button
              type="button"
              onClick={onRefresh}
              className="mt-1 flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-white/80"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reintentar
            </button>
          </div>
        ) : loading && !queue ? (
          <div className="flex min-h-[260px] items-center justify-center gap-2 text-white/40">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <span className="text-xs">Cargando cola...</span>
          </div>
        ) : !queue || queue.items.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 px-6 text-center text-white/35">
            <Disc3 className="h-8 w-8" />
            <p className="text-xs">La cola está vacía.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {current && (
              <div className="space-y-1">
                <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Sonando
                </p>
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.07] p-2.5">
                  <Cover src={current.coverUrl} alt={current.title} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {current.title}
                    </p>
                    <p className="truncate text-[10px] text-white/45">
                      {current.artists.join(", ") ||
                        current.album ||
                        "Sin artista"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300">
                    Sonando
                  </span>
                </div>
              </div>
            )}

            {future.length === 0 ? (
              <div className="flex min-h-[120px] flex-col items-center justify-center gap-2 px-6 text-center text-white/35">
                <ListMusic className="h-6 w-6" />
                <p className="text-xs">No hay más canciones en la cola.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  A continuación
                </p>
                <Reorder.Group
                  axis="y"
                  values={future}
                  onReorder={handleReorder}
                  className="space-y-1"
                >
                  {future.map((item, localIndex) => (
                    <FutureRow
                      key={`${item.id}-${localIndex}`}
                      item={item}
                      localIndex={localIndex}
                      absoluteIndex={queue.index + 1 + localIndex}
                      onPlay={onPlayAt}
                      onRemove={onRemove}
                      onDragStart={beginDrag}
                      onDragEnd={endDrag}
                    />
                  ))}
                </Reorder.Group>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
