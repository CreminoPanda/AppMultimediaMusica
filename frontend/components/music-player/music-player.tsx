"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, LayoutGroup, MotionConfig } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  Disc3,
  LayoutGrid,
  Mic2,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { DynamicBackground } from "./dynamic-background";
import { AlbumArtwork } from "./album-artwork";
import { SongInfo } from "./song-info";
import { PlaybackControls } from "./playback-controls";
import { ProgressBar } from "./progress-bar";
import { LyricsView } from "./lyrics-view";
import { SettingsPanel } from "./settings-panel";
import { LibraryPanel } from "./library-panel";
import { QueuePanel } from "./queue-panel";
import { MixerPanel } from "./mixer-panel";
import { PageHeader, SectionPager, useSectionSwipe } from "./section-pager";
import { usePlayer } from "@/hooks/use-player";
import { useQueue } from "@/hooks/use-queue";
import { getLibrary, getPlaylists } from "@/lib/api";
import type { LibraryResponse, Playlist } from "@/lib/api";

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
const SECTION_LABELS = ["Reproductor", "Biblioteca", "Cola", "Ajustes", "Mezclador"];
const emptyLibrary: LibraryResponse = { songs: [], albums: [], artists: [] };

// The player polls 4 times per second; these pages keep their own state and
// must not re-render on every progress tick.
const MemoLibraryPanel = memo(LibraryPanel);
const MemoQueuePanel = memo(QueuePanel);
const MemoMixerPanel = memo(MixerPanel);
const MemoSettingsPanel = memo(SettingsPanel);

