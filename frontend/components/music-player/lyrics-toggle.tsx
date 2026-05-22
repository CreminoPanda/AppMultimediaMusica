"use client";

import { motion } from "framer-motion";
import { Quote, Music2 } from "lucide-react";

interface LyricsToggleProps {
  showLyrics: boolean;
  onToggle: () => void;
}

export function LyricsToggle({ showLyrics, onToggle }: LyricsToggleProps) {
  return (
    <motion.button
      onClick={onToggle}
      className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full glass border border-white/10 text-white/80 hover:text-white hover:border-white/20 transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 17,
        delay: 0.6,
      }}
      aria-label={showLyrics ? "Show player controls" : "Show lyrics"}
    >
      <motion.div
        initial={false}
        animate={{ rotate: showLyrics ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        {showLyrics ? (
          <Music2 className="w-5 h-5 sm:w-6 sm:h-6" />
        ) : (
          <Quote className="w-5 h-5 sm:w-6 sm:h-6" />
        )}
      </motion.div>
    </motion.button>
  );
}
