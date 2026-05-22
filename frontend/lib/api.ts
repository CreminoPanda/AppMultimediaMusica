export const API_URL = process.env.NEXT_PUBLIC_SPOTIFY_API_URL || "http://localhost:3001";

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

// Helper to get authorization and JSON headers
function getHeaders(contentType: string = ""): HeadersInit {
  const headers: Record<string, string> = {};
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("music_player_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  if (contentType) {
    headers["Content-Type"] = contentType;
  }
  return headers;
}

// Authentication API Endpoints
export async function register(email: string, password: string): Promise<{ message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: getHeaders("application/json"),
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function verify(email: string, code: string): Promise<{ message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/verify`, {
    method: "POST",
    headers: getHeaders("application/json"),
    body: JSON.stringify({ email, code })
  });
  return res.json();
}

export async function loginUser(email: string, password: string): Promise<{ token?: string; email?: string; error?: string }> {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: getHeaders("application/json"),
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

export async function forgotPassword(email: string): Promise<{ message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/forgot-password`, {
    method: "POST",
    headers: getHeaders("application/json"),
    body: JSON.stringify({ email })
  });
  return res.json();
}

export async function resetPassword(email: string, code: string, newPassword: string): Promise<{ message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/reset-password`, {
    method: "POST",
    headers: getHeaders("application/json"),
    body: JSON.stringify({ email, code, newPassword })
  });
  return res.json();
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/change-password`, {
    method: "POST",
    headers: getHeaders("application/json"),
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return res.json();
}

export async function deleteAccount(password: string): Promise<{ message?: string; error?: string }> {
  const res = await fetch(`${API_URL}/delete-account`, {
    method: "DELETE",
    headers: getHeaders("application/json"),
    body: JSON.stringify({ password })
  });
  return res.json();
}

// Spotify / Playback API Endpoints
export async function getServerStatus(): Promise<{ status: string; authed: boolean }> {
  try {
    const res = await fetch(`${API_URL}/spotify/status`, {
      headers: getHeaders()
    });
    if (res.status === 401) {
      return { status: "unauthorized", authed: false };
    }
    const data = await res.json();
    return { status: "ok", authed: !!data.authed };
  } catch {
    return { status: "error", authed: false };
  }
}

export async function disconnectSpotify(): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_URL}/spotify/disconnect`, {
    method: "POST",
    headers: getHeaders()
  });
  return res.json();
}

export async function getNowPlaying(): Promise<NowPlayingResponse> {
  const res = await fetch(`${API_URL}/now-playing`, {
    headers: getHeaders()
  });
  if (res.status === 401) {
    const data = await res.json().catch(() => ({}));
    return { error: data.error || "Sesión de Spotify no vinculada o expirada" };
  }
  return res.json();
}

export async function playPause(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/play-pause`, { 
    method: "PUT",
    headers: getHeaders()
  });
  return res.json();
}

export async function nextTrack(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/next`, { 
    method: "POST",
    headers: getHeaders()
  });
  return res.json();
}

export async function previousTrack(): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/previous`, { 
    method: "POST",
    headers: getHeaders()
  });
  return res.json();
}

export async function seek(positionMs: number): Promise<{ success: boolean }> {
  const res = await fetch(`${API_URL}/seek?position=${positionMs}`, { 
    method: "PUT",
    headers: getHeaders()
  });
  return res.json();
}

export async function getLyrics(title: string, artist?: string): Promise<LyricsResponse> {
  const params = new URLSearchParams({ title });
  if (artist) params.append("artist", artist);
  const res = await fetch(`${API_URL}/lyrics?${params.toString()}`, {
    headers: getHeaders()
  });
  return res.json();
}

// Redirects the web browser/view to Spotify Authorization Endpoint passing the user JWT
export function login() {
  const token = localStorage.getItem("music_player_token");
  if (!token) {
    console.error("No se encontró el token de usuario.");
    return;
  }
  window.location.href = `${API_URL}/login?token=${token}`;
}
