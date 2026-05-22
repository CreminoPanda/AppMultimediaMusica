"use client";

import { motion } from "framer-motion";
import { useEffect, useState, useRef } from "react";

interface DynamicBackgroundProps {
  colors: string[];
}

export function DynamicBackground({ colors }: DynamicBackgroundProps) {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !canvasRef.current || colors.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      // Downsample the canvas resolution to drastically reduce the number of pixels to compute
      // A smaller canvas width/height (scaled up via CSS with blur) runs much faster on WebViews.
      const scaleFactor = 0.3; // 30% of actual screen width/height
      canvas.width = Math.max(300, window.innerWidth * scaleFactor);
      canvas.height = Math.max(200, window.innerHeight * scaleFactor);
    };
    resize();
    window.addEventListener("resize", resize);

    let animationId: number;
    let time = 0;

    const animate = () => {
      time += 0.002;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create multiple gradient blobs
      colors.forEach((color, index) => {
        const x =
          canvas.width *
          (0.3 +
            0.4 * Math.sin(time + index * 1.5) * Math.cos(time * 0.7 + index));
        const y =
          canvas.height *
          (0.3 +
            0.4 * Math.cos(time * 0.8 + index * 2) * Math.sin(time + index));
        const radius = Math.min(canvas.width, canvas.height) * (0.4 + 0.2 * Math.sin(time + index));

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, color);
        gradient.addColorStop(0.5, `${color}80`);
        gradient.addColorStop(1, "transparent");

        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [mounted, colors]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#111118] to-[#0d0d12]" />

      {/* Animated canvas for dynamic colors */}
      <motion.canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.55 }}
        transition={{ duration: 1.5 }}
        style={{ 
          filter: "blur(60px)", // reduced from 100px since the canvas is physically smaller (downsampled), 60px provides equal blur ratio
          transform: "translate3d(0,0,0)", // force GPU acceleration
          willChange: "transform, opacity",
          imageRendering: "auto",
        }}
      />

      {/* Mesh gradient overlay */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, ${colors[0] || "#1a1a2e"}20, transparent 50%),
            radial-gradient(ellipse 60% 80% at 80% 60%, ${colors[1] || "#16213e"}20, transparent 50%),
            radial-gradient(ellipse 100% 100% at 50% 100%, ${colors[2] || "#0f0f1a"}30, transparent 60%)
          `,
        }}
      />

      {/* Aurora effect */}
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          background: [
            `linear-gradient(45deg, ${colors[0]}15, transparent 50%, ${colors[1]}10)`,
            `linear-gradient(90deg, ${colors[1]}10, transparent 50%, ${colors[2]}15)`,
            `linear-gradient(135deg, ${colors[2]}15, transparent 50%, ${colors[0]}10)`,
            `linear-gradient(45deg, ${colors[0]}15, transparent 50%, ${colors[1]}10)`,
          ],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
      />
    </div>
  );
}
