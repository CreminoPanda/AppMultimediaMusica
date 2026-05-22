"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getNowPlaying, playPause, nextTrack, previousTrack, seek, getLyrics, API_URL } from "@/lib/api";
import type { NowPlayingResponse } from "@/lib/api";

interface Lyric {
  time: number;
  text: string;
}

export function useSpotifyPlayer(pollInterval = 2000) {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingResponse>({ isPlaying: false });
  const [currentTime, setCurrentTime] = useState(0);
  const [lyrics, setLyrics] = useState<Lyric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [songChanged, setSongChanged] = useState(0);
  const prevSongIdRef = useRef<string | undefined>(undefined);

  const fetchNowPlaying = useCallback(async () => {
    try {
      const data = await getNowPlaying();
      if (data.error) {
        setError(data.error);
        return;
      }
      setError(null);

      if (data.id && data.id !== prevSongIdRef.current) {
        prevSongIdRef.current = data.id;
        setCurrentTime(0);
        setSongChanged((s) => s + 1);
        setLyrics([]);
      }

      setNowPlaying(data);
      if (data.progress !== undefined) {
        setCurrentTime(data.progress / 1000);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`Error de conexión: ${errMsg} | URL: ${API_URL}/now-playing`);
    } finally {
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
        setCurrentTime((prev) => {
          const next = prev + 0.25;
          return next >= (nowPlaying.duration! / 1000) ? nowPlaying.duration! / 1000 : next;
        });
      }, 250);
      return () => clearInterval(interval);
    }
  }, [nowPlaying.isPlaying, nowPlaying.duration]);

  const handlePlayPause = useCallback(async () => {
    await playPause();
    setTimeout(fetchNowPlaying, 300);
  }, [fetchNowPlaying]);

  const handleNext = useCallback(async () => {
    await nextTrack();
    setTimeout(fetchNowPlaying, 300);
  }, [fetchNowPlaying]);

  const handlePrevious = useCallback(async () => {
    await previousTrack();
    setTimeout(fetchNowPlaying, 300);
  }, [fetchNowPlaying]);

  const handleSeek = useCallback(async (time: number) => {
    setCurrentTime(time);
    await seek(Math.round(time * 1000));
    setTimeout(fetchNowPlaying, 300);
  }, [fetchNowPlaying]);

  const fetchLyrics = useCallback(async () => {
    if (!nowPlaying.title) return;
    const data = await getLyrics(nowPlaying.title, nowPlaying.artists?.[0]);
    if (data.syncedLyrics) {
      const parsed = data.syncedLyrics
        .split("\n")
        .map((line) => {
          const match = line.match(/\[(\d{2}):(\d{2}\.\d{2})\](.*)/);
          if (match) {
            const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
            const text = match[3].trim();
            return text ? { time, text } : null;
          }
          return null;
        })
        .filter(Boolean) as Lyric[];
      setLyrics(parsed);
    } else if (data.plainLyrics) {
      const lines = data.plainLyrics.split("\n").filter(Boolean);
      setLyrics(lines.map((text, i) => ({ time: i * 4, text })));
    } else {
      setLyrics([]);
    }
  }, [nowPlaying.title, nowPlaying.artists]);

  return {
    nowPlaying,
    currentTime,
    lyrics,
    loading,
    error,
    songChanged,
    handlePlayPause,
    handleNext,
    handlePrevious,
    handleSeek,
    fetchLyrics,
  };
}
