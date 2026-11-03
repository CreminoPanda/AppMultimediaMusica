export const PLAYER_SERVER_URL_KEY = "player_server_url";

const REQUEST_TIMEOUT_MS = 8000;

export interface NowPlayingResponse {
  id?: string;
  title?: string;
  artists?: string[];
  album?: string;
  albumImage?: string;
  coverUrl?: string;
  duration?: number;
  progress?: number;
  isPlaying?: boolean;
  uri?: string;
  error?: string;
}

export interface LyricsResponse {
  plainLyrics: string | null;
  syncedLyrics: string | null;
}

export interface LibrarySong {
  id: string;
  title: string;
  artists: string[];
  album?: string;
  albumImage?: string;
  coverUrl?: string;
  duration?: number;
  uri?: string;
  path?: string;
}

export interface LibraryAlbum {
  id: string;
  title: string;
  artist?: string;
  year?: number;
  coverUrl?: string;
  albumImage?: string;
  songCount?: number;
  songs?: LibrarySong[];
}

export interface LibraryArtist {
  id: string;
  name: string;
  coverUrl?: string;
  albumImage?: string;
  songCount?: number;
  songs?: LibrarySong[];
}

export interface LibraryResponse {
  songs: LibrarySong[];
  albums: LibraryAlbum[];
  artists: LibraryArtist[];
}

export interface Playlist {
  id: string;
  name: string;
  coverUrl?: string;
  albumImage?: string;
  songCount?: number;
  songs?: LibrarySong[];
}

/**
 * Normalizes an address typed by the user. Accepts `192.168.1.10:3001` and
 * turns it into `http://192.168.1.10:3001`. Trailing slashes are removed so
 * endpoint concatenation stays simple.
 */
export function normalizeServerUrl(value: string): string {
  let url = value.trim();
  if (!url) return "";
  if (!/^https?:\/\//i.test(url)) url = `http://${url}`;
  return url.replace(/\/+$/, "");
}

export function getPlayerServerUrl(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(PLAYER_SERVER_URL_KEY);
  if (!stored) return null;
  return normalizeServerUrl(stored) || null;
}

export function savePlayerServerUrl(value: string): string {
  const normalized = normalizeServerUrl(value);
  if (typeof window !== "undefined") {
    localStorage.setItem(PLAYER_SERVER_URL_KEY, normalized);
  }
  return normalized;
}

export function clearPlayerServerUrl(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(PLAYER_SERVER_URL_KEY);
  }
}

/** Prefixes relative player paths such as `/cover/123` with the LAN address. */
export function resolveMediaUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^(https?:|data:|blob:)/i.test(path)) return path;

  const base = getPlayerServerUrl();
  if (!base) return path;

  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number") return String(value);
  return undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function errorMessage(data: unknown, status: number): string {
  if (typeof data === "string" && data.trim()) return data;
  if (isRecord(data)) {
    const message = asString(data.error) || asString(data.message) || asString(data.detail);
    if (message) return message;
  }
  return `El reproductor respondió con estado ${status}.`;
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  baseUrl?: string,
): Promise<T> {
  const base = baseUrl ?? getPlayerServerUrl();
  if (!base) {
    throw new Error("No hay un reproductor configurado.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(`${base}${path}`, {
      ...init,
      signal: controller.signal,
    });

    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!res.ok) {
      throw new ApiError(errorMessage(data, res.status), res.status);
    }

    return data as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("El reproductor no respondió a tiempo.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function unwrapContainer(value: unknown, keys: string[]): unknown {
  if (!isRecord(value)) return value;
  for (const key of keys) {
    const nested = value[key];
    if (nested !== undefined && nested !== null) return nested;
  }
  return value;
}

