const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const querystring = require('querystring');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { dbRun, dbGet, dbAll } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'mi_clave_secreta_super_segura';

const app = express();

const allowedOrigins = [
  'http://localhost',            // Origen de Capacitor (Android APK)
  'capacitor://localhost',      // Origen de Capacitor (iOS)
  'http://localhost:3000',      // Entorno de desarrollo Next.js
  'http://192.168.100.8:3000',  // IP Local de desarrollo Next.js
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'El origen de CORS no está permitido por seguridad.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
}));

app.use(express.json());

// Middleware de autenticación JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido o expirado' });
    req.user = user;
    next();
  });
}

// Funciones validadoras
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email.trim());
}

function isValidPassword(password) {
  if (typeof password !== 'string') return false;
  if (password.length < 8 || password.length > 16) return false;
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecialChar = /[\W_]/.test(password); // \W incluye símbolos y puntuación, _ incluye guión bajo
  
  return hasUppercase && hasLowercase && hasSpecialChar;
}

// Generador de códigos OTP de 6 dígitos
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Ruta de Registro de Usuario
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  if (!isValidPassword(password)) {
    return res.status(400).json({ 
      error: 'La contraseña debe tener entre 8 y 16 caracteres, e incluir al menos una mayúscula, una minúscula y un carácter especial.' 
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otp = generateOTP();
    const otpExpires = Date.now() + 15 * 60 * 1000; // Expira en 15 minutos

    console.log(`[AUTH] OTP generado para registro de ${normalizedEmail}: ${otp}`);

    // Insertar usuario inactivo (is_verified = 0)
    await dbRun(
      'INSERT INTO users (email, password_hash, is_verified, verification_code, verification_code_expires) VALUES (?, ?, ?, ?, ?)',
      [normalizedEmail, passwordHash, 0, otp, otpExpires]
    );

    // Enviar correo de activación
    const { sendVerificationEmail } = require('./mailer');
    await sendVerificationEmail(normalizedEmail, otp);

    res.status(201).json({ message: 'Usuario registrado con éxito. Por favor verifica tu correo para activar tu cuenta.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al registrar el usuario', details: err.message });
  }
});

// Ruta para Verificar Cuenta
app.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ error: 'Email y código requeridos' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.is_verified === 1) {
      return res.status(400).json({ error: 'La cuenta ya está verificada' });
    }

    if (user.verification_code !== code) {
      return res.status(400).json({ error: 'Código de verificación incorrecto' });
    }

    if (Date.now() > user.verification_code_expires) {
      return res.status(400).json({ error: 'El código de verificación ha expirado' });
    }

    // Activar usuario
    await dbRun(
      'UPDATE users SET is_verified = 1, verification_code = NULL, verification_code_expires = NULL WHERE id = ?',
      [user.id]
    );

    res.json({ message: 'Cuenta verificada con éxito. Ya puedes iniciar sesión.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al verificar la cuenta', details: err.message });
  }
});

// Ruta de Login de Usuario
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Bloquear acceso a cuentas no activadas
    if (user.is_verified === 0) {
      return res.status(403).json({ error: 'Cuenta no verificada. Por favor activa tu cuenta primero.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, email: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Error en el inicio de sesión', details: err.message });
  }
});

// Ruta para Solicitar Recuperación de Contraseña
app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return res.status(404).json({ error: 'No existe una cuenta registrada con este correo' });
    }

    const code = generateOTP();
    const codeExpires = Date.now() + 15 * 60 * 1000; // Código válido por 15 minutos

    console.log(`[AUTH] OTP generado para recuperación de contraseña de ${normalizedEmail}: ${code}`);

    await dbRun(
      'UPDATE users SET reset_code = ?, reset_code_expires = ? WHERE id = ?',
      [code, codeExpires, user.id]
    );

    // Enviar correo de restablecimiento
    const { sendPasswordResetEmail } = require('./mailer');
    await sendPasswordResetEmail(normalizedEmail, code);

    res.json({ message: 'Código de seguridad enviado a tu correo.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al solicitar el cambio de contraseña', details: err.message });
  }
});

