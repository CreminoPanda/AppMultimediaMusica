"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import {
  AlertCircle,
  Loader2,
  Monitor,
  Music2,
  RefreshCw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { PageHeader } from "./section-pager";
import type { SwipeHandlers } from "./section-pager";
import { useAudioMixer } from "@/hooks/use-audio-mixer";
import type { AudioSession } from "@/lib/api";

interface MixerPanelProps {
  active: boolean;
  swipe: SwipeHandlers;
  onNotice: (message: string, tone?: "ok" | "error") => void;
}

const sessionColors = [
  "#34d399",
  "#60a5fa",
  "#f472b6",
  "#fbbf24",
  "#a78bfa",
  "#22d3ee",
];

function colorFor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }
  return sessionColors[Math.abs(hash) % sessionColors.length];
}

function SessionAvatar({ session }: { session: AudioSession }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const iconUrl = session.iconUrl;
  const showIcon = Boolean(iconUrl) && failedUrl !== iconUrl;

  if (showIcon && iconUrl) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
        <img
          src={iconUrl}
          alt=""
          aria-hidden
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailedUrl(iconUrl)}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-black"
      style={{ backgroundColor: colorFor(session.name) }}
      aria-hidden
    >
      {session.name.charAt(0).toUpperCase()}
    </div>
  );
}

/** Channel fader: a horizontal range rotated so the volume grows upwards. */
function VerticalSlider({
  value,
  label,
  onChange,
  onStart,
  onEnd,
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
  onStart: () => void;
  onEnd: () => void;
}) {
  const rounded = Math.round(value);

  return (
    <div className="relative h-40 w-10">
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={rounded}
        onChange={(event) => onChange(Number(event.target.value))}
        onPointerDown={(event) => {
          event.stopPropagation();
          onStart();
        }}
        onPointerUp={onEnd}
        onPointerCancel={onEnd}
        onBlur={onEnd}
        aria-label={label}
        className="mixer-range absolute left-1/2 top-1/2 h-6 w-40 cursor-pointer"
        style={
          {
            transform: "translate(-50%, -50%) rotate(-90deg)",
            "--range-progress": `${rounded}%`,
            touchAction: "none",
          } as CSSProperties
        }
      />
    </div>
  );
}