interface MusicPlayerProps {
  serverUrl: string;
  onChangeServer: () => void;
}

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function MusicPlayer({ serverUrl, onChangeServer }: MusicPlayerProps) {
  const {
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
    refresh,
  } = usePlayer();

  const [activeIndex, setActiveIndex] = useState(0);
  const [pagerActivity, setPagerActivity] = useState(0);
  const [isCircularMode, setIsCircularMode] = useState(false);
  const [isKaraokeMode, setIsKaraokeMode] = useState(false);
  const [toast, setToast] = useState<{
    id: number;
    message: string;
    tone: "ok" | "error";
  } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [library, setLibrary] = useState<LibraryResponse>(emptyLibrary);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const [libraryError, setLibraryError] = useState<string | null>(null);

  const showToast = useCallback(
    (message: string, tone: "ok" | "error" = "ok") => {
      setToast({ id: Date.now(), message, tone });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 1800);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const queue = useQueue({ active: activeIndex === 2, onNotice: showToast });

  const loadLibrary = useCallback(async () => {
    setLibraryLoading(true);
    setLibraryError(null);

    const [libraryResult, playlistResult] = await Promise.allSettled([
      getLibrary(),
      getPlaylists(),
    ]);

    const problems: string[] = [];

    if (libraryResult.status === "fulfilled") {
      setLibrary(libraryResult.value);
    } else {
      setLibrary(emptyLibrary);
      problems.push(messageFrom(libraryResult.reason));
    }

    if (playlistResult.status === "fulfilled") {
      setPlaylists(playlistResult.value);
    } else {
      setPlaylists([]);
      problems.push(messageFrom(playlistResult.reason));
    }

    setLibraryError(problems.length > 0 ? problems[0] : null);
    setLibraryLoaded(true);
    setLibraryLoading(false);
  }, []);

  useEffect(() => {
    if (connected && !libraryLoaded && !libraryLoading) loadLibrary();
  }, [connected, libraryLoaded, libraryLoading, loadLibrary]);

  const handlePlaylistUpdate = useCallback((updated: Playlist) => {
    setPlaylists((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  }, []);

  const handlePlayed = useCallback(() => {
    setTimeout(refresh, 300);
  }, [refresh]);

  const swipe = useSectionSwipe(
    activeIndex,
    5,
    setActiveIndex,
    () => setPagerActivity((value) => value + 1),
  );

  const toggleAlbumMode = useCallback(() => {
    setIsCircularMode((previous) => !previous);
  }, []);

  const toggleKaraokeMode = useCallback(() => {
    if (!isKaraokeMode && lyrics.length === 0 && nowPlaying.title) {
      fetchLyrics();
    }
    setIsKaraokeMode((previous) => !previous);
  }, [isKaraokeMode, lyrics.length, nowPlaying.title, fetchLyrics]);

  useEffect(() => {
    if (songChanged > 0 && isKaraokeMode) {
      fetchLyrics();
    }
  }, [songChanged, isKaraokeMode, fetchLyrics]);

  const songTitle = nowPlaying.title || "Sin reproducir";
  const songArtist =
    nowPlaying.artists?.join(", ") || "Configura el reproductor";
  const songAlbum = nowPlaying.album || "";
  const songImage = nowPlaying.albumImage || "";
  const songDuration = (nowPlaying.duration || 0) / 1000;
  const isPlaying = nowPlaying.isPlaying || false;
  const hasSong = Boolean(nowPlaying.id || nowPlaying.title);
  const colors = defaultColors;

  if (loading) {
    return (
      <div className="relative flex h-screen w-full items-center justify-center bg-[#0a0a0f]">
        <p className="text-lg text-white/60">Cargando...</p>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="relative h-screen w-full overflow-hidden">
        <DynamicBackground colors={defaultColors} />
        <div className="noise-overlay" />

        <div className="relative z-10 flex h-full w-full items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md space-y-4 text-center"
          >
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400">
              <WifiOff className="h-7 w-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white sm:text-2xl">
                Reproductor desconectado
              </h2>
              <p className="text-sm text-white/60">
                Revisa la IP y el puerto del reproductor.
              </p>
              {error && (
                <p className="break-words text-[11px] text-white/35">{error}</p>
              )}
            </div>
            <div className="flex flex-col items-center justify-center gap-2.5 sm:flex-row">
              <button
                onClick={refresh}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black transition-all hover:bg-white/90 active:scale-[0.98] sm:w-auto"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </button>
              <button
                onClick={onChangeServer}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white/80 transition-all hover:bg-white/20 hover:text-white active:scale-[0.98] sm:w-auto"
              >
                Cambiar servidor
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const playerPage = (
    <div className="relative h-full">
      <div className="absolute inset-x-0 top-0 z-20">
        <PageHeader title="Reproductor" swipe={swipe} />
      </div>

      {/* Full-height scroller: the artwork glow may bleed under the transparent
          header instead of being cut by the scroll viewport. */}
      <div
        className="settings-scroll h-full overflow-y-auto overscroll-contain"
        style={{
          paddingTop: "calc(max(env(safe-area-inset-top), 8px) + 78px)",
        }}
      >
        <div
          className={`px-4 pb-28 pt-2 sm:px-6 ${
            isKaraokeMode ? "h-full" : "min-h-full"
          }`}
        >
          <LayoutGroup>
            <AnimatePresence mode="wait" initial={false}>
              {!isKaraokeMode ? (
                <motion.div
                  key="player-mode"
                  className="flex min-h-full flex-col items-center justify-center gap-6 md:flex-row md:gap-10 lg:gap-16 xl:gap-20"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                  transition={springTransition}
                >
                  {!hasSong ? (
                    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40">
                        <Disc3 className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-lg font-bold text-white">
                          Sin reproducción
                        </h2>
                        <p className="max-w-xs text-xs leading-relaxed text-white/45">
                          Inicia la reproducción desde el PC o elige una canción
                          en Biblioteca.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className="shrink-0"
                        style={{ touchAction: "pan-y" }}
                        {...swipe}
                      >
                        <AlbumArtwork
                          src={songImage || undefined}
                          alt={`${songTitle} by ${songArtist}`}
                          dominantColor={colors[0]}
                          colors={colors}
                          isCircular={isCircularMode}
                          isPlaying={isPlaying}
                          onToggle={toggleAlbumMode}
                          size="xlarge"
                        />
                      </div>

                      <motion.div
                        layout
                        className="flex w-full min-w-0 flex-1 flex-col items-center gap-4 md:w-auto md:items-start md:gap-5 lg:gap-6"
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
                    </>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="karaoke-mode"
                  className="flex h-full w-full flex-col md:flex-row"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={springTransition}
                >
                  <motion.div
                    layout
                    className="flex h-auto w-full flex-col items-center justify-center p-4 md:h-full md:w-[32%] md:p-5 lg:p-6"
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ ...springTransition, delay: 0.1 }}
                  >
                    <div className="flex w-full max-w-sm flex-col items-center gap-4 md:gap-4 lg:gap-5">
                      <div className="flex w-full items-center gap-3 md:hidden">
                        <div
                          className="shrink-0"
                          style={{ touchAction: "pan-y" }}
                          {...swipe}
                        >
                          <AlbumArtwork
                            src={songImage || undefined}
                            alt={`${songTitle} by ${songArtist}`}
                            dominantColor={colors[0]}
                            colors={colors}
                            isCircular={isCircularMode}
                            isPlaying={isPlaying}
                            onToggle={toggleAlbumMode}
                            size="small"
                          />
                        </div>

                        <SongInfo
                          title={songTitle}
                          artist={songArtist}
                          album={songAlbum}
                          alignment="left"
                          size="medium"
                        />
                      </div>

                      <div className="hidden w-full flex-col items-center gap-4 md:flex lg:gap-5">
                        <div
                          className="shrink-0"
                          style={{ touchAction: "pan-y" }}
                          {...swipe}
                        >
                          <AlbumArtwork
                            src={songImage || undefined}
                            alt={`${songTitle} by ${songArtist}`}
                            dominantColor={colors[0]}
                            colors={colors}
                            isCircular={isCircularMode}
                            isPlaying={isPlaying}
                            onToggle={toggleAlbumMode}
                            size="medium"
                          />
                        </div>

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

                  <motion.div
                    layout
                    className="flex h-[50vh] w-full items-center justify-center p-4 md:h-full md:w-[68%] md:p-5 lg:p-6"
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ ...springTransition, delay: 0.2 }}
                  >
                    <div className="h-full w-full max-h-[85vh]">
                      <LyricsView
                        lyrics={lyrics}
                        currentTime={currentTime}
                        isVisible={isKaraokeMode}
                        accentColor={colors[0]}
                        isKaraokeMode={true}
                        songChanged={songChanged}
                      />
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </LayoutGroup>
        </div>
      </div>
    </div>
  );

  return (
    <MotionConfig reducedMotion="never">
      <div className="relative h-screen w-full overflow-hidden">
        <DynamicBackground colors={colors} />
        <div className="noise-overlay" />

        <SectionPager
          activeIndex={activeIndex}
          onChange={setActiveIndex}
          labels={SECTION_LABELS}
          activity={pagerActivity}
          swipe={swipe}
        >
          {[
            playerPage,
            <MemoLibraryPanel
              key="library"
              library={library}
              playlists={playlists}
              loading={libraryLoading}
              error={libraryError}
              swipe={swipe}
              onReload={loadLibrary}
              onPlayed={handlePlayed}
              onPlaylistUpdate={handlePlaylistUpdate}
              onAddToQueue={queue.add}
            />,
            <MemoQueuePanel
              key="queue"
              queue={queue.queue}
              loading={queue.loading}
              error={queue.error}
              unavailable={queue.unavailable}
              swipe={swipe}
              onRefresh={queue.refresh}
              onPlayAt={queue.playAt}
              onRemove={queue.removeAt}
              onReorder={queue.reorder}
              onDragChange={queue.setDragging}
            />,
            <MemoSettingsPanel
              key="settings"
              serverUrl={serverUrl}
              connected={connected}
              swipe={swipe}
              onChangeServer={onChangeServer}
            />,
            <MemoMixerPanel
              key="mixer"
              active={activeIndex === 4}
              swipe={swipe}
              onNotice={showToast}
            />,
          ]}
        </SectionPager>

        {activeIndex === 0 && (
          <motion.button
            onClick={toggleKaraokeMode}
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+12px)] left-4 z-50 flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-white/80 backdrop-blur-xl transition-colors hover:bg-white/20 hover:text-white sm:px-4 sm:py-3"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
            aria-label={
              isKaraokeMode
                ? "Cambiar a modo reproductor"
                : "Cambiar a modo karaoke"
            }
          >
            <motion.div
              initial={false}
              animate={{ rotate: isKaraokeMode ? 180 : 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            >
              {isKaraokeMode ? (
                <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5" />
              ) : (
                <Mic2 className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </motion.div>
            <span className="text-xs font-medium sm:text-sm">
              {isKaraokeMode ? "Player" : "Karaoke"}
            </span>

            <motion.div
              className="pointer-events-none absolute inset-0 rounded-full"
              style={{
                background: `radial-gradient(circle, ${colors[0]}30 0%, transparent 70%)`,
              }}
              animate={{ opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.button>
        )}

        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-50 flex justify-center px-6"
            >
              <div
                className={`flex max-w-sm items-center gap-2 rounded-full border px-3.5 py-2 text-[11px] font-semibold shadow-lg ${
                  toast.tone === "error"
                    ? "border-red-500/25 bg-[#2a1013]/95 text-red-200"
                    : "border-emerald-500/25 bg-[#0c211a]/95 text-emerald-200"
                }`}
              >
                {toast.tone === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                )}
                <span className="truncate">{toast.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
