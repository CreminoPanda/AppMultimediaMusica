"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AlbumArtworkProps {
  src: string;
  alt: string;
  dominantColor?: string;
  colors?: string[];
  isCircular?: boolean;
  size?: "small" | "medium" | "large" | "xlarge";
}

const sizeClasses = {
  small: "max-w-[100px] sm:max-w-[120px] md:max-w-[140px]",
  medium: "max-w-[140px] sm:max-w-[160px] md:max-w-[200px]",
  large: "max-w-[180px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[320px]",
  xlarge: "max-w-[200px] sm:max-w-[260px] md:max-w-[360px] lg:max-w-[400px]",
};

const sizePx = {
  small: "(max-width: 640px) 100px, (max-width: 768px) 120px, 140px",
  medium: "(max-width: 640px) 140px, (max-width: 768px) 160px, 200px",
  large: "(max-width: 640px) 180px, (max-width: 768px) 220px, (max-width: 1024px) 280px, 320px",
  xlarge: "(max-width: 640px) 200px, (max-width: 768px) 260px, (max-width: 1024px) 360px, 400px",
};

export function AlbumArtwork({ 
  src, 
  alt, 
  dominantColor = "#ffffff",
  colors = [],
  isCircular = false,
  size = "medium",
}: AlbumArtworkProps) {
  const glowColors = colors.length > 0 ? colors : [dominantColor, dominantColor, dominantColor];

  return (
    <motion.div
      className={`relative w-full aspect-square ${sizeClasses[size]}`}
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 100,
        damping: 20,
        delay: 0.2,
      }}
    >
      {/* Circular mode: Animated glow trail */}
      <AnimatePresence>
        {isCircular && (
          <>
            {/* Rotating glow trail */}
            <motion.div
              className="absolute inset-[-15%] rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                rotate: 360 
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                opacity: { duration: 0.5 },
                scale: { duration: 0.5 },
                rotate: { duration: 8, repeat: Infinity, ease: "linear" }
              }}
              style={{
                background: `conic-gradient(from 0deg, ${glowColors[0]}80, ${glowColors[1]}60, ${glowColors[2]}40, transparent, ${glowColors[0]}80)`,
                filter: "blur(20px)",
              }}
            />
            
            {/* Outer aura ring */}
            <motion.div
              className="absolute inset-[-20%] rounded-full"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.05, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                background: `radial-gradient(circle, transparent 50%, ${dominantColor}30 70%, transparent 100%)`,
                filter: "blur(15px)",
              }}
            />

            {/* Particle-like glow spots */}
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute w-4 h-4 rounded-full"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.8, 0],
                  scale: [0.5, 1.5, 0.5],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut",
                }}
                style={{
                  top: `${20 + Math.sin(i * 1.57) * 40}%`,
                  left: `${20 + Math.cos(i * 1.57) * 40}%`,
                  background: glowColors[i % 3],
                  filter: "blur(8px)",
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      {/* Square mode: Ambient glow */}
      <AnimatePresence>
        {!isCircular && (
          <>
            <motion.div
              className="absolute -inset-6 rounded-[30px] blur-3xl opacity-40"
              style={{ backgroundColor: dominantColor }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.3, 0.5, 0.3],
                scale: [1, 1.05, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute -inset-3 rounded-2xl blur-2xl opacity-25"
              style={{ backgroundColor: dominantColor }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.2, 0.4, 0.2],
                scale: [1.05, 1, 1.05],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
                delay: 0.5,
              }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Album artwork container - morphs between square and circle */}
      <motion.div
        className="relative w-full h-full overflow-hidden shadow-2xl"
        animate={{
          borderRadius: isCircular ? "50%" : "16px",
        }}
        transition={{
          borderRadius: { type: "spring", stiffness: 100, damping: 20 },
        }}
        whileHover={{ scale: isCircular ? 1 : 1.02 }}
        style={{
          boxShadow: `
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 60px -15px ${dominantColor}50
          `,
        }}
      >
        {/* Rotating wrapper for circular mode */}
        <motion.div
          className="w-full h-full"
          animate={isCircular ? { rotate: 360 } : {}}
          transition={isCircular ? { duration: 20, repeat: Infinity, ease: "linear" } : {}}
        >
          {/* Floating animation for square mode */}
          <motion.div
            className="w-full h-full"
            animate={!isCircular ? { y: [0, -6, 0] } : {}}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {src ? (
              <>
                <img
                  src={src}
                  alt={alt}
                  className="w-full h-full object-cover"
                />

                {!isCircular && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
                    animate={{
                      opacity: [0.1, 0.2, 0.1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: `${dominantColor}30` }}>
                <svg className="w-1/3 h-1/3 text-white/30" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* Edge highlight */}
        <motion.div 
          className="absolute inset-0 ring-1 ring-white/20"
          animate={{
            borderRadius: isCircular ? "50%" : "16px",
          }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        />
      </motion.div>
    </motion.div>
  );
}
