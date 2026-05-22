export const API_URL = process.env.NEXT_PUBLIC_SPOTIFY_API_URL || "http://192.168.100.8:3001";

export interface NowPlayingResponse {
  id?: string;
  title?: string;
  artists?: string[];
  album?: string;
  albumImage?: string;
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

export async function getServerStatus(): Promise<{ status: string; authed: boolean }> {
  const res = await fetch(`${API_URL}/`);
  return res.json();
}

export async function getNowPlaying(): Promise<NowPlayingResponse> {
  const res = await fetch(`${API_URL}/now-playing`);
  return res.json();
}

export async function playPause(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/play-pause`, { method: "PUT" });
  return res.json();
}

export async function nextTrack(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/next`, { method: "POST" });
  return res.json();
}

export async function previousTrack(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/previous`, { method: "POST" });
  return res.json();
}

export async function seek(positionMs: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/seek?position=${positionMs}`, { method: "PUT" });
  return res.json();
}

export async function getLyrics(title: string, artist?: string): Promise<LyricsResponse> {
  const params = new URLSearchParams({ title });
  if (artist) params.append("artist", artist);
  const res = await fetch(`${API_URL}/lyrics?${params.toString()}`);
  return res.json();
}

export function login() {
  window.location.href = `${API_URL}/login`;
}
