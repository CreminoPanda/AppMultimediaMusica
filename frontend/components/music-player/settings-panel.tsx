"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
} from "lucide-react";
import { checkHealth } from "@/lib/api";
import { PageHeader } from "./section-pager";
import type { SwipeHandlers } from "./section-pager";

interface SettingsPanelProps {
  serverUrl: string;
  connected: boolean;
  swipe: SwipeHandlers;
  onChangeServer: () => void;
}

export function SettingsPanel({
  serverUrl,
  connected,
  swipe,
  onChangeServer,
}: SettingsPanelProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<boolean | null>(null);

  useEffect(() => {
    // A successful poll clears an old failed manual test.
    if (connected) setTestResult(null);
  }, [connected]);

  const isConnected =
    testing ? false : testResult !== null ? testResult : connected;
  const statusLabel = testing
    ? "Comprobando"
    : isConnected
      ? "Conectado"
      : "Desconectado";

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const healthy = await checkHealth(serverUrl);
    setTestResult(healthy);
    setTesting(false);
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Ajustes" swipe={swipe} />

      <div
        className="settings-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-24"
        style={{ touchAction: "pan-y" }}
        {...swipe}
      >
        <div className="space-y-6">
          <section className="space-y-3">
            <h4 className="pl-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
              Reproductor
            </h4>

            <div className="space-y-4 rounded-[22px] border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Server className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="truncate text-sm font-semibold text-white">
                    Servidor LAN
                  </span>
                </div>

                <span
                  className={`flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                    testing
                      ? "border-white/10 bg-white/5 text-white/60"
                      : isConnected
                        ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                        : "border-red-500/20 bg-red-500/10 text-red-400"
                  }`}
                >
                  {testing ? (
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  ) : isConnected ? (
                    <CheckCircle2 className="h-2.5 w-2.5" />
                  ) : (
                    <WifiOff className="h-2.5 w-2.5" />
                  )}
                  {statusLabel}
                </span>
              </div>

              <div className="rounded-xl border border-white/5 bg-black/40 px-3 py-2.5">
                <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-white/35">
                  URL actual
                </p>
                <p className="break-all font-mono text-[11px] leading-relaxed text-white/80">
                  {serverUrl}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                {isConnected ? (
                  <Wifi className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                ) : (
                  <WifiOff className="h-3.5 w-3.5 shrink-0 text-red-400" />
                )}
                <span className="leading-relaxed text-white/45">
                  {isConnected
                    ? "Recibiendo el estado del reproductor."
                    : "Revisa la IP y el puerto del reproductor."}
                </span>
              </div>

              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-all hover:bg-white/10 active:scale-[0.97] disabled:opacity-50"
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                <span>Probar conexión</span>
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <h4 className="pl-1 text-[10px] font-bold uppercase tracking-widest text-white/40">
              Conexión
            </h4>
            <button
              type="button"
              onClick={onChangeServer}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-white transition-all hover:bg-white/10 active:scale-[0.98]"
            >
              <span className="flex items-center gap-2">
                <ArrowLeftRight className="h-3.5 w-3.5 text-amber-400" />
                <span>Cambiar servidor</span>
              </span>
            </button>
          </section>

          <p className="pt-2 text-center text-[9px] font-bold uppercase tracking-widest text-white/25">
            Control por red local
          </p>
        </div>
      </div>
    </div>
  );
}
