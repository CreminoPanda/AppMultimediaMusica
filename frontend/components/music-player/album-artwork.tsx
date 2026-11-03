"use client";

import { useRef } from "react";
import { motion } from "framer-motion";

interface AlbumArtworkProps {
  src?: string;
  alt: string;
  dominantColor?: string;
  colors?: string[];
  isCircular?: boolean;
  isPlaying?: boolean;
  onToggle?: () => void;
  size?: "small" | "medium" | "large" | "xlarge";
}

const sizeClasses = {
  small: "max-w-[90px] sm:max-w-[110px] md:max-w-[120px]",
  medium: "max-w-[120px] sm:max-w-[140px] md:max-w-[150px] lg:max-w-[170px]",
  large: "max-w-[160px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-[280px]",
  xlarge: "max-w-[180px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[340px] xl:max-w-[400px]",
};

export function AlbumArtwork({
  src,
  alt,
  dominantColor = "#ffffff",
  colors = [],
  isCircular = false,
  isPlaying = false,
  onToggle,
  size = "medium",
}: AlbumArtworkProps) {
  const downRef = useRef<{ x: number; y: number } | null>(null);
  const movedRef = useRef(false);

  const glowColors =
    colors.length > 0 ? colors : [dominantColor, dominantColor, dominantColor];

  const artwork = (
    <motion.div
      className="relative h-full w-full overflow-hidden shadow-2xl"
      animate={{ borderRadius: isCircular ? "50%" : "16px" }}
      transition={{ type: "spring", stiffness: 140, damping: 22 }}
      style={{
        boxShadow: `
          0 20px 40px -10px rgba(0, 0, 0, 0.5),
          0 0 45px -15px ${dominantColor}40
        `,
        transform: "translate3d(0,0,0)",
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
      }}
    >
      <div
        className={`h-full w-full ${isCircular ? "vinyl-spin" : ""}`}
        style={{ animationPlayState: isPlaying ? "running" : "paused" }}
      >
        {src ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            style={{ transform: "translate3d(0,0,0)" }}
          />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center"
            style={{ backgroundColor: `${dominantColor}30` }}
          >
            <svg
              className="h-1/3 w-1/3 text-white/30"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
        )}
      </div>

      {!isCircular && src && (
        <motion.div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
          animate={{ opacity: [0.08, 0.15, 0.08] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.div
        className="pointer-events-none absolute inset-0 ring-1 ring-white/15"
        animate={{ borderRadius: isCircular ? "50%" : "16px" }}
        transition={{ type: "spring", stiffness: 140, damping: 22 }}
      />
    </motion.div>
  );

  return (
    <motion.div
      className={`relative aspect-square w-full ${sizeClasses[size]}`}
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
    >
      {/* Ambient glow stays outside the rotating wrapper on purpose. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-[-18%] rounded-full"
        animate={{ opacity: [0.28, 0.45, 0.28], scale: [1, 1.03, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: isCircular
            ? `conic-gradient(from 0deg, ${glowColors[0]}70, ${glowColors[1]}50, ${glowColors[2]}35, transparent, ${glowColors[0]}70)`
            : `radial-gradient(circle, ${dominantColor}35 0%, transparent 70%)`,
          filter: "blur(16px)",
          willChange: "transform, opacity",
          transform: "translate3d(0,0,0)",
        }}
      />

      {onToggle ? (
        <motion.button
          type="button"
          onClick={() => {
            if (movedRef.current) {
              movedRef.current = false;
              return;
            }
            onToggle();
          }}
          onPointerDown={(event) => {
            downRef.current = { x: event.clientX, y: event.clientY };
            movedRef.current = false;
          }}
          onPointerMove={(event) => {
            const down = downRef.current;
            if (!down) return;
            if (
              Math.abs(event.clientX - down.x) > 8 ||
              Math.abs(event.clientY - down.y) > 8
            ) {
              movedRef.current = true;
            }
          }}
          whileTap={{ scale: 0.985 }}
          aria-label="Cambiar entre vinilo y portada cuadrada"
          aria-pressed={isCircular}
          className="relative block h-full w-full cursor-pointer rounded-[16px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          style={{ touchAction: "pan-y" }}
        >
          {artwork}
        </motion.button>
      ) : (
        <div className="relative h-full w-full">{artwork}</div>
      )}
    </motion.div>
  );
}