function MuteButton({
  muted,
  label,
  onToggle,
}: {
  muted: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      onPointerDown={(event) => event.stopPropagation()}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
        muted
          ? "bg-red-500/15 text-red-300"
          : "bg-white/5 text-white/55 hover:bg-white/10 hover:text-white"
      }`}
      aria-label={label}
      aria-pressed={muted}
    >
      {muted ? (
        <VolumeX className="h-4 w-4" />
      ) : (
        <Volume2 className="h-4 w-4" />
      )}
    </button>
  );
}

function Channel({
  name,
  subtitle,
  volume,
  muted,
  avatar,
  sliderLabel,
  onVolume,
  onMute,
  onStart,
  onEnd,
  empty,
}: {
  name: string;
  subtitle?: string;
  volume: number;
  muted?: boolean;
  avatar: React.ReactNode;
  sliderLabel: string;
  onVolume: (value: number) => void;
  onMute?: () => void;
  onStart: () => void;
  onEnd: () => void;
  empty?: string;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center rounded-[22px] border border-white/10 bg-white/[0.04] p-3">
      <div className="flex w-full flex-col items-center gap-1.5 text-center">
        {avatar}
        <p className="w-full truncate text-[11px] font-semibold text-white">
          {name}
        </p>
        {subtitle && (
          <p className="w-full truncate text-[9px] text-white/50">{subtitle}</p>
        )}
      </div>

      {empty ? (
        <div className="flex flex-1 items-center justify-center px-2 text-center text-[10px] leading-relaxed text-white/35">
          {empty}
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center py-3">
          <VerticalSlider
            value={volume}
            label={sliderLabel}
            onChange={onVolume}
            onStart={onStart}
            onEnd={onEnd}
          />
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        <span className="text-sm font-bold tabular-nums text-white/80">
          {empty ? "--" : `${Math.round(volume)}%`}
        </span>
        {onMute && !empty && (
          <MuteButton
            muted={Boolean(muted)}
            label={muted ? `Activar sonido de ${name}` : `Silenciar ${name}`}
            onToggle={onMute}
          />
        )}
      </div>
    </div>
  );
}

function MessageState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 px-6 text-center">
      <VolumeX className="h-8 w-8 text-white/30" />
      <p className="text-sm font-semibold text-white/70">{title}</p>
      {description && (
        <p className="max-w-xs text-xs leading-relaxed text-white/35">
          {description}
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold text-white/80"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reintentar
        </button>
      )}
    </div>
  );
}

export function MixerPanel({ active, swipe, onNotice }: MixerPanelProps) {
  const mixer = useAudioMixer(active, onNotice);
  const { audio, status, error, overrides } = mixer;

  const volumeOf = (key: string, fallback: number) =>
    overrides[key]?.volume ?? fallback;
  const mutedOf = (key: string, fallback: boolean) =>
    overrides[key]?.muted ?? fallback;

  const renderSession = (session: AudioSession) => {
    const key = `session:${session.id}`;
    const volume = volumeOf(key, session.volume);
    const muted = mutedOf(key, session.muted);

    return (
      <Channel
        key={session.id}
        name={session.name}
        subtitle={session.process || undefined}
        volume={volume}
        muted={muted}
        avatar={<SessionAvatar session={session} />}
        sliderLabel={`Volumen de ${session.name}`}
        onVolume={(value) => mixer.setSession(session.id, value, muted)}
        onMute={() => mixer.setSession(session.id, volume, !muted)}
        onStart={mixer.beginInteraction}
        onEnd={mixer.endInteraction}
      />
    );
  };

  const masterMuted = audio ? mutedOf("master", audio.master.muted) : false;
  const masterVolume = audio ? volumeOf("master", audio.master.volume) : 0;
  const musicVolume = audio ? volumeOf("music", audio.music.volume) : 0;

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Mezclador"
        subtitle="Volumen del PC y aplicaciones"
        swipe={swipe}
      />

      <div
        className="settings-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-28"
        style={{ touchAction: "pan-y" }}
        {...swipe}
      >
        {status === "unavailable" ? (
          <MessageState
            title="Mezclador no disponible"
            description="El reproductor no expone el endpoint /audio."
            onRetry={mixer.refresh}
          />
        ) : status === "unsupported" ? (
          <MessageState
            title="Mezclador no soportado"
            description="Este equipo no permite controlar el volumen del sistema."
          />
        ) : status === "error" && !audio ? (
          <MessageState
            title="No se pudo cargar el mezclador"
            description={error ?? undefined}
            onRetry={mixer.refresh}
          />
        ) : status === "loading" && !audio ? (
          <div className="flex min-h-[260px] items-center justify-center gap-2 text-white/40">
            <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
            <span className="text-xs">Cargando mezclador...</span>
          </div>
        ) : audio ? (
          <div className="space-y-3">
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 items-stretch gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              <Channel
                name={audio.master.device || "Equipo"}
                subtitle="PC"
                volume={masterVolume}
                muted={masterMuted}
                avatar={
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <Monitor className="h-4 w-4" />
                  </div>
                }
                sliderLabel="Volumen general del PC"
                onVolume={(value) => mixer.setMaster(value, masterMuted)}
                onMute={() => mixer.setMaster(masterVolume, !masterMuted)}
                onStart={mixer.beginInteraction}
                onEnd={mixer.endInteraction}
                empty={
                  audio.master.device ? undefined : "No hay dispositivo de salida"
                }
              />

              <Channel
                name="Música"
                subtitle="Reproductor"
                volume={musicVolume}
                avatar={
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-400/15 text-sky-300">
                    <Music2 className="h-4 w-4" />
                  </div>
                }
                sliderLabel="Volumen interno de la música"
                onVolume={mixer.setMusic}
                onStart={mixer.beginInteraction}
                onEnd={mixer.endInteraction}
              />

              {audio.sessions.map(renderSession)}
            </div>

            {audio.sessions.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-center text-xs text-white/35">
                No hay aplicaciones reproduciendo audio
              </div>
            )}
          </div>
        ) : (
          <MessageState
            title="No se pudo cargar el mezclador"
            onRetry={mixer.refresh}
          />
        )}
      </div>
    </div>
  );
}
