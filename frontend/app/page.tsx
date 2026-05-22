"use client";

import { useState, useEffect } from "react";
import { MusicPlayer } from "@/components/music-player/music-player";
import { AuthContainer } from "@/components/auth-container";

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check local storage for token on client mount
    const savedToken = localStorage.getItem("music_player_token");
    setToken(savedToken);
    setLoading(false);
  }, []);

  const handleAuthSuccess = (newToken: string) => {
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem("music_player_token");
    localStorage.removeItem("music_player_email");
    setToken(null);
  };

  if (loading) {
    return (
      <div className="relative w-full h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="w-10 h-10 rounded-full border-t-2 border-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen">
      {token ? (
        <MusicPlayer onLogout={handleLogout} />
      ) : (
        <AuthContainer onAuthSuccess={handleAuthSuccess} />
      )}
    </main>
  );
}
