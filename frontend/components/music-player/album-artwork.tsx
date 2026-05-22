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
  small: "max-w-[90px] sm:max-w-[110px] md:max-w-[120px]",
  medium: "max-w-[120px] sm:max-w-[140px] md:max-w-[150px] lg:max-w-[170px]",
  large: "max-w-[160px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-[280px]",
  xlarge: "max-w-[180px] sm:max-w-[220px] md:max-w-[280px] lg:max-w-[340px] xl:max-w-[400px]",
};

const sizePx = {
  small: "(max-width: 640px) 90px, (max-width: 768px) 110px, 120px",
  medium: "(max-width: 640px) 120px, (max-width: 768px) 140px, 150px",
  large: "(max-width: 640px) 160px, (max-width: 768px) 200px, (max-width: 1024px) 240px, 280px",
  xlarge: "(max-width: 640px) 180px, (max-width: 768px) 220px, (max-width: 1024px) 280px, 340px",
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
                rotate: { duration: 12, repeat: Infinity, ease: "linear" } // slowed down slightly for smoother frame steps
              }}
              style={{
                background: `conic-gradient(from 0deg, ${glowColors[0]}70, ${glowColors[1]}50, ${glowColors[2]}35, transparent, ${glowColors[0]}70)`,
                filter: "blur(16px)", // slightly reduced blur for faster GPU processing (from 20px)
                willChange: "transform",
                transform: "translate3d(0,0,0)",
              }}
            />
            
            {/* Outer aura ring */}
            <motion.div
              className="absolute inset-[-20%] rounded-full"
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0.3, 0.5, 0.3],
                scale: [1, 1.03, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 4, // slowed down for smoother interpolation
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{
                background: `radial-gradient(circle, transparent 55%, ${dominantColor}25 75%, transparent 100%)`,
                filter: "blur(12px)", // slightly reduced blur from 15px
                willChange: "transform, opacity",
                transform: "translate3d(0,0,0)",
              }}
            />

            {/* Particle-like glow spots */}
            {[0, 1, 2, 3].map((i) => (
              <motion.div
                key={i}
                className="absolute w-3.5 h-3.5 rounded-full"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: [0, 0.6, 0],
                  scale: [0.7, 1.3, 0.7],
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.75,
                  ease: "easeInOut",
                }}
                style={{
                  top: `${22 + Math.sin(i * 1.57) * 38}%`,
                  left: `${22 + Math.cos(i * 1.57) * 38}%`,
                  background: glowColors[i % 3],
                  filter: "blur(6px)", // reduced from 8px for rendering speed
                  willChange: "transform, opacity",
                  transform: "translate3d(0,0,0)",
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
              className="absolute -inset-6 rounded-[30px] opacity-35"
              style={{ 
                backgroundColor: dominantColor,
                filter: "blur(24px)", // changed from browser blur-3xl to style-based blur for GPU optimization
                willChange: "transform, opacity",
                transform: "translate3d(0,0,0)",
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.25, 0.4, 0.25],
                scale: [1, 1.03, 1],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute -inset-3 rounded-2xl opacity-20"
              style={{ 
                backgroundColor: dominantColor,
                filter: "blur(16px)", // changed from browser blur-2xl to style-based blur
                willChange: "transform, opacity",
                transform: "translate3d(0,0,0)",
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: [0.15, 0.3, 0.15],
                scale: [1.03, 1, 1.03],
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 4,
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
            0 20px 40px -10px rgba(0, 0, 0, 0.5),
            0 0 45px -15px ${dominantColor}40
          `,
          transform: "translate3d(0,0,0)", // GPU acceleration
          backfaceVisibility: "hidden",
          WebkitBackfaceVisibility: "hidden",
        }}
      >
        {/* Rotating wrapper for circular mode */}
        <motion.div
          className="w-full h-full"
          animate={isCircular ? { rotate: 360 } : {}}
          transition={isCircular ? { duration: 24, repeat: Infinity, ease: "linear" } : {}}
          style={{
            willChange: isCircular ? "transform" : "auto",
            transform: "translate3d(0,0,0)",
          }}
        >
          {/* Floating animation for square mode */}
          <motion.div
            className="w-full h-full"
            animate={!isCircular ? { y: [0, -4, 0] } : {}}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{
              willChange: !isCircular ? "transform" : "auto",
              transform: "translate3d(0,0,0)",
            }}
          >
            {src ? (
              <>
                <img
                  src={src}
                  alt={alt}
                  className="w-full h-full object-cover"
                  style={{
                    transform: "translate3d(0,0,0)",
                  }}
                />

                {!isCircular && (
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent"
                    animate={{
                      opacity: [0.08, 0.15, 0.08],
                    }}
                    transition={{
                      duration: 4,
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
          className="absolute inset-0 ring-1 ring-white/15"
          animate={{
            borderRadius: isCircular ? "50%" : "16px",
          }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
          style={{
            transform: "translate3d(0,0,0)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
