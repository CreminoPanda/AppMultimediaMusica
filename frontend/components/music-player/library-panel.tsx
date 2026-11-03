"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Disc3,
  ListMusic,
  Loader2,
  Music2,
  Play,
  RefreshCw,
  Search,
  User,
  X,
} from "lucide-react";
import {
  getPlaylist,
  play as playOnPlayer,
} from "@/lib/api";
import type {
  LibraryAlbum,
  LibraryArtist,
  LibraryResponse,
  LibrarySong,
  Playlist,
} from "@/lib/api";
import { PageHeader } from "./section-pager";
import type { SwipeHandlers } from "./section-pager";
import { AlbumDetail } from "./album-detail";
import { SwipeActionRow } from "./swipe-action-row";

type LibraryTab = "songs" | "albums" | "artists" | "playlists";

interface LibraryPanelProps {
  library: LibraryResponse;
  playlists: Playlist[];
  loading: boolean;
  error: string | null;
  swipe: SwipeHandlers;
  onReload: () => void;
  onPlayed: () => void;
  onPlaylistUpdate: (playlist: Playlist) => void;
  onAddToQueue: (ids: string[]) => Promise<boolean>;
}

const tabs: Array<{ id: LibraryTab; label: string }> = [
  { id: "songs", label: "Canciones" },
  { id: "albums", label: "Álbumes" },
  { id: "artists", label: "Artistas" },
  { id: "playlists", label: "Playlists" },
];

const PAGE_SIZE = 80;

