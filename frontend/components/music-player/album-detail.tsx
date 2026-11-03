"use client";

import { memo } from "react";
import { ArrowLeft, Disc3, Loader2, Play } from "lucide-react";
import { SwipeActionRow } from "./swipe-action-row";
import type { LibraryAlbum, LibrarySong } from "@/lib/api";

interface AlbumDetailProps {
  album: LibraryAlbum;
  songs: LibrarySong[];
  limit: number;
  playingKey: string | null;
  onBack: () => void;
  onPlayAll: () => void;
  onPlaySong: (index: number) => void;
  onAdd: (song: LibrarySong) => void;
}

export function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return "";
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function StaticCover({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-xl bg-white/5 ${className}`}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-white/30">
          <Disc3 className="h-6 w-6" />
        </div>
      )}
    </div>
  );
}

const TrackRow = memo(function TrackRow({
  song,
  index,
  active,
  onPlay,
  onAdd,
}: {
  song: LibrarySong;
  index: number;
  active: boolean;
  onPlay: (index: number) => void;
  onAdd: (song: LibrarySong) => void;
}) {
  return (
    <SwipeActionRow action="add" onAction={() => onAdd(song)}>
      <button
        type="button"
        onClick={() => onPlay(index)}
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5 active:bg-white/10"
      >
        <span className="w-4 shrink-0 text-center text-[10px] tabular-nums text-white/35">
          {index + 1}
        </span>
        <StaticCover
          src={song.coverUrl || song.albumImage}
          alt={song.title}
          className="h-10 w-10"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">
            {song.title}
          </p>
          <p className="truncate text-[10px] text-white/40">
            {song.artists.join(", ") || "Sin artista"}
          </p>
        </div>
        <span className="text-[10px] tabular-nums text-white/35">
          {formatDuration(song.duration)}
        </span>
        <span className="w-4 text-white/45">
          {active ? (
            <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          ) : (
            <Play className="h-4 w-4 fill-current" />
          )}
        </span>
      </button>
    </SwipeActionRow>
  );
});

export function AlbumDetail({
  album,
  songs,
  limit,
  playingKey,
  onBack,
  onPlayAll,
  onPlaySong,
  onAdd,
}: AlbumDetailProps) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Álbumes
      </button>

      <div className="flex items-center gap-4">
        <StaticCover
          src={album.coverUrl || album.albumImage}
          alt={album.title}
          className="h-24 w-24 sm:h-28 sm:w-28"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="truncate text-xl font-bold tracking-tight text-white">
            {album.title}
          </h2>
          <p className="truncate text-xs font-medium text-white/55">
            {album.artist || "Álbum"}
            {album.year ? ` · ${album.year}` : ""}
          </p>
          <p className="text-[11px] text-white/35">
            {songs.length} {songs.length === 1 ? "canción" : "canciones"}
          </p>
          <button
            type="button"
            onClick={onPlayAll}
            className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-black transition-transform active:scale-[0.98]"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Reproducir todo
          </button>
        </div>
      </div>

      {songs.length === 0 ? (
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 px-6 text-center text-white/35">
          <Disc3 className="h-7 w-7" />
          <p className="text-xs">El reproductor no envió las canciones de este álbum.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {songs.slice(0, limit).map((song, index) => (
            <TrackRow
              key={`${song.id}-${index}`}
              song={song}
              index={index}
              active={playingKey === `album:${album.id}:${index}`}
              onPlay={onPlaySong}
              onAdd={onAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}
