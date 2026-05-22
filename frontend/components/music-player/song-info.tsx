"use client";

import { motion } from "framer-motion";

interface SongInfoProps {
  title: string;
  artist: string;
  album: string;
  alignment?: "left" | "center";
  size?: "small" | "medium" | "large" | "xlarge";
}

export function SongInfo({ 
  title, 
  artist, 
  album, 
  alignment = "left",
  size = "medium" 
}: SongInfoProps) {
  const alignClass = alignment === "center" ? "text-center" : "text-left";

  if (size === "small") {
    return (
      <motion.div
        className={`${alignClass} space-y-0.5`}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <motion.h2
          className="text-sm sm:text-base lg:text-base font-semibold text-white tracking-tight text-balance line-clamp-1"
          layout
        >
          {title}
        </motion.h2>
        <motion.p
          className="text-xs sm:text-sm lg:text-sm text-white/70 font-medium line-clamp-1"
          layout
        >
          {artist}
        </motion.p>
      </motion.div>
    );
  }

  if (size === "xlarge") {
    return (
      <motion.div
        className={`${alignClass} space-y-2 md:space-y-3`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <motion.h1
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight text-shadow text-balance"
          layout
        >
          {title}
        </motion.h1>
        <motion.p
          className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-white/80 font-medium"
          layout
        >
          {artist}
        </motion.p>
        <motion.p
          className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/50 font-normal"
          layout
        >
          {album}
        </motion.p>
      </motion.div>
    );
  }

  if (size === "large") {
    return (
      <motion.div
        className={`${alignClass} space-y-2`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
      >
        <motion.h1
          className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight text-shadow text-balance"
          layout
        >
          {title}
        </motion.h1>
        <motion.p
          className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 font-medium"
          layout
        >
          {artist}
        </motion.p>
        <motion.p
          className="text-sm sm:text-base md:text-lg lg:text-xl text-white/50 font-normal"
          layout
        >
          {album}
        </motion.p>
      </motion.div>
    );
  }

  // Medium size (default)
  return (
    <motion.div
      className={`${alignClass} space-y-1`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.6 }}
    >
      <motion.h1
        className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-white tracking-tight text-shadow text-balance"
        layout
      >
        {title}
      </motion.h1>
      <motion.p
        className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 font-medium"
        layout
      >
        {artist}
      </motion.p>
      <motion.p
        className="text-xs sm:text-sm md:text-base lg:text-lg text-white/50 font-normal"
        layout
      >
        {album}
      </motion.p>
    </motion.div>
  );
}
