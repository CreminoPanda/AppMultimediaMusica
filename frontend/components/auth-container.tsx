"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, CheckCircle2, XCircle, ArrowRight, Loader2, ArrowLeft, RefreshCw, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { loginUser, register, verify, forgotPassword, resetPassword } from "@/lib/api";

type AuthMode = "login" | "register" | "verify" | "forgot" | "reset";

interface AuthContainerProps {
  onAuthSuccess: (token: string, email: string) => void;
}

export function AuthContainer({ onAuthSuccess }: AuthContainerProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);

  // Password validation checks (real-time for register)
  const isLengthValid = password.length >= 8 && password.length <= 16;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasSpecial = /[\W_]/.test(password);
  const isPasswordValid = isLengthValid && hasUpper && hasLower && hasSpecial;
  const passwordsMatch = password === confirmPassword;

  // New password validation checks (real-time for reset)
  const isNewLengthValid = newPassword.length >= 8 && newPassword.length <= 16;
  const hasNewUpper = /[A-Z]/.test(newPassword);
  const hasNewLower = /[a-z]/.test(newPassword);
  const hasNewSpecial = /[\W_]/.test(newPassword);
  const isNewPasswordValid = isNewLengthValid && hasNewUpper && hasNewLower && hasNewSpecial;

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    setLoading(true);
    try {
      const data = await loginUser(email, password);
      if (data.error) {
        // Si el backend dice que no está verificado, redirigimos directamente a OTP
        if (data.error.toLowerCase().includes("no verificada")) {
          toast.warning("Cuenta no verificada. Te hemos enviado un código de activación.");
          setMode("verify");
        } else {
          toast.error(data.error);
        }
      } else if (data.token) {
        localStorage.setItem("music_player_token", data.token);
        localStorage.setItem("music_player_email", data.email || email);
        toast.success("¡Inicio de sesión exitoso!");
        onAuthSuccess(data.token, data.email || email);
      }
    } catch {
      toast.error("Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Register submission
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    if (!isPasswordValid) {
      toast.error("La contraseña no cumple con los requisitos de seguridad");
      return;
    }
    if (!passwordsMatch) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    setLoading(true);
    try {
      const data = await register(email, password);
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || "Usuario registrado con éxito.");
        setMode("verify");
      }
    } catch {
      toast.error("Error al registrar el usuario.");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP verification submission
  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) {
      toast.error("Por favor proporciona tu correo y el código OTP");
      return;
    }
    setLoading(true);
    try {
      const data = await verify(email, code);
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || "Cuenta verificada con éxito.");
        setMode("login");
        // Limpiamos los campos
        setPassword("");
        setConfirmPassword("");
        setCode("");
      }
    } catch {
      toast.error("Error al verificar la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Request Password Reset
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Por favor escribe tu correo electrónico");
      return;
    }
    setLoading(true);
    try {
      const data = await forgotPassword(email);
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || "Código de seguridad enviado.");
        setMode("reset");
      }
    } catch {
      toast.error("Error al solicitar el código de recuperación.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password Submission
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code || !newPassword) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    if (!isNewPasswordValid) {
      toast.error("La nueva contraseña no cumple con los requisitos de seguridad");
      return;
    }
    setLoading(true);
    try {
      const data = await resetPassword(email, code, newPassword);
      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(data.message || "Contraseña restablecida con éxito.");
        setMode("login");
        // Limpiamos campos
        setPassword("");
        setNewPassword("");
        setCode("");
      }
    } catch {
      toast.error("Error al restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  // Clean form values when switching modes
  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    // Preservamos el email para facilidad de usuario si está llenándolo
    if (newMode === "login" || newMode === "register" || newMode === "forgot") {
      setPassword("");
      setConfirmPassword("");
      setNewPassword("");
      setCode("");
    }
  };

  return (
    <div className="h-screen w-full relative bg-[#0a0a0f] overflow-hidden">
      {/* Decorative Glow Elements (Optimized without CSS filters to prevent banding on Android WebView) */}
      <div 
        className="absolute top-1/4 left-1/4 w-[500px] h-[500px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" 
        style={{
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0) 70%)"
        }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] translate-x-1/2 translate-y-1/2 pointer-events-none" 
        style={{
          background: "radial-gradient(circle, rgba(124, 58, 237, 0.08) 0%, rgba(124, 58, 237, 0) 70%)"
        }}
      />

      {/* Scrollable Content Container (Prevents background elements from causing unwanted scrollbars) */}
      <div className="absolute inset-0 flex flex-col justify-start items-center px-4 overflow-y-auto overflow-x-hidden">
        <motion.div 
          layout
          className="w-full max-w-md relative z-10 my-auto py-8"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        >
        {/* App Branding */}
        <div className="text-center mb-10 sm:mb-14 flex flex-col items-center justify-center short-viewport-branding">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-flex items-center justify-center w-18 h-18 sm:w-24 sm:h-24 rounded-[24px] sm:rounded-[32px] bg-gradient-to-tr from-emerald-500 to-emerald-400 text-black shadow-lg shadow-emerald-500/20 mb-5 sm:mb-8 short-viewport-logo"
          >
            <svg className="w-10 h-10 sm:w-14 sm:h-14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.781-.18-.601.18-1.2.78-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
          </motion.div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent short-viewport-title">
            Cremino Player
          </h2>
          <p className="text-neutral-500 text-xs sm:text-sm mt-1 sm:mt-1.5 short-viewport-hide">El reproductor inteligente multiusuario</p>
        </div>

        {/* Auth Card */}
        <div className="glass border border-white/5 rounded-3xl p-5 sm:p-6 md:p-8 shadow-2xl shadow-black/80 relative overflow-hidden short-viewport-card-padding">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          
          <AnimatePresence mode="wait" initial={false}>
            {mode === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center mb-6 short-viewport-compact">
                  <h3 className="text-xl font-bold text-white">Iniciar Sesión</h3>
                  <button 
                    onClick={() => switchMode("register")}
                    className="text-emerald-400 text-xs font-semibold hover:underline"
                  >
                    Crear cuenta nueva
                  </button>
                </div>

                <form onSubmit={handleLogin} className="space-y-3.5 sm:space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-medium">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs text-neutral-400 font-medium">Contraseña</label>
                      <button 
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-neutral-500 text-xs hover:text-neutral-300 transition"
                      >
                        ¿La olvidaste?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-semibold py-2.5 sm:py-3 rounded-xl transition flex items-center justify-center gap-2 mt-5 sm:mt-6 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              </motion.div>
            )}

            {mode === "register" && (
              <motion.div
                key="register"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex justify-between items-center mb-6 short-viewport-compact">
                  <h3 className="text-xl font-bold text-white">Registrarse</h3>
                  <button 
                    onClick={() => switchMode("login")}
                    className="text-emerald-400 text-xs font-semibold hover:underline"
                  >
                    Ya tengo cuenta
                  </button>
                </div>

                <form onSubmit={handleRegister} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-medium">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-medium">Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Crea una contraseña"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-medium">Confirmar Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repite la contraseña"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                        required
                      />
                    </div>
                  </div>

                  {/* Real-time Password Strength Check List */}
                  {password.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 mt-1.5 sm:mt-2 short-viewport-checker">
                      <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Requisitos de la contraseña:</p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <div className="flex items-center gap-1.5">
                          {isLengthValid ? (
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-600" />
                          )}
                          <span className={`text-[11px] sm:text-xs ${isLengthValid ? "text-emerald-400" : "text-neutral-500"}`}>8 a 16 caracteres</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {hasUpper ? (
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-600" />
                          )}
                          <span className={`text-[11px] sm:text-xs ${hasUpper ? "text-emerald-400" : "text-neutral-500"}`}>1 Mayúscula</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {hasLower ? (
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-600" />
                          )}
                          <span className={`text-[11px] sm:text-xs ${hasLower ? "text-emerald-400" : "text-neutral-500"}`}>1 Minúscula</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {hasSpecial ? (
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-600" />
                          )}
                          <span className={`text-[11px] sm:text-xs ${hasSpecial ? "text-emerald-400" : "text-neutral-500"}`}>1 Símbolo especial</span>
                        </div>
                      </div>
                      
                      {confirmPassword.length > 0 && (
                        <div className="pt-1.5 border-t border-white/5 flex items-center gap-1.5">
                          {passwordsMatch ? (
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500" />
                          )}
                          <span className={`text-[11px] sm:text-xs ${passwordsMatch ? "text-emerald-400" : "text-red-400/80"}`}>
                            {passwordsMatch ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !isPasswordValid || !passwordsMatch || !email}
                    className={`w-full font-semibold py-2.5 sm:py-3 rounded-xl transition flex items-center justify-center gap-2 mt-4 sm:mt-6 cursor-pointer ${
                      (isPasswordValid && passwordsMatch && email) 
                        ? "bg-emerald-500 hover:bg-emerald-400 text-black active:scale-[0.99]" 
                        : "bg-white/5 text-neutral-500 cursor-not-allowed"
                    }`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crear cuenta"}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                </form>
              </motion.div>
            )}

            {mode === "verify" && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <div className="text-center mb-6 short-viewport-compact">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 mb-3 short-viewport-hide">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Activar Cuenta</h3>
                  <p className="text-xs text-neutral-400 mt-2 px-4 short-viewport-hide">
                    Hemos enviado un código OTP de 6 dígitos al correo electrónico: <strong className="text-neutral-200">{email}</strong>
                  </p>
                </div>

                <form onSubmit={handleVerify} className="space-y-4 sm:space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-medium flex justify-between">
                      <span>Código OTP</span>
                      <button 
                        type="button" 
                        onClick={() => {
                          toast.info("Si no lo has recibido, prueba registrar tu cuenta de nuevo para disparar otro código.");
                        }}
                        className="text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <RefreshCw className="w-2.5 h-2.5" /> Reenviar
                      </button>
                    </label>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="Escribe el código de 6 dígitos"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 sm:py-3 text-center tracking-[0.5em] text-white text-lg font-bold placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || code.length !== 6}
                    className={`w-full font-semibold py-2.5 sm:py-3 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer ${
                      code.length === 6
                        ? "bg-emerald-500 hover:bg-emerald-400 text-black active:scale-[0.99]" 
                        : "bg-white/5 text-neutral-500 cursor-not-allowed"
                    }`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verificar Cuenta"}
                  </button>

                  <button 
                    type="button"
                    onClick={() => switchMode("register")}
                    className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300 py-1 transition flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Volver al registro
                  </button>
                </form>
              </motion.div>
            )}

            {mode === "forgot" && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6 short-viewport-compact">
                  <h3 className="text-xl font-bold text-white mb-2">Recuperar Contraseña</h3>
                  <p className="text-xs text-neutral-400 leading-relaxed short-viewport-hide">
                    Escribe tu correo electrónico de registro. Te enviaremos un código de seguridad para poder cambiar tu contraseña.
                  </p>
                </div>

                <form onSubmit={handleForgot} className="space-y-3.5 sm:space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-medium">Correo Electrónico</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-black font-semibold py-2.5 sm:py-3 rounded-xl transition flex items-center justify-center gap-2 mt-5 sm:mt-6 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar Código"}
                  </button>

                  <button 
                    type="button"
                    onClick={() => switchMode("login")}
                    className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300 py-1 transition flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Cancelar y volver
                  </button>
                </form>
              </motion.div>
            )}

            {mode === "reset" && (
              <motion.div
                key="reset"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-6 short-viewport-compact">
                  <h3 className="text-xl font-bold text-white mb-2">Nueva Contraseña</h3>
                  <p className="text-xs text-neutral-400 short-viewport-hide">
                    Ingresa el código que te enviamos y escribe tu nueva contraseña.
                  </p>
                </div>

                <form onSubmit={handleReset} className="space-y-3.5 sm:space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-medium">Código de seguridad (OTP)</label>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="Escribe el código recibido"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 sm:py-3 text-center tracking-[0.2em] text-white text-md placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition placeholder:tracking-normal placeholder:text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-neutral-400 font-medium">Nueva Contraseña</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-2.5 sm:py-3 pl-10 pr-4 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition"
                        required
                      />
                    </div>
                  </div>

                  {newPassword.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-2.5 sm:p-3 space-y-1.5 sm:space-y-2 mt-1.5 sm:mt-2 short-viewport-checker">
                      <p className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider">Requisitos de la nueva contraseña:</p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <div className="flex items-center gap-1.5">
                          {isNewLengthValid ? (
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-600" />
                          )}
                          <span className={`text-[11px] sm:text-xs ${isNewLengthValid ? "text-emerald-400" : "text-neutral-500"}`}>8 a 16 caracteres</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {hasNewUpper ? (
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-600" />
                          )}
                          <span className={`text-[11px] sm:text-xs ${hasNewUpper ? "text-emerald-400" : "text-neutral-500"}`}>1 Mayúscula</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {hasNewLower ? (
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-600" />
                          )}
                          <span className={`text-[11px] sm:text-xs ${hasNewLower ? "text-emerald-400" : "text-neutral-500"}`}>1 Minúscula</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {hasNewSpecial ? (
                            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-neutral-600" />
                          )}
                          <span className={`text-[11px] sm:text-xs ${hasNewSpecial ? "text-emerald-400" : "text-neutral-500"}`}>1 Símbolo especial</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !isNewPasswordValid || code.length === 0}
                    className={`w-full font-semibold py-2.5 sm:py-3 rounded-xl transition flex items-center justify-center gap-2 mt-5 sm:mt-6 cursor-pointer ${
                      (isNewPasswordValid && code.length > 0) 
                        ? "bg-emerald-500 hover:bg-emerald-400 text-black active:scale-[0.99]" 
                        : "bg-white/5 text-neutral-500 cursor-not-allowed"
                    }`}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Contraseña"}
                  </button>

                  <button 
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="w-full text-center text-xs text-neutral-500 hover:text-neutral-300 py-1 transition flex items-center justify-center gap-1.5"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Usar otro código
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
      </div>
    </div>
  );
}
