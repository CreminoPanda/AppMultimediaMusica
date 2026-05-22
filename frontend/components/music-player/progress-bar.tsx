"use client";

import { motion } from "framer-motion";
import { useState, useRef } from "react";

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  accentColor?: string;
  compact?: boolean;
  size?: "small" | "medium" | "large";
}

const sizeConfig = {
  small: {
    barHeight: "h-1",
    thumbSize: "w-3 h-3",
    thumbMargin: "-6px",
    labelSize: "text-xs",
    spacing: "space-y-1",
  },
  medium: {
    barHeight: "h-1.5",
    thumbSize: "w-4 h-4",
    thumbMargin: "-8px",
    labelSize: "text-xs lg:text-sm",
    spacing: "space-y-2",
  },
  large: {
    barHeight: "h-1.5 sm:h-2",
    thumbSize: "w-4 h-4 sm:w-5 sm:h-5",
    thumbMargin: "-8px sm:-10px",
    labelSize: "text-xs sm:text-sm md:text-base",
    spacing: "space-y-2 sm:space-y-3",
  },
};

export function ProgressBar({
  currentTime,
  duration,
  onSeek,
  accentColor = "#ffffff",
  compact = false,
  size = "medium",
}: ProgressBarProps) {
  const config = sizeConfig[size];
  const [isDragging, setIsDragging] = useState(false);
  const [hoverProgress, setHoverProgress] = useState<number | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;
    const newTime = clickPosition * duration;
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const position = (e.clientX - rect.left) / rect.width;
    setHoverProgress(Math.max(0, Math.min(100, position * 100)));
  };

  return (
    <motion.div
      className={`w-full ${config.spacing}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6 }}
    >
      {/* Progress bar */}
      <div
        ref={progressRef}
        className={`relative ${config.barHeight} bg-white/20 rounded-full cursor-pointer group`}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverProgress(null)}
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        role="slider"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        aria-label="Seek slider"
        tabIndex={0}
      >
        {/* Hover preview */}
        {hoverProgress !== null && (
          <motion.div
            className="absolute top-0 left-0 h-full bg-white/30 rounded-full"
            style={{ width: `${hoverProgress}%` }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}

        {/* Progress fill */}
        <motion.div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{ 
            width: `${progress}%`,
            backgroundColor: accentColor,
          }}
          transition={{ duration: isDragging ? 0 : 0.1 }}
        >
          {/* Glow on progress */}
          <motion.div
            className="absolute inset-0 rounded-full blur-sm opacity-60"
            style={{ backgroundColor: accentColor }}
          />
        </motion.div>

        {/* Thumb */}
        <motion.div
          className={`absolute top-1/2 -translate-y-1/2 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity ${config.thumbSize}`}
          style={{ left: `${progress}%`, marginLeft: config.thumbMargin }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          {/* Thumb glow */}
          <motion.div
            className="absolute inset-0 bg-white rounded-full blur-md opacity-50"
            style={{ boxShadow: `0 0 15px ${accentColor}` }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0.3, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      </div>

      {/* Time labels */}
      <div className={`flex justify-between text-white/50 font-medium tabular-nums ${config.labelSize}`}>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </motion.div>
  );
}
