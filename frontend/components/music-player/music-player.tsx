"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Circle, Square, Mic2, LayoutGrid } from "lucide-react";
import { DynamicBackground } from "./dynamic-background";
import { AlbumArtwork } from "./album-artwork";
import { SongInfo } from "./song-info";
import { PlaybackControls } from "./playback-controls";
import { ProgressBar } from "./progress-bar";
import { LyricsView } from "./lyrics-view";
import { AuthStatus } from "./auth-status";
import { useSpotifyPlayer } from "@/hooks/use-spotify-player";

const springTransition = {
  type: "spring",
  stiffness: 200,
  damping: 25,
} as const;

const layoutTransition = {
  type: "spring",
  stiffness: 300,
  damping: 30,
  mass: 0.8,
} as const;

const defaultColors = ["#e11d48", "#7c3aed", "#0ea5e9"];

interface MusicPlayerProps {
  onLogout: () => void;
}

export function MusicPlayer({ onLogout }: MusicPlayerProps) {
  const {
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
  } = useSpotifyPlayer();

  const [isCircularMode, setIsCircularMode] = useState(false);
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);

  useEffect(() => {
    if (songChanged > 0 && isKaraokeMode) {
      fetchLyrics();
    }
  }, [songChanged, isKaraokeMode, fetchLyrics]);

  const songTitle = nowPlaying.title || "Sin reproducir";
  const songArtist = nowPlaying.artists?.join(", ") || "Conecta Spotify";
  const songAlbum = nowPlaying.album || "";
  const songImage = nowPlaying.albumImage || "";
  const songDuration = (nowPlaying.duration || 0) / 1000;
  const isPlaying = nowPlaying.isPlaying || false;
  const colors = defaultColors;

  const toggleAlbumMode = useCallback(() => {
    setIsCircularMode((prev) => !prev);
  }, []);

  const toggleKaraokeMode = useCallback(() => {
    if (!isKaraokeMode && lyrics.length === 0 && nowPlaying.title) {
      fetchLyrics();
    }
    setIsKaraokeMode((prev) => !prev);
  }, [isKaraokeMode, lyrics.length, nowPlaying.title, fetchLyrics]);

  if (loading) {
    return (
      <div className="relative w-full h-screen flex items-center justify-center bg-[#0a0a0f]">
        <p className="text-white/60 text-lg">Cargando...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative w-full h-screen flex items-center justify-center bg-[#0a0a0f]">
        <AuthStatus onLogout={onLogout} isKaraoke={isKaraokeMode} />
        <div className="text-center space-y-4 px-6">
          <p className="text-red-400 text-lg">{error}</p>
          <p className="text-white/50">Asegúrate de que el backend esté corriendo en el puerto 3001</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden">
      <AuthStatus onLogout={onLogout} isKaraoke={isKaraokeMode} />
      <DynamicBackground colors={colors} />

      <div className="noise-overlay" />

      <LayoutGroup>
        <motion.div
          layout
          className="relative z-10 w-full h-full flex items-center justify-center"
          transition={layoutTransition}
        >
          <AnimatePresence mode="wait">
            {!isKaraokeMode ? (
              /* ========== PLAYER MODE ========== */
              <motion.div
                key="player-mode"
                className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 lg:gap-16 xl:gap-20 px-6 md:px-8 w-full max-w-7xl mx-auto"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={springTransition}
              >
                {/* Album Artwork */}
                <motion.div
                  layout="position"
                  className="flex-shrink-0"
                  transition={layoutTransition}
                >
                  <AlbumArtwork
                    src={songImage || undefined}
                    alt={`${songTitle} by ${songArtist}`}
                    dominantColor={colors[0]}
                    colors={colors}
                    isCircular={isCircularMode}
                    size="xlarge"
                  />
                </motion.div>

                {/* Info + Controls + Progress */}
                <motion.div
                  layout
                  className="flex flex-col gap-4 md:gap-5 lg:gap-6 flex-1 min-w-0 w-full md:w-auto items-center md:items-start"
                  transition={layoutTransition}
                >
                  <SongInfo
                    title={songTitle}
                    artist={songArtist}
                    album={songAlbum}
                    alignment="left"
                    size="xlarge"
                  />

                  <PlaybackControls
                    isPlaying={isPlaying}
                    onPlayPause={handlePlayPause}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    size="xlarge"
                    stretched
                  />

                  <div className="w-full max-w-xl md:max-w-none">
                    <ProgressBar
                      currentTime={currentTime}
                      duration={songDuration}
                      onSeek={handleSeek}
                      accentColor={colors[0]}
                      size="large"
                    />
                  </div>
                </motion.div>
              </motion.div>
            ) : (
              /* ========== KARAOKE MODE ========== */
              <motion.div
                key="karaoke-mode"
                className="w-full h-full flex flex-col md:flex-row"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={springTransition}
              >
                {/* Left: Info + Controls */}
                <motion.div
                  layout
                  className="w-full md:w-[32%] h-auto md:h-full flex flex-col items-center justify-center p-4 md:p-5 lg:p-6"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ ...springTransition, delay: 0.1 }}
                >
                  <div className="flex flex-col items-center gap-4 md:gap-4 lg:gap-5 w-full max-w-sm">
                    {/* Small screens: row layout */}
                    <div className="flex items-center gap-3 w-full md:hidden">
                      <motion.div
                        layout="position"
                        className="flex-shrink-0"
                        transition={layoutTransition}
                      >
                        <AlbumArtwork
                          src={songImage || undefined}
                          alt={`${songTitle} by ${songArtist}`}
                          dominantColor={colors[0]}
                          colors={colors}
                          isCircular={isCircularMode}
                          size="small"
                        />
                      </motion.div>

                      <SongInfo
                        title={songTitle}
                        artist={songArtist}
                        album={songAlbum}
                        alignment="left"
                        size="medium"
                      />
                    </div>

                    {/* Large screens: stacked layout */}
                    <div className="hidden md:flex flex-col items-center gap-4 lg:gap-5 w-full">
                      <motion.div
                        layout="position"
                        className="flex-shrink-0"
                        transition={layoutTransition}
                      >
                        <AlbumArtwork
                          src={songImage || undefined}
                          alt={`${songTitle} by ${songArtist}`}
                          dominantColor={colors[0]}
                          colors={colors}
                          isCircular={isCircularMode}
                          size="medium"
                        />
                      </motion.div>

                      <SongInfo
                        title={songTitle}
                        artist={songArtist}
                        album={songAlbum}
                        alignment="center"
                        size="medium"
                      />
                    </div>

                    <PlaybackControls
                      isPlaying={isPlaying}
                      onPlayPause={handlePlayPause}
                      onPrevious={handlePrevious}
                      onNext={handleNext}
                      size="large"
                    />

                    <div className="w-full">
                      <ProgressBar
                        currentTime={currentTime}
                        duration={songDuration}
                        onSeek={handleSeek}
                        accentColor={colors[0]}
                      />
                    </div>
                  </div>
                </motion.div>

                {/* Right: Lyrics */}
                <motion.div
                  layout
                  className="w-full md:w-[68%] h-[50vh] md:h-full flex items-center justify-center p-4 md:p-5 lg:p-6"
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ ...springTransition, delay: 0.2 }}
                >
                  <div className="w-full h-full max-h-[85vh]">
                    <LyricsView
                      lyrics={lyrics}
                      currentTime={currentTime}
                      isVisible={true}
                      accentColor={colors[0]}
                      isKaraokeMode={true}
                      songChanged={songChanged}
                    />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </LayoutGroup>

      {/* Karaoke Toggle */}
      <motion.button
        onClick={toggleKaraokeMode}
        className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-20 flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        aria-label={isKaraokeMode ? "Switch to player mode" : "Switch to karaoke mode"}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isKaraokeMode ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {isKaraokeMode ? (
            <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Mic2 className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </motion.div>
        <span className="text-xs sm:text-sm font-medium">
          {isKaraokeMode ? "Player" : "Karaoke"}
        </span>
        
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${colors[0]}30 0%, transparent 70%)`,
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.button>

      {/* Album Style Toggle */}
      <motion.button
        onClick={toggleAlbumMode}
        className="absolute bottom-4 left-20 sm:bottom-6 sm:left-36 z-20 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full backdrop-blur-xl bg-white/10 border border-white/20 text-white/80 hover:text-white hover:bg-white/20 transition-colors"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        aria-label={isCircularMode ? "Switch to square album" : "Switch to circular album"}
      >
        <motion.div
          initial={false}
          animate={{ rotate: isCircularMode ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
        >
          {isCircularMode ? (
            <Square className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Circle className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </motion.div>
        
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${colors[0]}30 0%, transparent 70%)`,
          }}
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.button>
    </div>
  );
}
