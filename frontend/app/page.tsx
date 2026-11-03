"use client";

import { useState, useEffect } from "react";
import { MusicPlayer } from "@/components/music-player/music-player";
import { ServerSetup } from "@/components/server-setup";
import {
  clearPlayerServerUrl,
  getPlayerServerUrl,
  normalizeServerUrl,
} from "@/lib/api";

export default function Home() {
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setServerUrl(getPlayerServerUrl());
    setLoading(false);
  }, []);

  const handleConfigured = (url: string) => {
    setServerUrl(normalizeServerUrl(url));
  };

  const handleChangeServer = () => {
    clearPlayerServerUrl();
    setServerUrl(null);
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
      {serverUrl ? (
        <MusicPlayer
          serverUrl={serverUrl}
          onChangeServer={handleChangeServer}
        />
      ) : (
        <ServerSetup onConfigured={handleConfigured} />
      )}
    </main>
  );
}
