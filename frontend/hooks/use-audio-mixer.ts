"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ApiError,
  getAudio,
  setMasterVolume,
  setMusicVolume,
  setSessionVolume,
} from "@/lib/api";
import type { AudioState } from "@/lib/api";

export type MixerStatus =
  | "idle"
  | "loading"
  | "ready"
  | "unavailable"
  | "unsupported"
  | "error";

export interface AudioOverride {
  volume: number;
  muted?: boolean;
}

type Notice = (message: string, tone?: "ok" | "error") => void;

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function serverVolume(state: AudioState, key: string): number | undefined {
  if (key === "music") return state.music.volume;
  if (key === "master") return state.master.volume;
  if (key.startsWith("session:")) {
    return state.sessions.find((session) => `session:${session.id}` === key)?.volume;
  }
  return undefined;
}

function serverMuted(state: AudioState, key: string): boolean | undefined {
  if (key === "master") return state.master.muted;
  if (key.startsWith("session:")) {
    return state.sessions.find((session) => `session:${session.id}` === key)?.muted;
  }
  return undefined;
}

export function useAudioMixer(active: boolean, onNotice?: Notice) {
  const [audio, setAudio] = useState<AudioState | null>(null);
  const [status, setStatus] = useState<MixerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, AudioOverride>>({});

  const overridesRef = useRef(overrides);
  const interactingRef = useRef(0);
  const inFlightRef = useRef(false);
  const audioRef = useRef<AudioState | null>(null);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const noticeRef = useRef<Notice | undefined>(onNotice);

  overridesRef.current = overrides;
  audioRef.current = audio;
  noticeRef.current = onNotice;

  const clearMatchedOverrides = useCallback((data: AudioState) => {
    const current = overridesRef.current;
    const next = { ...current };
    let changed = false;

    for (const [key, draft] of Object.entries(current)) {
      const volume = serverVolume(data, key);
      const muted = serverMuted(data, key);
      const volumeMatches = volume !== undefined && Math.abs(volume - draft.volume) < 1;
      const mutedMatches = draft.muted === undefined || draft.muted === muted;

      if (volumeMatches && mutedMatches) {
        delete next[key];
        changed = true;
      }
    }

    if (changed) {
      overridesRef.current = next;
      setOverrides(next);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    if (!audioRef.current) setStatus("loading");

    try {
      const data = await getAudio();
      setAudio(data);
      audioRef.current = data;
      setError(null);
      setStatus(data.supported ? "ready" : "unsupported");
      clearMatchedOverrides(data);
    } catch (fetchError) {
      if (fetchError instanceof ApiError && fetchError.status === 404) {
        setStatus("unavailable");
        setAudio(null);
        audioRef.current = null;
      } else {
        setError(messageFrom(fetchError));
        setStatus(audioRef.current ? "ready" : "error");
      }
    } finally {
      inFlightRef.current = false;
    }
  }, [clearMatchedOverrides]);

  useEffect(() => {
    if (!active) return;

    refresh();

    const interval = setInterval(() => {
      if (interactingRef.current === 0) refresh();
    }, 1800);

    return () => clearInterval(interval);
  }, [active, refresh]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of Object.values(timers)) clearTimeout(timer);
    };
  }, []);

  const update = useCallback(
    (
      key: string,
      patch: AudioOverride,
      send: () => Promise<void>,
    ) => {
      const next = { ...overridesRef.current, [key]: patch };
      overridesRef.current = next;
      setOverrides(next);

      const timers = timersRef.current;
      if (timers[key]) clearTimeout(timers[key]);

      timers[key] = setTimeout(async () => {
        try {
          await send();
        } catch (sendError) {
          noticeRef.current?.(messageFrom(sendError), "error");
        }
      }, 120);
    },
    [],
  );

  const setMusic = useCallback(
    (volume: number) => {
      update("music", { volume }, () => setMusicVolume(volume));
    },
    [update],
  );

  const setMaster = useCallback(
    (volume: number, muted: boolean) => {
      update("master", { volume, muted }, () => setMasterVolume(volume, muted));
    },
    [update],
  );

  const setSession = useCallback(
    (id: string, volume: number, muted: boolean) => {
      update(
        `session:${id}`,
        { volume, muted },
        () => setSessionVolume(id, volume, muted),
      );
    },
    [update],
  );

  const beginInteraction = useCallback(() => {
    interactingRef.current += 1;
  }, []);

  const endInteraction = useCallback(() => {
    interactingRef.current = Math.max(0, interactingRef.current - 1);
  }, []);

  return {
    audio,
    status,
    error,
    overrides,
    refresh,
    setMusic,
    setMaster,
    setSession,
    beginInteraction,
    endInteraction,
  };
}