// Ruta para Restablecer Contraseña usando Código
app.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, código y nueva contraseña requeridos' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Formato de email inválido' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ 
      error: 'La contraseña debe tener entre 8 y 16 caracteres, e incluir al menos una mayúscula, una minúscula y un carácter especial.' 
    });
  }

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await dbGet('SELECT * FROM users WHERE email = ?', [normalizedEmail]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (user.reset_code !== code) {
      return res.status(400).json({ error: 'Código de seguridad incorrecto' });
    }

    if (Date.now() > user.reset_code_expires) {
      return res.status(400).json({ error: 'El código de seguridad ha expirado' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y limpiar código
    await dbRun(
      'UPDATE users SET password_hash = ?, reset_code = NULL, reset_code_expires = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    res.json({ message: 'Contraseña restablecida con éxito. Ya puedes iniciar sesión con tus nuevas credenciales.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al restablecer la contraseña', details: err.message });
  }
});

// Cambiar contraseña estando autenticado
app.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Por favor proporciona la contraseña actual y la nueva' });
  }

  if (!isValidPassword(newPassword)) {
    return res.status(400).json({ 
      error: 'La nueva contraseña debe tener entre 8 y 16 caracteres, e incluir al menos una mayúscula, una minúscula y un carácter especial.' 
    });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await dbRun('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

    res.json({ message: 'Contraseña cambiada con éxito.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar la contraseña', details: err.message });
  }
});

// Eliminar cuenta completamente de forma segura (requiere contraseña)
app.delete('/delete-account', authenticateToken, async (req, res) => {
  const { password } = req.body;
  const userId = req.user.userId;

  if (!password) {
    return res.status(400).json({ error: 'Por favor proporciona tu contraseña para confirmar la eliminación de la cuenta' });
  }

  try {
    const user = await dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(400).json({ error: 'La contraseña es incorrecta' });
    }

    // Borrado explícito en ambas tablas por seguridad
    await dbRun('DELETE FROM spotify_tokens WHERE user_id = ?', [userId]);
    await dbRun('DELETE FROM users WHERE id = ?', [userId]);

    res.json({ message: 'Cuenta eliminada con éxito.' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar la cuenta', details: err.message });
  }
});

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3001/callback';
const PORT = process.env.PORT || 3001;

// Función helper para obtener el token de Spotify del usuario, refrescándolo si ha expirado
async function getUserToken(userId) {
  const tokenRow = await dbGet('SELECT * FROM spotify_tokens WHERE user_id = ?', [userId]);
  if (!tokenRow) {
    const error = new Error('No autenticado con Spotify. Por favor vincula tu cuenta.');
    error.statusCode = 401;
    throw error;
  }

  // Si expira en menos de 60 segundos, lo refrescamos proactivamente
  if (Date.now() < tokenRow.expires_at - 60000) {
    return tokenRow.access_token;
  }

  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
      },
      body: querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: tokenRow.refresh_token
      }),
    });

    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      console.error('Error al refrescar token de Spotify:', errData);
      
      // Si el refresh token es inválido o fue revocado, eliminamos el registro
      if (r.status === 400 && errData.error === 'invalid_grant') {
        await dbRun('DELETE FROM spotify_tokens WHERE user_id = ?', [userId]);
      }
      
      const error = new Error('La vinculación de Spotify ya no es válida. Por favor, vuelve a vincular tu cuenta.');
      error.statusCode = 401;
      throw error;
    }

    const data = await r.json();
    const newAccessToken = data.access_token;
    const newExpiresAt = Date.now() + (data.expires_in * 1000);
    // Spotify podría no devolver un nuevo refresh token, así que conservamos el existente si no viene uno nuevo
    const newRefreshToken = data.refresh_token || tokenRow.refresh_token;

    await dbRun(
      'UPDATE spotify_tokens SET access_token = ?, refresh_token = ?, expires_at = ? WHERE user_id = ?',
      [newAccessToken, newRefreshToken, newExpiresAt, userId]
    );

    return newAccessToken;
  } catch (e) {
    if (e.statusCode) throw e;
    const error = new Error('Error al conectar con Spotify para renovar la sesión.');
    error.statusCode = 500;
    throw error;
  }
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', info: 'API del Reproductor Multimedia Multiusuario' });
});

// GET /login: Inicia el flujo de autenticación de Spotify recibiendo el JWT del usuario
app.get('/login', (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).send('<h1>Error de Autenticación</h1><p>Token de usuario requerido.</p>');
  }

  try {
    // Verificar el JWT del usuario de la app
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;

    if (!userId) {
      return res.status(400).send('<h1>Error de Autenticación</h1><p>Token inválido.</p>');
    }

    // Generar un state firmado que contiene el userId, válido por 15 minutos
    const state = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '15m' });

    const scope = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';
    res.redirect('https://accounts.spotify.com/authorize?' + querystring.stringify({
      response_type: 'code',
      client_id: CLIENT_ID,
      scope,
      redirect_uri: REDIRECT_URI,
      state: state
    }));
  } catch (err) {
    return res.status(403).send('<h1>Error de Autenticación</h1><p>Token de usuario inválido o expirado.</p>');
  }
});

