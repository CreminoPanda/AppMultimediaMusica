"use client";

import { FormEvent, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Music2,
  Server,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import {
  checkHealth,
  normalizeServerUrl,
  savePlayerServerUrl,
} from "@/lib/api";

type TestState = "idle" | "testing" | "success" | "error";

interface ServerSetupProps {
  onConfigured: (url: string) => void;
  initialUrl?: string;
}

export function ServerSetup({ onConfigured, initialUrl = "" }: ServerSetupProps) {
  const [url, setUrl] = useState(initialUrl);
  const [testState, setTestState] = useState<TestState>("idle");
  const [message, setMessage] = useState("");

  const validate = () => {
    const normalized = normalizeServerUrl(url);
    if (!normalized) {
      setTestState("error");
      setMessage("Escribe la URL del reproductor.");
      return null;
    }
    return normalized;
  };

  const handleTest = async () => {
    const normalized = validate();
    if (!normalized) return;

    setTestState("testing");
    setMessage("Comprobando conexión...");

    const healthy = await checkHealth(normalized);

    if (healthy) {
      setTestState("success");
      setMessage("Conexión correcta con el reproductor.");
    } else {
      setTestState("error");
      setMessage("No se pudo conectar. Revisa la IP y el puerto del reproductor.");
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const normalized = validate();
    if (!normalized) return;

    savePlayerServerUrl(normalized);
    onConfigured(normalized);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#0a0a0f]">
      <div
        className="absolute top-1/4 left-1/4 w-[520px] h-[520px] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(16, 185, 129, 0.09) 0%, rgba(16, 185, 129, 0) 70%)",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-[620px] h-[620px] translate-x-1/2 translate-y-1/2 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(124, 58, 237, 0.09) 0%, rgba(124, 58, 237, 0) 70%)",
        }}
      />
      <div className="noise-overlay" />

      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="w-full max-w-md relative z-10 py-8"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-[28px] bg-gradient-to-tr from-emerald-500 to-emerald-300 text-black shadow-lg shadow-emerald-500/20 mb-5"
            >
              <Music2 className="w-10 h-10" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Conecta tu reproductor
            </h1>
            <p className="text-neutral-500 text-xs sm:text-sm mt-2">
              Ingresa la dirección del reproductor en tu red local
            </p>
          </div>

          <div className="glass border border-white/5 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-black/80 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

            <form onSubmit={handleSubmit} className="relative space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="player-url"
                  className="text-xs text-neutral-400 font-medium flex items-center gap-1.5"
                >
                  <Server className="w-3.5 h-3.5 text-emerald-400" />
                  URL del reproductor
                </label>
                <div className="relative">
                  <Wifi className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                  <input
                    id="player-url"
                    type="text"
                    inputMode="url"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      if (testState !== "idle") {
                        setTestState("idle");
                        setMessage("");
                      }
                    }}
                    placeholder="http://192.168.1.100:3001"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                  />
                </div>
                <p className="text-[10px] text-neutral-600 leading-relaxed">
                  Ejemplo: http://192.168.1.100:3001 · Conexión directa por LAN.
                </p>
              </div>

              {message && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
                    testState === "success"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : testState === "error"
                        ? "bg-red-500/10 border-red-500/20 text-red-300"
                        : "bg-white/[0.03] border-white/10 text-neutral-300"
                  }`}
                >
                  {testState === "success" ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : testState === "error" ? (
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <Loader2 className="w-4 h-4 shrink-0 mt-0.5 animate-spin" />
                  )}
                  <span>{message}</span>
                </motion.div>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testState === "testing" || !url.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/10 text-white/80 hover:text-white text-xs font-semibold transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {testState === "testing" ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : testState === "error" ? (
                    <WifiOff className="w-4 h-4" />
                  ) : (
                    <Wifi className="w-4 h-4" />
                  )}
                  Probar conexión
                </button>

                <button
                  type="submit"
                  disabled={!url.trim()}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black text-xs font-bold transition-all disabled:bg-white/5 disabled:text-neutral-500 disabled:cursor-not-allowed"
                >
                  Guardar y continuar
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>

          <p className="text-center text-[10px] text-neutral-600 mt-5">
            El teléfono y el reproductor deben estar en la misma Wi-Fi.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
