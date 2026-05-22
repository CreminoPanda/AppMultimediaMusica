"use client";
 
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LogOut, User, Check, AlertCircle, Unlink, Menu, X, Settings, 
  KeyRound, UserX, ChevronRight, ArrowLeft, Lock, CheckCircle2, XCircle, Loader2,
  Eye, EyeOff
} from "lucide-react";
import { getServerStatus, login, disconnectSpotify, changePassword, deleteAccount } from "@/lib/api";
import { toast } from "sonner";

interface AuthStatusProps {
  onLogout: () => void;
  isKaraoke?: boolean;
}

export function AuthStatus({ onLogout, isKaraoke = false }: AuthStatusProps) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const prevAuthedRef = useRef<boolean | null>(null);

  // Estados para gestión de cuenta
  const [viewMode, setViewMode] = useState<"menu" | "change-password" | "delete-account">("menu");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Validación de nueva contraseña
  const isLengthValid = newPassword.length >= 8 && newPassword.length <= 16;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasSpecial = /[\W_]/.test(newPassword);
  const isPasswordValid = isLengthValid && hasUpper && hasLower && hasSpecial;

  // Restaurar el menú al cerrar la barra lateral
  useEffect(() => {
    if (!isOpen) {
      setViewMode("menu");
      setCurrentPassword("");
      setNewPassword("");
      setDeletePassword("");
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowDeletePassword(false);
    }
  }, [isOpen]);
 
  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserEmail(localStorage.getItem("music_player_email") || "Usuario");
    }
 
    const check = async () => {
      try {
        const status = await getServerStatus();
        const wasAuthed = prevAuthedRef.current;
        prevAuthedRef.current = status.authed;
        setAuthed(status.authed);
 
        if (status.authed && wasAuthed === false) {
          toast.success("¡Spotify conectado correctamente!");
        }
      } catch {
        setAuthed(false);
      }
    };
    check();
    const interval = setInterval(check, 6000); // Check status every 6s
    return () => clearInterval(interval);
  }, []);
 
  const handleSpotifyConnect = () => {
    toast.loading("Redirigiendo a Spotify...");
    login();
  };
 
  const handleSpotifyDisconnect = async () => {
    try {
      toast.loading("Desvinculando Spotify...");
      const res = await disconnectSpotify();
      toast.dismiss();
      if (res.success) {
        setAuthed(false);
        prevAuthedRef.current = false;
        toast.success("¡Spotify desvinculado con éxito!");
      } else {
        toast.error("No se pudo desvincular Spotify.");
      }
    } catch (err) {
      toast.dismiss();
      toast.error("Error al conectar para desvincular.");
    }
  };
 
  if (authed === null) return null;
 
  return (
    <div className={`absolute top-4 z-30 transition-all duration-300 ${isKaraoke ? "left-4" : "right-4"}`}>
      {/* Mini Profile/Menu Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="w-10 h-10 rounded-full backdrop-blur-xl bg-black/35 hover:bg-black/50 border border-white/10 shadow-lg shadow-black/20 flex items-center justify-center text-white transition-all cursor-pointer"
        whileHover={{ scale: 1.05, border: "1px solid rgba(255, 255, 255, 0.2)" }}
        whileTap={{ scale: 0.95 }}
        title="Abrir menú"
      >
        <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs text-emerald-400 font-bold uppercase">
          {userEmail[0] || <User className="w-3.5 h-3.5" />}
        </div>
      </motion.button>
 
      {/* Sidebar Panel Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            />
 
            {/* Sidebar drawer content */}
            <motion.div
              initial={{ x: isKaraoke ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: isKaraoke ? "-100%" : "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className={`fixed top-0 bottom-0 z-50 w-80 max-w-[90vw] h-full max-h-screen overflow-hidden bg-black shadow-2xl p-6 flex flex-col justify-between ${
                isKaraoke ? "left-0 border-r border-white/10" : "right-0 border-l border-white/10"
              }`}
            >
              <AnimatePresence mode="wait" initial={false}>
                {viewMode === "menu" && (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.15 }}
                    className="flex-grow flex flex-col h-full min-h-0 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-shrink-0">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4 text-emerald-400" />
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ajustes</h3>
                      </div>
                      <button
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-grow overflow-y-auto py-5 space-y-6 pr-1 settings-scroll">
                      {/* Profile Widget */}
                      <div className="flex flex-col items-center py-5 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-lg text-emerald-400 font-bold uppercase shadow-inner shadow-emerald-500/20 mb-3">
                          {userEmail[0] || <User className="w-6 h-6" />}
                        </div>
                        <span className="text-white font-semibold text-sm max-w-full truncate">{userEmail}</span>
                        <span className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest mt-1">Usuario</span>
                      </div>

                      {/* Services Section */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Servicios</h4>
                        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <svg className="w-5 h-5 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                              </svg>
                              <span className="text-white text-sm font-semibold">Spotify</span>
                            </div>
                            {authed ? (
                              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Activo</span>
                            ) : (
                              <span className="text-[9px] text-neutral-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Inactivo</span>
                            )}
                          </div>

                          {authed ? (
                            <button
                              onClick={handleSpotifyDisconnect}
                              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-[0.97] border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              <Unlink className="w-3.5 h-3.5" />
                              <span>Desvincular Spotify</span>
                            </button>
                          ) : (
                            <button
                              onClick={handleSpotifyConnect}
                              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] active:scale-[0.97] text-black text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-sm shadow-[#1DB954]/20"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Conectar Spotify</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Account Management Section */}
                      <div className="space-y-3">
                        <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">Mi Cuenta</h4>
                        <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                          <button
                            onClick={() => setViewMode("change-password")}
                            className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 active:scale-[0.98] border border-white/5 text-white text-xs font-medium transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                              <span>Cambiar Contraseña</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                          </button>

                          <button
                            onClick={() => setViewMode("delete-account")}
                            className="w-full flex items-center justify-between py-2 px-3 rounded-xl bg-red-500/5 hover:bg-red-500/10 active:scale-[0.98] border border-red-500/10 text-red-400 text-xs font-medium transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <UserX className="w-3.5 h-3.5 text-red-500" />
                              <span>Eliminar Cuenta</span>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-red-400/50" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-white/10 pt-4 mt-auto flex-shrink-0">
                      <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-red-500/15 text-white/60 hover:text-red-400 active:scale-[0.97] border border-white/10 hover:border-red-500/20 transition-all cursor-pointer font-bold text-[10px] uppercase tracking-wider"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {viewMode === "change-password" && (
                  <motion.div
                    key="change-password"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.15 }}
                    className="flex-grow flex flex-col h-full min-h-0 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-shrink-0">
                      <button
                        onClick={() => setViewMode("menu")}
                        className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Atrás</span>
                      </button>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">Seguridad</h3>
                      <div className="w-8 h-8" />
                    </div>

                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!currentPassword || !newPassword) {
                          toast.error("Por favor completa todos los campos");
                          return;
                        }
                        if (!isPasswordValid) {
                          toast.error("La nueva contraseña no cumple con los requisitos");
                          return;
                        }
                        setLoading(true);
                        try {
                          const res = await changePassword(currentPassword, newPassword);
                          if (res.error) {
                            toast.error(res.error);
                          } else {
                            toast.success(res.message || "¡Contraseña cambiada con éxito!");
                            setViewMode("menu");
                            setCurrentPassword("");
                            setNewPassword("");
                          }
                        } catch {
                          toast.error("Error al conectar con el servidor.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="flex-grow flex flex-col min-h-0 overflow-hidden justify-between mt-5"
                    >
                      <div className="flex-grow overflow-y-auto space-y-4 pr-1 settings-scroll">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Contraseña Actual</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                            <input
                              type={showCurrentPassword ? "text" : "password"}
                              value={currentPassword}
                              onChange={(e) => setCurrentPassword(e.target.value)}
                              placeholder="Escribe tu contraseña actual"
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-9 pr-10 text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 transition"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                            >
                              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Nueva Contraseña</label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                            <input
                              type={showNewPassword ? "text" : "password"}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              placeholder="Mínimo 8 caracteres"
                              className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-9 pr-10 text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 transition"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                            >
                              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Requisitos de la nueva contraseña */}
                        {newPassword.length > 0 && (
                          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 space-y-1.5">
                            <p className="text-[9px] text-neutral-400 font-semibold uppercase tracking-wider">Requisitos:</p>
                            <div className="grid grid-cols-1 gap-1">
                              <div className="flex items-center gap-1.5">
                                {isLengthValid ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-neutral-600" />
                                )}
                                <span className={`text-[10px] ${isLengthValid ? "text-emerald-400" : "text-neutral-500"}`}>8 a 16 caracteres</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {hasUpper ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-neutral-600" />
                                )}
                                <span className={`text-[10px] ${hasUpper ? "text-emerald-400" : "text-neutral-500"}`}>1 Mayúscula</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {hasLower ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-neutral-600" />
                                )}
                                <span className={`text-[10px] ${hasLower ? "text-emerald-400" : "text-neutral-500"}`}>1 Minúscula</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {hasSpecial ? (
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <XCircle className="w-3 h-3 text-neutral-600" />
                                )}
                                <span className={`text-[10px] ${hasSpecial ? "text-emerald-400" : "text-neutral-500"}`}>1 Símbolo especial</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 flex-shrink-0 border-t border-white/10 mt-auto">
                        <button
                          type="submit"
                          disabled={loading || !currentPassword || !isPasswordValid}
                          className={`w-full font-semibold py-2.5 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                            (currentPassword && isPasswordValid) 
                              ? "bg-emerald-500 hover:bg-emerald-400 text-black active:scale-[0.99]" 
                              : "bg-white/5 text-neutral-500 cursor-not-allowed"
                          }`}
                        >
                          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Guardar contraseña"}
                        </button>
                      </div>
                    </form>
                  </motion.div>
                )}

                {viewMode === "delete-account" && (
                  <motion.div
                    key="delete-account"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.15 }}
                    className="flex-grow flex flex-col h-full min-h-0 overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/10 pb-4 flex-shrink-0">
                      <button
                        onClick={() => {
                          setViewMode("menu");
                          setDeletePassword("");
                        }}
                        className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs font-semibold transition-all cursor-pointer"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Atrás</span>
                      </button>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider text-red-400">Eliminar Cuenta</h3>
                      <div className="w-8 h-8" />
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-4 pr-1 settings-scroll mt-6 min-h-0">
                      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col items-center text-center">
                        <UserX className="w-10 h-10 text-red-500 mb-3 flex-shrink-0" />
                        <h4 className="text-white font-bold text-sm mb-1.5">¿Estás seguro?</h4>
                        <p className="text-neutral-400 text-xs leading-relaxed">
                          Esta acción es completamente irreversible. Se eliminará tu usuario permanentemente y se cancelará tu vinculación con Spotify.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Escribe tu contraseña</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                          <input
                            type={showDeletePassword ? "text" : "password"}
                            value={deletePassword}
                            onChange={(e) => setDeletePassword(e.target.value)}
                            placeholder="Contraseña actual"
                            className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2 pl-9 pr-10 text-white text-xs placeholder-neutral-600 focus:outline-none focus:border-red-500/50 transition"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowDeletePassword(!showDeletePassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors cursor-pointer"
                          >
                            {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-white/10 mt-auto flex-shrink-0">
                      <button
                        onClick={async () => {
                          if (!deletePassword) return;
                          setLoading(true);
                          try {
                            const res = await deleteAccount(deletePassword);
                            if (res.error) {
                              toast.error(res.error);
                            } else {
                              toast.success("¡Tu cuenta ha sido eliminada con éxito!");
                              setIsOpen(false);
                              onLogout();
                            }
                          } catch {
                            toast.error("Error al conectar con el servidor.");
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading || !deletePassword}
                        className={`w-full font-bold py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                          deletePassword 
                            ? "bg-red-500 hover:bg-red-600 text-white active:scale-[0.99]" 
                            : "bg-white/5 text-neutral-500 cursor-not-allowed"
                        }`}
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Eliminar Cuenta Permanentemente"}
                      </button>

                      <button
                        onClick={() => {
                          setViewMode("menu");
                          setDeletePassword("");
                        }}
                        className="w-full bg-white/5 hover:bg-white/10 text-neutral-300 font-semibold py-2.5 rounded-xl transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
