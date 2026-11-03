"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getNowPlaying,
  playPause,
  nextTrack,
  previousTrack,
  seek,
  getLyrics,
} from "@/lib/api";
import type { NowPlayingResponse } from "@/lib/api";

interface Lyric {
  time: number;
  text: string;
}

const disconnectedSong: NowPlayingResponse = {
  isPlaying: false,
  title: "Reproductor desconectado",
  artists: ["Revisa la IP y el puerto del reproductor"],
  album: "",
};

function parseSyncedLyrics(value: string): Lyric[] {
  return value
    .split("\n")
    .map((line) => {
      const match = line.match(/\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\](.*)/);
      if (!match) return null;

      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const fractionText = match[3] ?? "0";
      const fraction =
        fractionText.length === 1
          ? parseInt(fractionText, 10) / 10
          : fractionText.length === 2
            ? parseInt(fractionText, 10) / 100
            : parseInt(fractionText, 10) / 1000;
      const text = match[4].trim();

      return text ? { time: minutes * 60 + seconds + fraction, text } : null;
    })
    .filter((lyric): lyric is Lyric => lyric !== null);
}

export function usePlayer(pollInterval = 2000) {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingResponse>({ isPlaying: false });
  const [currentTime, setCurrentTime] = useState(0);
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [songChanged, setSongChanged] = useState(0);
  const prevSongIdRef = useRef<string | undefined>(undefined);
  const inFlightRef = useRef(false);

  const fetchNowPlaying = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const data = await getNowPlaying();

      if (data.error) {
        setConnected(false);
        setError(data.error);
        setNowPlaying(disconnectedSong);
        return;
      }

      setConnected(true);
      setError(null);

      if (data.id && data.id !== prevSongIdRef.current) {
        prevSongIdRef.current = data.id;
        setCurrentTime(0);
        setSongChanged((value) => value + 1);
        setLyrics([]);
      }

      setNowPlaying(data);
      if (data.progress !== undefined) {
        setCurrentTime(data.progress / 1000);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setConnected(false);
      setError(message);
      setNowPlaying(disconnectedSong);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, pollInterval);
    return () => clearInterval(interval);
  }, [fetchNowPlaying, pollInterval]);

  useEffect(() => {
    if (nowPlaying.isPlaying && nowPlaying.duration) {
      const interval = setInterval(() => {
        setCurrentTime((previous) => {
          const next = previous + 0.25;
          return next >= nowPlaying.duration! / 1000
            ? nowPlaying.duration! / 1000
            : next;
        });
      }, 250);
      return () => clearInterval(interval);
    }
  }, [nowPlaying.isPlaying, nowPlaying.duration]);

  const handlePlayPause = useCallback(async () => {
    try {
      await playPause();
    } catch {
      // The next poll updates the connection state.
    } finally {
      setTimeout(fetchNowPlaying, 300);
    }
  }, [fetchNowPlaying]);

  const handleNext = useCallback(async () => {
    try {
      await nextTrack();
    } catch {
      // The next poll updates the connection state.
    } finally {
      setTimeout(fetchNowPlaying, 300);
    }
  }, [fetchNowPlaying]);

  const handlePrevious = useCallback(async () => {
    try {
      await previousTrack();
    } catch {
      // The next poll updates the connection state.
    } finally {
      setTimeout(fetchNowPlaying, 300);
    }
  }, [fetchNowPlaying]);

  const handleSeek = useCallback(
    async (time: number) => {
      setCurrentTime(time);
      try {
        await seek(Math.round(time * 1000));
      } catch {
        // The next poll updates the connection state.
      } finally {
        setTimeout(fetchNowPlaying, 300);
      }
    },
    [fetchNowPlaying],
  );

  const fetchLyrics = useCallback(async () => {
    if (!nowPlaying.id) {
      setLyrics([]);
      return;
    }

    try {
      const data = await getLyrics(nowPlaying.id);

      if (data.syncedLyrics) {
        setLyrics(parseSyncedLyrics(data.syncedLyrics));
      } else if (data.plainLyrics) {
        const lines = data.plainLyrics.split("\n").filter(Boolean);
        setLyrics(lines.map((text, index) => ({ time: index * 4, text })));
      } else {
        setLyrics([]);
      }
    } catch {
      setLyrics([]);
    }
  }, [nowPlaying.id]);

  return {
    nowPlaying,
    currentTime,
    lyrics,
    loading,
    connected,
    error,
    songChanged,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleSeek,
    fetchLyrics,
    refresh: fetchNowPlaying,
  };
}