/** Checks `/health` against the configured (or provided) player address. */
export async function checkHealth(baseUrl?: string): Promise<boolean> {
  const base = normalizeServerUrl(baseUrl ?? getPlayerServerUrl() ?? "");
  if (!base) return false;

  try {
    const data = await request<unknown>("/health", { method: "GET" }, base);
    if (isRecord(data)) {
      if (typeof data.ok === "boolean") return data.ok;
      const status = asString(data.status)?.toLowerCase();
      if (status) {
        return ["ok", "healthy", "online", "ready", "up", "playing", "paused"].includes(status);
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function getNowPlaying(): Promise<NowPlayingResponse> {
  const raw = await request<unknown>("/now-playing");
  if (raw === null || raw === undefined || raw === "") {
    return { isPlaying: false };
  }

  let data = unwrapContainer(raw, ["nowPlaying", "data"]);
  if (isRecord(data) && isRecord(data.nowPlaying)) {
    data = data.nowPlaying;
  }
  if (!isRecord(data)) {
    return {
      isPlaying: false,
      error: typeof data === "string" ? data : "Respuesta inválida del reproductor.",
    };
  }

  const artistValue = data.artists ?? data.artist ?? data.artista;
  const artists = Array.isArray(artistValue)
    ? artistValue.map(asString).filter((artist): artist is string => Boolean(artist))
    : asString(artistValue)
      ? [asString(artistValue) as string]
      : undefined;

  const cover =
    asString(data.albumImage) ||
    asString(data.coverUrl) ||
    asString(data.cover) ||
    asString(data.image) ||
    asString(data.artUrl) ||
    asString(data.art_url);
  const status = asString(data.status)?.toLowerCase();
  const progress =
    asNumber(data.progress) ??
    asNumber(data.progressMs) ??
    asNumber(data.progress_ms) ??
    asNumber(data.positionMs) ??
    asNumber(data.position_ms) ??
    asNumber(data.position);

  return {
    id:
      asString(data.id) ||
      asString(data.songId) ||
      asString(data.trackId) ||
      asString(data.uri) ||
      asString(data.path),
    title:
      asString(data.title) ||
      asString(data.name) ||
      asString(data.track) ||
      asString(data.titulo),
    artists,
    album: asString(data.album) || asString(data.albumName) || asString(data.album_name),
    albumImage: resolveMediaUrl(cover),
    coverUrl: resolveMediaUrl(cover),
    duration:
      asNumber(data.duration) ??
      asNumber(data.durationMs) ??
      asNumber(data.duration_ms),
    progress,
    isPlaying:
      typeof data.isPlaying === "boolean"
        ? data.isPlaying
        : typeof data.is_playing === "boolean"
          ? data.is_playing
          : typeof data.playing === "boolean"
            ? data.playing
            : status
              ? status === "playing"
              : undefined,
    uri: asString(data.uri),
    error: asString(data.error),
  };
}

export async function playPause(): Promise<{ success?: boolean }> {
  const data = await request<unknown>("/play-pause", { method: "PUT" });
  return isRecord(data) ? { success: data.success !== false } : { success: true };
}

export async function nextTrack(): Promise<{ success?: boolean }> {
  const data = await request<unknown>("/next", { method: "POST" });
  return isRecord(data) ? { success: data.success !== false } : { success: true };
}

export async function previousTrack(): Promise<{ success?: boolean }> {
  const data = await request<unknown>("/previous", { method: "POST" });
  return isRecord(data) ? { success: data.success !== false } : { success: true };
}

export async function seek(positionMs: number): Promise<{ success?: boolean }> {
  const data = await request<unknown>(`/seek?position=${Math.round(positionMs)}`, {
    method: "PUT",
  });
  return isRecord(data) ? { success: data.success !== false } : { success: true };
}

function lyricsText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (!Array.isArray(value)) return null;

  const lines = value
    .map((entry) => {
      if (typeof entry === "string") return entry;
      if (!isRecord(entry)) return null;

      const text = asString(entry.text) || asString(entry.line) || asString(entry.lyric);
      if (!text) return null;

      const timeMs =
        asNumber(entry.timeMs) ??
        asNumber(entry.time_ms) ??
        (asNumber(entry.time) !== undefined ? asNumber(entry.time)! * 1000 : undefined);

      if (timeMs === undefined) return text;
      const totalSeconds = timeMs / 1000;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `[${String(minutes).padStart(2, "0")}:${seconds
        .toFixed(2)
        .padStart(5, "0")}]${text}`;
    })
    .filter((line): line is string => Boolean(line));

  return lines.length > 0 ? lines.join("\n") : null;
}

export async function getLyrics(id: string): Promise<LyricsResponse> {
  if (!id) return { plainLyrics: null, syncedLyrics: null };

  const raw = await request<unknown>(`/lyrics/${encodeURIComponent(id)}`);
  if (typeof raw === "string") {
    return { plainLyrics: raw, syncedLyrics: null };
  }
  const data = unwrapContainer(raw, ["data", "lyrics"]);
  if (typeof data === "string") {
    return { plainLyrics: data, syncedLyrics: null };
  }
  if (!isRecord(data)) {
    return { plainLyrics: null, syncedLyrics: null };
  }

  let synced =
    lyricsText(data.syncedLyrics) ||
    lyricsText(data.synced) ||
    lyricsText(data.lrc) ||
    null;
  let plain =
    lyricsText(data.plainLyrics) ||
    lyricsText(data.plain) ||
    lyricsText(data.text) ||
    null;

  const generic = lyricsText(data.lyrics) || lyricsText(data.letra);
  if (generic) {
    if (generic.includes("[")) synced = synced || generic;
    else plain = plain || generic;
  }

  return { plainLyrics: plain, syncedLyrics: synced };
}

function songId(raw: Record<string, unknown>, index: number): string {
  return (
    asString(raw.id) ||
    asString(raw.songId) ||
    asString(raw.trackId) ||
    asString(raw.uri) ||
    asString(raw.path) ||
    asString(raw.ruta) ||
    `song-${index}`
  );
}

function normalizeSong(raw: unknown, index: number): LibrarySong | null {
  if (!isRecord(raw)) return null;

  const artistValue = raw.artists ?? raw.artist ?? raw.artista;
  const artists = Array.isArray(artistValue)
    ? artistValue.map(asString).filter((artist): artist is string => Boolean(artist))
    : asString(artistValue)
      ? [asString(artistValue) as string]
      : [];

  const cover = asString(raw.albumImage) || asString(raw.coverUrl) || asString(raw.cover);

  return {
    id: songId(raw, index),
    title:
      asString(raw.title) ||
      asString(raw.name) ||
      asString(raw.titulo) ||
      "Canción sin título",
    artists,
    album: asString(raw.album) || asString(raw.albumName),
    albumImage: resolveMediaUrl(cover),
    coverUrl: resolveMediaUrl(cover),
    duration: asNumber(raw.duration) ?? asNumber(raw.durationMs) ?? asNumber(raw.duracionMs),
    uri: asString(raw.uri),
    path: asString(raw.path) || asString(raw.ruta),
  };
}

function normalizeAlbum(raw: unknown, index: number): LibraryAlbum | null {
  if (!isRecord(raw)) return null;

  const rawSongs = raw.songs ?? raw.tracks ?? raw.canciones;
  const songs = Array.isArray(rawSongs)
    ? rawSongs
        .map((song, songIndex) => normalizeSong(song, songIndex))
        .filter((song): song is LibrarySong => song !== null)
    : undefined;

  const cover = asString(raw.coverUrl) || asString(raw.albumImage) || asString(raw.cover);

  return {
    id:
      asString(raw.id) ||
      asString(raw.albumId) ||
      asString(raw.name) ||
      asString(raw.title) ||
      `album-${index}`,
    title:
      asString(raw.title) ||
      asString(raw.name) ||
      asString(raw.album) ||
      "Álbum sin título",
    artist: asString(raw.artist) || asString(raw.artistName) || asString(raw.artista),
    year: asNumber(raw.year) ?? asNumber(raw.anio) ?? asNumber(raw.año),
    coverUrl: resolveMediaUrl(cover),
    albumImage: resolveMediaUrl(cover),
    songCount: asNumber(raw.songCount) ?? songs?.length,
    songs,
  };
}

function normalizeArtist(raw: unknown, index: number): LibraryArtist | null {
  if (!isRecord(raw)) return null;

  const cover = asString(raw.coverUrl) || asString(raw.albumImage) || asString(raw.cover);
  const rawSongs = raw.songs ?? raw.tracks ?? raw.canciones;
  const songs = Array.isArray(rawSongs)
    ? rawSongs
        .map((song, songIndex) => normalizeSong(song, songIndex))
        .filter((song): song is LibrarySong => song !== null)
    : undefined;

  return {
    id:
      asString(raw.id) ||
      asString(raw.artistId) ||
      asString(raw.name) ||
      `artist-${index}`,
    name:
      asString(raw.name) ||
      asString(raw.title) ||
      asString(raw.artist) ||
      asString(raw.artista) ||
      "Artista desconocido",
    coverUrl: resolveMediaUrl(cover),
    albumImage: resolveMediaUrl(cover),
    songCount: asNumber(raw.songCount) ?? songs?.length,
    songs,
  };
}

function normalizePlaylist(raw: unknown, index: number): Playlist | null {
  if (!isRecord(raw)) return null;

  const rawSongs = raw.songs ?? raw.tracks ?? raw.canciones ?? raw.items;
  const songs = Array.isArray(rawSongs)
    ? rawSongs
        .map((song, songIndex) => normalizeSong(song, songIndex))
        .filter((song): song is LibrarySong => song !== null)
    : undefined;

  const cover =
    asString(raw.coverUrl) ||
    asString(raw.albumImage) ||
    asString(raw.cover) ||
    songs?.[0]?.coverUrl;

  return {
    id:
      asString(raw.id) ||
      asString(raw.playlistId) ||
      asString(raw.name) ||
      `playlist-${index}`,
    name:
      asString(raw.name) ||
      asString(raw.title) ||
      asString(raw.nombre) ||
      "Playlist sin nombre",
    coverUrl: resolveMediaUrl(cover),
    albumImage: resolveMediaUrl(cover),
    songCount: asNumber(raw.songCount) ?? songs?.length,
    songs,
  };
}

function albumKey(song: LibrarySong): string {
  return `${song.artists[0] ?? ""}::${song.album ?? ""}`;
}

function songToAlbum(song: LibrarySong): LibraryAlbum {
  return {
    id: albumKey(song) || `album-${song.title}`,
    title: song.album || "Álbum desconocido",
    artist: song.artists[0],
    coverUrl: song.coverUrl,
    albumImage: song.albumImage,
    songCount: 1,
    songs: [song],
  };
}

function songToArtist(song: LibrarySong): LibraryArtist {
  const name = song.artists[0] || "Artista desconocido";
  return {
    id: name,
    name,
    coverUrl: song.coverUrl,
    albumImage: song.albumImage,
    songCount: 1,
    songs: [song],
  };
}

export async function getLibrary(): Promise<LibraryResponse> {
  const raw = await request<unknown>("/library");
  const data = unwrapContainer(raw, ["library", "data"]);

  if (Array.isArray(data)) {
    const songs = data
      .map((song, index) => normalizeSong(song, index))
      .filter((song): song is LibrarySong => song !== null);
    return buildLibrary(songs, [], []);
  }

  if (!isRecord(data)) {
    return { songs: [], albums: [], artists: [] };
  }

  const rawSongs = data.songs ?? data.tracks ?? data.canciones;
  const rawAlbums = data.albums ?? data.albumes;
  const rawArtists = data.artists ?? data.artistas;

  let songs = Array.isArray(rawSongs)
    ? rawSongs
        .map((song, index) => normalizeSong(song, index))
        .filter((song): song is LibrarySong => song !== null)
    : [];

  let albums = Array.isArray(rawAlbums)
    ? rawAlbums
        .map((album, index) => normalizeAlbum(album, index))
        .filter((album): album is LibraryAlbum => album !== null)
    : [];

  let artists = Array.isArray(rawArtists)
    ? rawArtists
        .map((artist, index) => normalizeArtist(artist, index))
        .filter((artist): artist is LibraryArtist => artist !== null)
    : [];

  // Some players group everything under artists: artist -> albums -> songs.
  if (Array.isArray(rawArtists)) {
    const knownAlbumIds = new Set(albums.map((album) => album.id));

    for (const rawArtist of rawArtists) {
      if (!isRecord(rawArtist)) continue;
      const artistName =
        asString(rawArtist.name) ||
        asString(rawArtist.title) ||
        asString(rawArtist.artist);
      const nestedAlbums = rawArtist.albums ?? rawArtist.albumes;
      if (!Array.isArray(nestedAlbums)) continue;

      for (const rawAlbum of nestedAlbums) {
        if (!isRecord(rawAlbum)) continue;
        const albumName =
          asString(rawAlbum.title) ||
          asString(rawAlbum.name) ||
          asString(rawAlbum.album) ||
          "Álbum sin título";
        const albumCover =
          asString(rawAlbum.coverUrl) ||
          asString(rawAlbum.albumImage) ||
          asString(rawAlbum.cover);
        const nestedSongs = rawAlbum.songs ?? rawAlbum.tracks ?? rawAlbum.canciones;
        if (!Array.isArray(nestedSongs)) continue;

        const albumSongs: LibrarySong[] = [];
        for (const rawSong of nestedSongs) {
          const song =
            isRecord(rawSong)
              ? normalizeSong(
                  {
                    ...rawSong,
                    album: rawSong.album ?? albumName,
                    artist: rawSong.artist ?? artistName,
                    coverUrl: rawSong.coverUrl ?? rawSong.albumImage ?? albumCover,
                  },
                  songs.length,
                )
              : normalizeSong(rawSong, songs.length);
          if (song) {
            albumSongs.push(song);
            songs.push(song);
          }
        }

        const albumId =
          asString(rawAlbum.id) ||
          asString(rawAlbum.albumId) ||
          `${artistName ?? "artista"}:${albumName}`;

        if (albumSongs.length > 0 && !knownAlbumIds.has(albumId)) {
          knownAlbumIds.add(albumId);
          albums.push({
            id: albumId,
            title: albumName,
            artist: artistName,
            coverUrl: resolveMediaUrl(albumCover),
            albumImage: resolveMediaUrl(albumCover),
            songCount: albumSongs.length,
            songs: albumSongs,
          });
        }
      }
    }
  }

  return buildLibrary(songs, albums, artists);
}

function buildLibrary(
  songs: LibrarySong[],
  albums: LibraryAlbum[],
  artists: LibraryArtist[],
): LibraryResponse {
  if (albums.length === 0 && songs.length > 0) {
    const grouped = new Map<string, LibraryAlbum>();
    for (const song of songs) {
      if (!song.album) continue;
      const key = albumKey(song);
      const existing = grouped.get(key);
      if (existing) {
        existing.songCount = (existing.songCount ?? 0) + 1;
        existing.songs = [...(existing.songs ?? []), song];
      } else {
        grouped.set(key, songToAlbum(song));
      }
    }
    albums = Array.from(grouped.values());
  }

  if (artists.length === 0 && songs.length > 0) {
    const grouped = new Map<string, LibraryArtist>();
    for (const song of songs) {
      const name = song.artists[0] || "Artista desconocido";
      const existing = grouped.get(name);
      if (existing) {
        existing.songCount = (existing.songCount ?? 0) + 1;
        existing.songs = [...(existing.songs ?? []), song];
      } else {
        grouped.set(name, songToArtist(song));
      }
    }
    artists = Array.from(grouped.values());
  }

  return { songs, albums, artists };
}

export async function getPlaylists(): Promise<Playlist[]> {
  const raw = await request<unknown>("/playlists");
  let data = unwrapContainer(raw, ["playlists", "listas", "data"]);

  if (!Array.isArray(data) && isRecord(data)) {
    const nested = data.playlists ?? data.listas ?? data.items;
    if (Array.isArray(nested)) data = nested;
  }

  if (!Array.isArray(data)) return [];

  return data
    .map((playlist, index) => normalizePlaylist(playlist, index))
    .filter((playlist): playlist is Playlist => playlist !== null);
}

/** Loads one playlist with its songs: `GET /playlists/:id`. */
export async function getPlaylist(id: string | number): Promise<Playlist | null> {
  const raw = await request<unknown>(`/playlists/${encodeURIComponent(String(id))}`);
  const data = isRecord(raw) && isRecord(raw.data) ? raw.data : raw;
  return normalizePlaylist(data, 0);
}

/**
 * Starts a queue on the player. `/play` expects the full list of song IDs and
 * the index where playback starts.
 */
export async function play(
  ids: string[],
  start = 0,
): Promise<{ success?: boolean }> {
  if (ids.length === 0) {
    throw new Error("No hay canciones para reproducir.");
  }

  const data = await request<unknown>("/play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, start }),
  });

  return isRecord(data) ? { success: data.ok !== false } : { success: true };
}

/* ------------------------------------------------------------------ */
/* Queue                                                              */
/* ------------------------------------------------------------------ */

export interface QueueItem {
  id: string;
  title: string;
  artists: string[];
  album?: string;
  coverUrl?: string;
  duration?: number;
}

export interface QueueState {
  generation: number;
  index: number;
  isPlaying: boolean;
  items: QueueItem[];
}

function normalizeQueueItem(raw: unknown, index: number): QueueItem | null {
  if (!isRecord(raw)) return null;

  const artistValue = raw.artists ?? raw.artist ?? raw.artista;
  const artists = Array.isArray(artistValue)
    ? artistValue.map(asString).filter((artist): artist is string => Boolean(artist))
    : asString(artistValue)
      ? [asString(artistValue) as string]
      : [];

  const cover = asString(raw.coverUrl) || asString(raw.albumImage) || asString(raw.cover);

  return {
    id: songId(raw, index),
    title:
      asString(raw.title) ||
      asString(raw.name) ||
      asString(raw.titulo) ||
      "Canción sin título",
    artists,
    album: asString(raw.album) || asString(raw.albumName),
    coverUrl: resolveMediaUrl(cover),
    duration: asNumber(raw.duration) ?? asNumber(raw.durationMs),
  };
}

export async function getQueue(): Promise<QueueState> {
  const raw = await request<unknown>("/queue");
  const container = unwrapContainer(raw, ["queue", "data"]);

  const itemsSource = Array.isArray(container)
    ? container
    : isRecord(container)
      ? container.items ?? container.songs ?? container.tracks
      : null;

  const items = Array.isArray(itemsSource)
    ? itemsSource
        .map((item, index) => normalizeQueueItem(item, index))
        .filter((item): item is QueueItem => item !== null)
    : [];

  const data = isRecord(container) ? container : {};

  return {
    generation: asNumber(data.generation) ?? 0,
    index: asNumber(data.index) ?? 0,
    isPlaying:
      typeof data.isPlaying === "boolean"
        ? data.isPlaying
        : typeof data.is_playing === "boolean"
          ? data.is_playing
          : typeof data.playing === "boolean"
            ? data.playing
            : false,
    items,
  };
}

export async function addToQueue(ids: string[]): Promise<void> {
  await request<unknown>("/queue/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

export async function removeFromQueue(
  index: number,
  generation: number,
): Promise<void> {
  await request<unknown>(
    `/queue/${index}?generation=${encodeURIComponent(String(generation))}`,
    { method: "DELETE" },
  );
}

export async function reorderQueue(
  from: number,
  to: number,
  generation: number,
): Promise<void> {
  await request<unknown>("/queue/reorder", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, generation }),
  });
}

export async function playQueueItem(
  index: number,
  generation: number,
): Promise<void> {
  await request<unknown>("/queue/play", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index, generation }),
  });
}