// GET /callback: Callback de Spotify que recibe el código y el state JWT
app.get('/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.status(400).send(`<h1>Error de Spotify</h1><p>${error}</p>`);
  }

  if (!code || !state) {
    return res.status(400).send('<h1>Error de Autorización</h1><p>Parámetros code o state faltantes.</p>');
  }

  try {
    // Validar y decodificar el state JWT para recuperar el userId
    const decodedState = jwt.verify(state, JWT_SECRET);
    const userId = decodedState.userId;

    if (!userId) {
      return res.status(400).send('<h1>Error de Autorización</h1><p>State inválido.</p>');
    }

    // Solicitar los tokens de acceso y actualización a Spotify
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
      },
      body: querystring.stringify({
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }),
    });

    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      return res.status(500).send(`<h1>Error de Spotify</h1><p>No se pudo obtener el token. ${errData.error_description || ''}</p>`);
    }

    const data = await r.json();
    const access_token = data.access_token;
    const refresh_token = data.refresh_token;
    const expires_at = Date.now() + (data.expires_in * 1000);

    // Guardar o actualizar los tokens en la base de datos
    await dbRun(
      'INSERT OR REPLACE INTO spotify_tokens (user_id, access_token, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
      [userId, access_token, refresh_token, expires_at]
    );

    // Renderizar página HTML moderna y atractiva de éxito
    const successHtml = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Conexión Exitosa con Spotify</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;800&display=swap" rel="stylesheet">
        <style>
          :root {
            --spotify-green: #1DB954;
            --spotify-black: #191414;
            --bg-gradient: linear-gradient(135deg, #0f0c1b 0%, #1e1b4b 50%, #0f0c1b 100%);
            --card-bg: rgba(255, 255, 255, 0.03);
            --card-border: rgba(255, 255, 255, 0.08);
            --text-primary: #ffffff;
            --text-secondary: #94a3b8;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: 'Outfit', sans-serif;
            background: var(--bg-gradient);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow: hidden;
          }

          .container {
            max-width: 480px;
            width: 100%;
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border-radius: 24px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1);
            animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1);
            position: relative;
          }

          .container::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: linear-gradient(135deg, var(--spotify-green), transparent, var(--spotify-green));
            border-radius: 26px;
            z-index: -1;
            opacity: 0.15;
          }

          .icon-wrapper {
            width: 80px;
            height: 80px;
            background: rgba(29, 185, 84, 0.1);
            border: 2px solid var(--spotify-green);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            animation: pulse 2s infinite alternate;
          }

          .icon {
            color: var(--spotify-green);
            font-size: 40px;
            line-height: 1;
          }

          h1 {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 12px;
            letter-spacing: -0.5px;
            background: linear-gradient(135deg, #ffffff 50%, #a5b4fc 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          p {
            font-size: 16px;
            color: var(--text-secondary);
            line-height: 1.6;
            margin-bottom: 30px;
            font-weight: 300;
          }

          .btn {
            display: inline-block;
            width: 100%;
            padding: 16px 32px;
            background: var(--spotify-green);
            color: var(--spotify-black);
            border: none;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            text-decoration: none;
            box-shadow: 0 10px 20px rgba(29, 185, 84, 0.2);
          }

          .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 15px 30px rgba(29, 185, 84, 0.35);
            background: #22c55e;
          }

          .btn:active {
            transform: translateY(0);
          }

          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(29, 185, 84, 0.4);
            }
            100% {
              box-shadow: 0 0 0 12px rgba(29, 185, 84, 0);
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon-wrapper">
            <span class="icon">✓</span>
          </div>
          <h1>¡Conexión Exitosa!</h1>
          <p>Tu cuenta ha sido vinculada con Spotify correctamente. Todo está listo para que disfrutes de tu música y letras sincronizadas.</p>
          <button class="btn" onclick="window.close()">Cerrar Ventana</button>
        </div>
      </body>
      </html>
    `;
    res.send(successHtml);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).send('<h1>Error de Autorización</h1><p>La sesión de vinculación ha expirado. Por favor, intenta de nuevo desde la aplicación.</p>');
    }
    return res.status(403).send('<h1>Error de Autorización</h1><p>Firma de estado no válida o manipulada.</p>');
  }
});

// GET /spotify/status: Comprueba si el usuario autenticado tiene Spotify vinculado
app.get('/spotify/status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const tokenRow = await dbGet('SELECT 1 FROM spotify_tokens WHERE user_id = ?', [userId]);
    res.json({ authed: !!tokenRow });
  } catch (err) {
    res.status(500).json({ error: 'Error al consultar el estado de Spotify', details: err.message });
  }
});

// POST /spotify/disconnect: Desvincula la cuenta de Spotify eliminando los tokens del usuario
app.post('/spotify/disconnect', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    await dbRun('DELETE FROM spotify_tokens WHERE user_id = ?', [userId]);
    res.json({ success: true, message: 'Spotify desvinculado con éxito' });
  } catch (err) {
    res.status(500).json({ error: 'Error al desvincular Spotify', details: err.message });
  }
});

// GET /now-playing: Obtiene la canción actual reproduciéndose en Spotify
app.get('/now-playing', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getUserToken(req.user.userId);
    const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (r.status === 204) return res.json({ isPlaying: false });
    const data = await r.json();
    if (!data?.item) return res.json({ isPlaying: false });
    res.json({
      id: data.item.id,
      title: data.item.name,
      artists: data.item.artists.map(a => a.name),
      album: data.item.album.name,
      albumImage: data.item.album.images[0]?.url,
      duration: data.item.duration_ms,
      progress: data.progress_ms,
      isPlaying: data.is_playing,
      uri: data.item.uri,
    });
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({ error: e.message });
  }
});

// PUT /play-pause: Alterna entre reproducir y pausar
app.put('/play-pause', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getUserToken(req.user.userId);
    const authHeaders = { Authorization: `Bearer ${accessToken}` };
    const r = await fetch('https://api.spotify.com/v1/me/player', { headers: authHeaders });
    if (r.status === 204) {
      await fetch('https://api.spotify.com/v1/me/player/play', { method: 'PUT', headers: authHeaders });
    } else {
      const data = await r.json();
      if (!data?.is_playing) {
        await fetch('https://api.spotify.com/v1/me/player/play', { method: 'PUT', headers: authHeaders });
      } else {
        await fetch('https://api.spotify.com/v1/me/player/pause', { method: 'PUT', headers: authHeaders });
      }
    }
    res.json({ success: true });
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({ error: e.message });
  }
});

// POST /next: Salta a la siguiente canción
app.post('/next', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getUserToken(req.user.userId);
    const authHeaders = { Authorization: `Bearer ${accessToken}` };
    await fetch('https://api.spotify.com/v1/me/player/next', { method: 'POST', headers: authHeaders });
    res.json({ success: true });
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({ error: e.message });
  }
});

// POST /previous: Vuelve a la canción anterior
app.post('/previous', authenticateToken, async (req, res) => {
  try {
    const accessToken = await getUserToken(req.user.userId);
    const authHeaders = { Authorization: `Bearer ${accessToken}` };
    await fetch('https://api.spotify.com/v1/me/player/previous', { method: 'POST', headers: authHeaders });
    res.json({ success: true });
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({ error: e.message });
  }
});

// GET /lyrics: Obtiene las letras de una canción
app.get('/lyrics', authenticateToken, async (req, res) => {
  const { title, artist } = req.query;
  if (!title) return res.status(400).json({ error: '?title= requerido' });
  try {
    const params = { track_name: title };
    if (artist) params.artist_name = artist;
    const r = await fetch('https://lrclib.net/api/get?' + querystring.stringify(params));
    const lyrics = await r.json();
    res.json({
      plainLyrics: lyrics.plainLyrics || null,
      syncedLyrics: lyrics.syncedLyrics || null,
    });
  } catch {
    res.json({ plainLyrics: null, syncedLyrics: null });
  }
});

// PUT /seek: Busca una posición en milisegundos en la reproducción
app.put('/seek', authenticateToken, async (req, res) => {
  const pos = parseInt(req.query.position);
  if (isNaN(pos)) return res.status(400).json({ error: '?position=ms requerido' });
  try {
    const accessToken = await getUserToken(req.user.userId);
    const authHeaders = { Authorization: `Bearer ${accessToken}` };
    await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${pos}`, { method: 'PUT', headers: authHeaders });
    res.json({ success: true });
  } catch (e) {
    const status = e.statusCode || 500;
    res.status(status).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor: http://localhost:${PORT}`);
  console.log(`Spotify Redirect URI cargado: ${REDIRECT_URI}`);
  if (!CLIENT_ID || CLIENT_ID === 'tu_client_id_aqui') console.log('Configura .env con SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET');
  else console.log('Autentica en http://localhost:' + PORT + '/login');
});
