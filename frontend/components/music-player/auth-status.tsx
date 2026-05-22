"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getServerStatus, login } from "@/lib/api";

export function AuthStatus() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [showConnected, setShowConnected] = useState(false);
  const prevAuthedRef = useRef<boolean | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const status = await getServerStatus();
        const wasAuthed = prevAuthedRef.current;
        prevAuthedRef.current = status.authed;
        setAuthed(status.authed);

        if (status.authed && !wasAuthed) {
          setShowConnected(true);
          setTimeout(() => setShowConnected(false), 10000);
        }
      } catch {
        setAuthed(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  if (authed === null) return null;

  return (
    <>
      <AnimatePresence>
        {authed && showConnected && (
          <motion.div
            className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20 flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 rounded-full backdrop-blur-xl bg-white/10 border border-white/20"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white/80 text-xs sm:text-sm font-medium">Spotify conectado</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!authed && (
          <motion.div
            className="absolute top-3 right-3 sm:top-6 sm:right-6 z-20"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <button
              onClick={login}
              className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 sm:py-3 rounded-full backdrop-blur-xl bg-[#1DB954]/90 border border-[#1DB954] text-white text-sm sm:text-base font-semibold hover:bg-[#1DB954] transition-colors"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Conectar Spotify
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