/* ------------------------------------------------------------------ */
/* Audio mixer                                                        */
/* ------------------------------------------------------------------ */

export interface AudioSession {
  id: string;
  name: string;
  process: string;
  volume: number;
  muted: boolean;
  iconUrl?: string;
}

export interface AudioState {
  supported: boolean;
  platform: string;
  music: { volume: number };
  master: { device: string; volume: number; muted: boolean };
  sessions: AudioSession[];
}

// The backend is assumed to report volumes as percentages (0-100).
function clampVolume(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function normalizeAudioSession(raw: unknown, index: number): AudioSession | null {
  if (!isRecord(raw)) return null;

  const icon = asString(raw.iconUrl) || asString(raw.icon) || asString(raw.icon_url);

  return {
    id: asString(raw.id) || `session-${index}`,
    name:
      asString(raw.name) ||
      asString(raw.title) ||
      asString(raw.process) ||
      "Aplicación",
    process: asString(raw.process) || asString(raw.exe) || "",
    volume: clampVolume(asNumber(raw.volume) ?? 0),
    muted:
      typeof raw.muted === "boolean"
        ? raw.muted
        : typeof raw.isMuted === "boolean"
          ? raw.isMuted
          : false,
    iconUrl: resolveMediaUrl(icon),
  };
}

export async function getAudio(): Promise<AudioState> {
  const raw = await request<unknown>("/audio");
  const container = unwrapContainer(raw, ["audio", "data"]);
  const data = isRecord(container) ? container : {};

  const music = isRecord(data.music) ? data.music : {};
  const master = isRecord(data.master) ? data.master : {};
  const sessionsSource = data.sessions ?? data.applications ?? data.apps;

  const sessions = Array.isArray(sessionsSource)
    ? sessionsSource
        .map((session, index) => normalizeAudioSession(session, index))
        .filter((session): session is AudioSession => session !== null)
    : [];

  return {
    supported: data.supported !== false,
    platform: asString(data.platform) || "",
    music: { volume: clampVolume(asNumber(music.volume) ?? 0) },
    master: {
      device:
        asString(master.device) ||
        asString(master.name) ||
        asString(master.deviceName) ||
        "",
      volume: clampVolume(asNumber(master.volume) ?? 0),
      muted:
        typeof master.muted === "boolean"
          ? master.muted
          : typeof master.isMuted === "boolean"
            ? master.isMuted
            : false,
    },
    sessions,
  };
}

export async function setMusicVolume(volume: number): Promise<void> {
  await request<unknown>("/audio/music", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ volume: clampVolume(volume) }),
  });
}

export async function setMasterVolume(
  volume: number,
  muted: boolean,
): Promise<void> {
  await request<unknown>("/audio/master", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ volume: clampVolume(volume), muted }),
  });
}

export async function setSessionVolume(
  id: string,
  volume: number,
  muted: boolean,
): Promise<void> {
  await request<unknown>(`/audio/sessions/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ volume: clampVolume(volume), muted }),
  });
}
