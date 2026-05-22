"use client";

import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface Lyric {
  time: number;
  text: string;
}

interface LyricsViewProps {
  lyrics: Lyric[];
  currentTime: number;
  isVisible: boolean;
  accentColor?: string;
  isKaraokeMode?: boolean;
  songChanged?: number;
}

export function LyricsView({
  lyrics,
  currentTime,
  isVisible,
  accentColor = "#ffffff",
  isKaraokeMode = false,
  songChanged = 0,
}: LyricsViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousIndexRef = useRef(-1);

  const currentLyricIndex = lyrics.findIndex((lyric, index) => {
    const next = lyrics[index + 1];
    return currentTime >= lyric.time && (!next || currentTime < next.time);
  });

  useEffect(() => {
    if (songChanged > 0) {
      previousIndexRef.current = -1;
    }
  }, [songChanged]);

  useEffect(() => {
    if (!isVisible || currentLyricIndex < 0) return;
    if (currentLyricIndex === previousIndexRef.current) return;
    previousIndexRef.current = currentLyricIndex;

    const container = containerRef.current;
    if (!container) return;

    const active = container.querySelector(`[data-lyric-index="${currentLyricIndex}"]`) as HTMLElement;
    if (!active) return;

    const target = active.offsetTop - container.clientHeight / 2 + active.offsetHeight / 2;
    container.scrollTop = target;
  }, [currentLyricIndex, isVisible]);

  if (lyrics.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-white/40 text-lg">Sin letras disponibles</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      <motion.div
        className="absolute inset-0 backdrop-blur-xl rounded-2xl lg:rounded-3xl"
        layout
        animate={{
          backgroundColor: isKaraokeMode ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.3)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />

      <div
        ref={containerRef}
        className="relative flex-1 overflow-y-auto py-[40vh] px-4"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          overscrollBehavior: "none",
        }}
        onWheel={(e) => e.preventDefault()}
        onTouchMove={(e) => e.preventDefault()}
      >
        <style>{`div::-webkit-scrollbar{display:none}`}</style>
        <div>
          {lyrics.map((lyric, index) => {
            const isActive = index === currentLyricIndex;
            const isPast = index < currentLyricIndex;
            const distance = Math.abs(index - currentLyricIndex);
            const showLine = !isKaraokeMode || distance <= 4;

            return (
              <p
                key={index}
                data-lyric-index={index}
                className="text-center font-semibold leading-snug cursor-default select-none"
                style={{
                  maxWidth: "100%",
                  wordBreak: "break-word",
                  overflowWrap: "break-word",
                  hyphens: "auto",
                  visibility: showLine ? "visible" : "hidden",
                  fontSize: isActive ? "clamp(1.25rem, 4vw, 2.5rem)" : "clamp(1rem, 3vw, 1.75rem)",
                  color: isActive ? "white" : "rgba(255,255,255,0.35)",
                  opacity: isActive ? 1 : isPast ? 0.25 : Math.max(0.15, 0.5 - distance * 0.1),
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  filter: isActive ? "blur(0px)" : `blur(${Math.min(distance * 0.7, 2)}px)`,
                  textShadow: isActive ? `0 0 20px ${accentColor}40` : "none",
                  transition: "opacity 0.3s ease-out, filter 0.3s ease-out, transform 0.3s ease-out",
                  padding: showLine ? "0.25rem 1rem" : "0",
                  margin: showLine ? (isKaraokeMode ? "1.5rem 0" : "1rem 0") : "0",
                  height: showLine ? "auto" : "0",
                  overflow: "hidden",
                  pointerEvents: showLine ? "auto" : "none",
                }}
              >
                {lyric.text}
              </p>
            );
          })}
        </div>
      </div>

      <motion.div
        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent pointer-events-none rounded-t-2xl lg:rounded-t-3xl"
        animate={{ height: isKaraokeMode ? "5rem" : "4rem" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />

      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-b-2xl lg:rounded-b-3xl"
        animate={{ height: isKaraokeMode ? "5rem" : "4rem" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    </div>
  );
}
