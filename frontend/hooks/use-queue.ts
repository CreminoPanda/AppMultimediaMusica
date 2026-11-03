"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  addToQueue,
  getQueue,
  playQueueItem,
  removeFromQueue,
  reorderQueue,
} from "@/lib/api";
import type { QueueState } from "@/lib/api";

type Notice = (message: string, tone?: "ok" | "error") => void;

interface UseQueueOptions {
  active: boolean;
  onNotice?: Notice;
}

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409;
}

export function useQueue({ active, onNotice }: UseQueueOptions) {
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const queueRef = useRef<QueueState | null>(null);
  const draggingRef = useRef(false);
  const inFlightRef = useRef(false);
  const noticeRef = useRef<Notice | undefined>(onNotice);
  noticeRef.current = onNotice;

  queueRef.current = queue;

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    if (draggingRef.current) return;
    inFlightRef.current = true;

    try {
      const data = await getQueue();
      setQueue(data);
      setUnavailable(false);
      setError(null);
    } catch (fetchError) {
      if (fetchError instanceof ApiError && fetchError.status === 404) {
        setUnavailable(true);
        setQueue(null);
      } else {
        setError(messageFrom(fetchError));
      }
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;

    if (!queueRef.current) setLoading(true);
    refresh();

    const interval = setInterval(() => {
      if (!draggingRef.current) refresh();
    }, 1800);

    return () => clearInterval(interval);
  }, [active, refresh]);

  const add = useCallback(
    async (ids: string[]): Promise<boolean> => {
      if (ids.length === 0) return false;

      try {
        await addToQueue(ids);
        await refresh();
        noticeRef.current?.("Agregado a la cola");
        return true;
      } catch (addError) {
        noticeRef.current?.(messageFrom(addError), "error");
        return false;
      }
    },
    [refresh],
  );

  const removeAt = useCallback(
    async (index: number) => {
      const previous = queueRef.current;
      if (!previous) return;

      if (index === previous.index) {
        noticeRef.current?.("La canción actual no se puede quitar", "error");
        return;
      }

      const optimistic: QueueState = {
        ...previous,
        index: index < previous.index ? previous.index - 1 : previous.index,
        items: previous.items.filter((_, itemIndex) => itemIndex !== index),
      };
      setQueue(optimistic);

      try {
        await removeFromQueue(index, previous.generation);
        await refresh();
      } catch (removeError) {
        setQueue(previous);
        if (isConflict(removeError)) {
          await refresh();
          noticeRef.current?.("La cola cambió. Se actualizó.", "error");
        } else {
          noticeRef.current?.(messageFrom(removeError), "error");
        }
      }
    },
    [refresh],
  );

  const reorder = useCallback(
    async (from: number, to: number) => {
      const previous = queueRef.current;
      if (!previous || from === to) return;

      const items = [...previous.items];
      const [moved] = items.splice(from, 1);
      if (!moved) return;
      items.splice(to, 0, moved);

      setQueue({ ...previous, items });

      try {
        await reorderQueue(from, to, previous.generation);
        await refresh();
      } catch (reorderError) {
        setQueue(previous);
        if (isConflict(reorderError)) {
          await refresh();
          noticeRef.current?.("La cola cambió. Se actualizó.", "error");
        } else {
          noticeRef.current?.(messageFrom(reorderError), "error");
        }
      }
    },
    [refresh],
  );

  const playAt = useCallback(
    async (index: number) => {
      const previous = queueRef.current;
      if (!previous) return;

      try {
        await playQueueItem(index, previous.generation);
        setQueue({
          ...previous,
          index,
          isPlaying: true,
        });
        setTimeout(refresh, 250);
      } catch (playError) {
        noticeRef.current?.(messageFrom(playError), "error");
      }
    },
    [refresh],
  );

  const setDragging = useCallback((value: boolean) => {
    draggingRef.current = value;
  }, []);

  return {
    queue,
    loading,
    error,
    unavailable,
    refresh,
    add,
    removeAt,
    reorder,
    playAt,
    setDragging,
  };
}