function messageFrom(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function StaticCover({
  src,
  alt,
  round = false,
  className = "h-11 w-11",
}: {
  src?: string;
  alt: string;
  round?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-white/5 ${
        round ? "rounded-full" : "rounded-lg"
      } ${className}`}
    >
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

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 px-6 text-center text-white/35">
      <Disc3 className="h-8 w-8" />
      <p className="text-xs leading-relaxed">{children}</p>
    </div>
  );
}

const TrackRow = memo(function TrackRow({
  song,
  index,
  showIndex,
  active,
  onPlay,
  onAdd,
}: {
  song: LibrarySong;
  index: number;
  showIndex?: boolean;
  active: boolean;
  onPlay: (index: number) => void;
  onAdd: (song: LibrarySong) => void;
}) {
  return (
    <SwipeActionRow action="add" onAction={() => onAdd(song)}>
      <button
        type="button"
        onClick={() => onPlay(index)}
        className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5 active:bg-white/10"
      >
        {showIndex && (
          <span className="w-4 shrink-0 text-center text-[10px] tabular-nums text-white/35">
            {index + 1}
          </span>
        )}
        <StaticCover src={song.coverUrl || song.albumImage} alt={song.title} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">
            {song.title}
          </p>
          <p className="truncate text-[10px] text-white/40">
            {song.artists.join(", ") || song.album || "Sin artista"}
          </p>
        </div>
        <span className="text-white/45 transition-colors group-hover:text-white">
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

function SongRows({
  songs,
  limit,
  prefix,
  playingKey,
  showIndex,
  onPlay,
  onAdd,
}: {
  songs: LibrarySong[];
  limit: number;
  prefix: string;
  playingKey: string | null;
  showIndex?: boolean;
  onPlay: (index: number) => void;
  onAdd: (song: LibrarySong) => void;
}) {
  const playAt = useCallback((index: number) => onPlay(index), [onPlay]);

  return (
    <div className="space-y-1">
      {songs.slice(0, limit).map((song, index) => (
        <TrackRow
          key={`${song.id}-${index}`}
          song={song}
          index={index}
          showIndex={showIndex}
          active={playingKey === `${prefix}:${index}`}
          onPlay={playAt}
          onAdd={onAdd}
        />
      ))}
    </div>
  );
}

const AlbumRow = memo(function AlbumRow({
  album,
  onOpen,
}: {
  album: LibraryAlbum;
  onOpen: (album: LibraryAlbum) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onOpen(album)}
      className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5 active:bg-white/10"
    >
      <StaticCover src={album.coverUrl || album.albumImage} alt={album.title} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">
          {album.title}
        </p>
        <p className="truncate text-[10px] text-white/40">
          {album.artist || "Álbum"}
          {album.songCount ? ` · ${album.songCount} canciones` : ""}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 text-white/35 transition-colors group-hover:text-white" />
    </button>
  );
});

const ArtistRow = memo(function ArtistRow({
  artist,
  onPlay,
}: {
  artist: LibraryArtist;
  onPlay: (artist: LibraryArtist) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPlay(artist)}
      className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5 active:bg-white/10"
    >
      <StaticCover
        src={artist.coverUrl || artist.albumImage}
        alt={artist.name}
        round
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-white">
          {artist.name}
        </p>
        <p className="flex items-center gap-1 truncate text-[10px] text-white/40">
          <User className="h-2.5 w-2.5" />
          Artista
          {artist.songCount ? ` · ${artist.songCount} canciones` : ""}
        </p>
      </div>
      <Play className="h-4 w-4 fill-current text-white/45 transition-colors group-hover:text-white" />
    </button>
  );
});

export function LibraryPanel({
  library,
  playlists,
  loading,
  error,
  swipe,
  onReload,
  onPlayed,
  onPlaylistUpdate,
  onAddToQueue,
}: LibraryPanelProps) {
  const [tab, setTab] = useState<LibraryTab>("songs");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [openAlbumId, setOpenAlbumId] = useState<string | null>(null);
  const [openPlaylist, setOpenPlaylist] = useState<Playlist | null>(null);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 150);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
  }, [tab, debouncedQuery, openAlbumId, openPlaylist?.id]);

  const openAlbum = useMemo(
    () => library.albums.find((album) => album.id === openAlbumId) ?? null,
    [library.albums, openAlbumId],
  );

  const songsForAlbum = useCallback(
    (album: LibraryAlbum): LibrarySong[] => {
      if (album.songs?.length) return album.songs;
      return library.songs.filter(
        (song) =>
          song.album === album.title &&
          (!album.artist || song.artists.includes(album.artist)),
      );
    },
    [library.songs],
  );

  const albumSongs = useMemo(
    () => (openAlbum ? songsForAlbum(openAlbum) : []),
    [openAlbum, songsForAlbum],
  );

  const songsForArtist = useCallback(
    (artist: LibraryArtist): LibrarySong[] => {
      if (artist.songs?.length) return artist.songs;
      return library.songs.filter((song) =>
        song.artists.includes(artist.name),
      );
    },
    [library.songs],
  );

  const filteredSongs = useMemo(() => {
    if (!debouncedQuery) return [];
    const needle = debouncedQuery.toLowerCase();
    return library.songs.filter((song) => {
      const haystack = [
        song.title,
        song.artists.join(" "),
        song.album ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [debouncedQuery, library.songs]);

  const isSearching = debouncedQuery.length > 0;

  const runPlay = useCallback(
    async (songs: LibrarySong[], index: number, prefix: string) => {
      const ids = songs.map((song) => song.id).filter(Boolean);
      if (ids.length === 0) {
        setPlayError("No hay canciones en esta selección.");
        return;
      }

      setPlayingKey(`${prefix}:${index}`);
      setPlayError(null);

      try {
        await playOnPlayer(ids, Math.max(0, index));
        onPlayed();
      } catch (playFailure) {
        setPlayError(messageFrom(playFailure));
      } finally {
        setPlayingKey(null);
      }
    },
    [onPlayed],
  );

  const addSong = useCallback(
    (song: LibrarySong) => {
      void onAddToQueue([song.id]);
    },
    [onAddToQueue],
  );

  const loadPlaylistSongs = useCallback(
    async (playlist: Playlist): Promise<Playlist> => {
      if (playlist.songs?.length) return playlist;

      const detail = await getPlaylist(playlist.id);
      if (!detail) throw new Error("No se pudo cargar la playlist.");

      const merged: Playlist = {
        ...playlist,
        ...detail,
        name: detail.name || playlist.name,
        songs: detail.songs ?? [],
      };

      onPlaylistUpdate(merged);
      return merged;
    },
    [onPlaylistUpdate],
  );

  const handleOpenPlaylist = useCallback(
    async (playlist: Playlist) => {
      setPlayError(null);
      setLoadingPlaylist(true);
      try {
        setOpenPlaylist(await loadPlaylistSongs(playlist));
      } catch (playlistError) {
        setPlayError(messageFrom(playlistError));
      } finally {
        setLoadingPlaylist(false);
      }
    },
    [loadPlaylistSongs],
  );

  const handlePlayPlaylist = useCallback(
    async (playlist: Playlist) => {
      setPlayError(null);
      try {
        const detailed = await loadPlaylistSongs(playlist);
        await runPlay(detailed.songs ?? [], 0, `playlist:${playlist.id}`);
      } catch (playlistError) {
        setPlayError(messageFrom(playlistError));
      }
    },
    [loadPlaylistSongs, runPlay],
  );

  const openAlbumDetail = useCallback((album: LibraryAlbum) => {
    setOpenPlaylist(null);
    setOpenAlbumId(album.id);
  }, []);

  const goToStart = useCallback(() => {
    setOpenAlbumId(null);
    setOpenPlaylist(null);
    setQuery("");
    setDebouncedQuery("");
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const activeTotal = isSearching
    ? filteredSongs.length
    : openAlbum
      ? albumSongs.length
      : openPlaylist
        ? openPlaylist.songs?.length ?? 0
        : tab === "songs"
          ? library.songs.length
          : tab === "albums"
            ? library.albums.length
            : tab === "artists"
              ? library.artists.length
              : playlists.length;

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || activeTotal <= limit) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLimit((current) => Math.min(activeTotal, current + PAGE_SIZE));
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [activeTotal, limit]);

  const showDetail = !isSearching && (openAlbum !== null || openPlaylist !== null);

  return (
    <div className="relative flex h-full flex-col">
      <PageHeader title="Biblioteca" swipe={swipe}>
        <button
          type="button"
          onClick={goToStart}
          className="mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/55 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Volver al inicio de la biblioteca"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onReload}
          disabled={loading}
          className="mr-1 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/55 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
          aria-label="Recargar biblioteca"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </PageHeader>

      <div className="shrink-0 space-y-2 px-4 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por título, artista o álbum"
            className="h-9 w-full rounded-xl border border-white/10 bg-white/[0.04] pl-9 pr-9 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
            type="search"
            enterKeyHint="search"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {!showDetail && (
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setOpenAlbumId(null);
                  setOpenPlaylist(null);
                }}
                className={`rounded-lg py-1.5 text-[10px] font-bold transition-colors ${
                  tab === item.id
                    ? "bg-white text-black"
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {(error || playError) && (
        <div className="mx-4 mb-2 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 break-words">{playError ?? error}</span>
          {!playError && (
            <button
              type="button"
              onClick={onReload}
              className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-white/80"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        className="settings-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-24"
      >
        {loading && library.songs.length === 0 && !isSearching ? (
          <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-3 text-white/40">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
            <p className="text-xs">Cargando biblioteca...</p>
          </div>
        ) : isSearching ? (
          filteredSongs.length === 0 ? (
            <EmptyState>No se encontraron canciones</EmptyState>
          ) : (
            <SongRows
              songs={filteredSongs}
              limit={limit}
              prefix="search"
              playingKey={playingKey}
              onPlay={(index) => runPlay(filteredSongs, index, "search")}
              onAdd={addSong}
            />
          )
        ) : openAlbum ? (
          <AlbumDetail
            album={openAlbum}
            songs={albumSongs}
            limit={limit}
            playingKey={playingKey}
            onBack={() => setOpenAlbumId(null)}
            onPlayAll={() => runPlay(albumSongs, 0, `album:${openAlbum.id}`)}
            onPlaySong={(index) =>
              runPlay(albumSongs, index, `album:${openAlbum.id}`)
            }
            onAdd={addSong}
          />
        ) : openPlaylist ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setOpenPlaylist(null)}
              className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Playlists
            </button>

            <div className="flex items-center gap-4">
              <StaticCover
                src={openPlaylist.coverUrl || openPlaylist.albumImage}
                alt={openPlaylist.name}
                className="h-24 w-24 sm:h-28 sm:w-28"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <h2 className="truncate text-xl font-bold tracking-tight text-white">
                  {openPlaylist.name}
                </h2>
                <p className="text-[11px] text-white/35">
                  {openPlaylist.songs?.length ?? 0} canciones
                </p>
                <button
                  type="button"
                  onClick={() => handlePlayPlaylist(openPlaylist)}
                  className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-[11px] font-bold text-black transition-transform active:scale-[0.98]"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Reproducir todo
                </button>
              </div>
            </div>

            {loadingPlaylist ? (
              <div className="flex min-h-[140px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
              </div>
            ) : (
              <SongRows
                songs={openPlaylist.songs ?? []}
                limit={limit}
                prefix={`playlist:${openPlaylist.id}`}
                playingKey={playingKey}
                showIndex
                onPlay={(index) =>
                  runPlay(
                    openPlaylist.songs ?? [],
                    index,
                    `playlist:${openPlaylist.id}`,
                  )
                }
                onAdd={addSong}
              />
            )}
          </div>
        ) : tab === "songs" ? (
          library.songs.length === 0 ? (
            <EmptyState>No hay canciones en la biblioteca.</EmptyState>
          ) : (
            <SongRows
              songs={library.songs}
              limit={limit}
              prefix="songs"
              playingKey={playingKey}
              onPlay={(index) => runPlay(library.songs, index, "songs")}
              onAdd={addSong}
            />
          )
        ) : tab === "albums" ? (
          library.albums.length === 0 ? (
            <EmptyState>No hay álbumes en la biblioteca.</EmptyState>
          ) : (
            <div className="space-y-1">
              {library.albums.slice(0, limit).map((album) => (
                <AlbumRow
                  key={album.id}
                  album={album}
                  onOpen={openAlbumDetail}
                />
              ))}
            </div>
          )
        ) : tab === "artists" ? (
          library.artists.length === 0 ? (
            <EmptyState>No hay artistas en la biblioteca.</EmptyState>
          ) : (
            <div className="space-y-1">
              {library.artists.slice(0, limit).map((artist) => (
                <ArtistRow
                  key={artist.id}
                  artist={artist}
                  onPlay={(item) =>
                    runPlay(songsForArtist(item), 0, `artist:${item.id}`)
                  }
                />
              ))}
            </div>
          )
        ) : playlists.length === 0 ? (
          <EmptyState>No hay playlists en el reproductor.</EmptyState>
        ) : (
          <div className="space-y-1">
            {playlists.slice(0, limit).map((playlist) => (
              <div
                key={playlist.id}
                className="group flex items-center gap-1 rounded-xl transition-colors hover:bg-white/5"
              >
                <button
                  type="button"
                  onClick={() => handlePlayPlaylist(playlist)}
                  className="flex flex-1 items-center gap-3 p-2 text-left"
                >
                  <StaticCover
                    src={playlist.coverUrl || playlist.albumImage}
                    alt={playlist.name}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {playlist.name}
                    </p>
                    <p className="flex items-center gap-1 truncate text-[10px] text-white/40">
                      <ListMusic className="h-2.5 w-2.5" />
                      Playlist
                      {playlist.songCount
                        ? ` · ${playlist.songCount} canciones`
                        : ""}
                    </p>
                  </div>
                  <Play className="h-4 w-4 fill-current text-white/45 group-hover:text-white" />
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenPlaylist(playlist)}
                  className="mr-1 flex h-8 w-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                  aria-label={`Ver canciones de ${playlist.name}`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTotal > limit && (
          <div ref={sentinelRef} className="h-10" aria-hidden />
        )}
      </div>
    </div>
  );
}
