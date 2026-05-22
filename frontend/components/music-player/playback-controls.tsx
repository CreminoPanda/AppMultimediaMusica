"use client";

import { motion } from "framer-motion";
import { Play, Pause, SkipBack, SkipForward, Shuffle, Repeat } from "lucide-react";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  shuffle?: boolean;
  onShuffleToggle?: () => void;
  repeat?: "off" | "all" | "one";
  onRepeatToggle?: () => void;
  size?: "small" | "medium" | "large" | "xlarge";
  stretched?: boolean;
}

const sizeConfig = {
  small: {
    gap: "gap-1.5 sm:gap-2",
    playBtn: "w-9 h-9 sm:w-10 sm:h-10",
    playIcon: "w-3.5 h-3.5 sm:w-4 sm:h-4",
    ctrlBtn: "w-7 h-7 sm:w-8 sm:h-8",
    ctrlIcon: "w-3.5 h-3.5 sm:w-4 sm:h-4",
    secondaryIcon: "w-3 h-3 sm:w-3.5 sm:h-3.5",
  },
  medium: {
    gap: "gap-2 sm:gap-3",
    playBtn: "w-11 h-11 sm:w-12 sm:h-12",
    playIcon: "w-4.5 h-4.5 sm:w-5 sm:h-5",
    ctrlBtn: "w-8 h-8 sm:w-9 sm:h-9",
    ctrlIcon: "w-4 h-4 sm:w-5 sm:h-5",
    secondaryIcon: "w-3.5 h-3.5 sm:w-4 sm:h-4",
  },
  large: {
    gap: "gap-3 sm:gap-4 md:gap-4 lg:gap-6",
    playBtn: "w-12 h-12 sm:w-14 sm:h-14 md:w-14 md:h-14 lg:w-16 lg:h-16",
    playIcon: "w-5 h-5 sm:w-6 sm:h-6 md:w-6 md:h-6 lg:w-7 lg:h-7",
    ctrlBtn: "w-9 h-9 sm:w-10 sm:h-10 md:w-10 md:h-10 lg:w-12 lg:h-12",
    ctrlIcon: "w-5 h-5 sm:w-6 sm:h-6",
    secondaryIcon: "w-4 h-4 sm:w-5 sm:h-5",
  },
  xlarge: {
    gap: "gap-4 sm:gap-6 md:gap-6 lg:gap-8",
    playBtn: "w-14 h-14 sm:w-16 sm:h-16 md:w-16 md:h-16 lg:w-20 lg:h-20",
    playIcon: "w-6 h-6 sm:w-7 sm:h-7 md:w-7 md:h-7 lg:w-9 lg:h-9",
    ctrlBtn: "w-10 h-10 sm:w-12 sm:h-12 md:w-12 md:h-12 lg:w-14 lg:h-14",
    ctrlIcon: "w-5 h-5 sm:w-6 sm:h-6 md:w-6 md:h-6 lg:w-7 lg:h-7",
    secondaryIcon: "w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5 lg:w-6 lg:h-6",
  },
};

export function PlaybackControls({
  isPlaying,
  onPlayPause,
  onPrevious,
  onNext,
  shuffle = false,
  onShuffleToggle,
  repeat = "off",
  onRepeatToggle,
  size = "medium",
  stretched = false,
}: PlaybackControlsProps) {
  const config = sizeConfig[size];

  if (stretched) {
    return (
      <motion.div
        className="flex items-center justify-between w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
      >
        <div className="flex items-center gap-2 sm:gap-3">
          {onShuffleToggle && (
            <ControlButton 
              onClick={onShuffleToggle} 
              ariaLabel="Shuffle" 
              isActive={shuffle}
              btnSize={config.ctrlBtn}
            >
              <Shuffle className={config.secondaryIcon} />
            </ControlButton>
          )}

          <ControlButton onClick={onPrevious} ariaLabel="Previous track" btnSize={config.ctrlBtn}>
            <SkipBack className={`${config.ctrlIcon} fill-current`} />
          </ControlButton>
        </div>

        <motion.button
          onClick={onPlayPause}
          className={`relative flex items-center justify-center rounded-full bg-white text-black ${config.playBtn}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <motion.div
            className="absolute inset-0 rounded-full bg-white blur-xl"
            animate={{
              opacity: isPlaying ? [0.4, 0.6, 0.4] : 0.3,
              scale: isPlaying ? [1, 1.15, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.div className="relative z-10">
            {isPlaying ? (
              <Pause className={`${config.playIcon} fill-current`} />
            ) : (
              <Play className={`${config.playIcon} fill-current ml-0.5`} />
            )}
          </motion.div>
        </motion.button>

        <div className="flex items-center gap-2 sm:gap-3">
          <ControlButton onClick={onNext} ariaLabel="Next track" btnSize={config.ctrlBtn}>
            <SkipForward className={`${config.ctrlIcon} fill-current`} />
          </ControlButton>

          {onRepeatToggle && (
            <ControlButton 
              onClick={onRepeatToggle} 
              ariaLabel="Repeat" 
              isActive={repeat !== "off"}
              btnSize={config.ctrlBtn}
            >
              <div className="relative">
                <Repeat className={config.secondaryIcon} />
                {repeat === "one" && (
                  <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>
                )}
              </div>
            </ControlButton>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex items-center justify-center ${config.gap}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
    >
      {onShuffleToggle && (
        <ControlButton 
          onClick={onShuffleToggle} 
          ariaLabel="Shuffle" 
          isActive={shuffle}
          btnSize={config.ctrlBtn}
        >
          <Shuffle className={config.secondaryIcon} />
        </ControlButton>
      )}

      <ControlButton onClick={onPrevious} ariaLabel="Previous track" btnSize={config.ctrlBtn}>
        <SkipBack className={`${config.ctrlIcon} fill-current`} />
      </ControlButton>

      <motion.button
        onClick={onPlayPause}
        className={`relative flex items-center justify-center rounded-full bg-white text-black ${config.playBtn}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-white blur-xl"
          animate={{
            opacity: isPlaying ? [0.4, 0.6, 0.4] : 0.3,
            scale: isPlaying ? [1, 1.15, 1] : 1,
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div className="relative z-10">
          {isPlaying ? (
            <Pause className={`${config.playIcon} fill-current`} />
          ) : (
            <Play className={`${config.playIcon} fill-current ml-0.5`} />
          )}
        </motion.div>
      </motion.button>

      <ControlButton onClick={onNext} ariaLabel="Next track" btnSize={config.ctrlBtn}>
        <SkipForward className={`${config.ctrlIcon} fill-current`} />
      </ControlButton>

      {onRepeatToggle && (
        <ControlButton 
          onClick={onRepeatToggle} 
          ariaLabel="Repeat" 
          isActive={repeat !== "off"}
          btnSize={config.ctrlBtn}
        >
          <div className="relative">
            <Repeat className={config.secondaryIcon} />
            {repeat === "one" && (
              <span className="absolute -top-1 -right-1 text-[8px] font-bold">1</span>
            )}
          </div>
        </ControlButton>
      )}
    </motion.div>
  );
}

interface ControlButtonProps {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
  isActive?: boolean;
  btnSize: string;
}

function ControlButton({ onClick, ariaLabel, children, isActive = false, btnSize }: ControlButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`relative flex items-center justify-center rounded-full transition-colors ${btnSize} ${
        isActive ? "text-white" : "text-white/60 hover:text-white"
      }`}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      aria-label={ariaLabel}
    >
      {/* Active glow */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-full bg-white/20 blur-md"
          animate={{
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
