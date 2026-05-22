require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const querystring = require('querystring');

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:3001/callback';
const PORT = process.env.PORT || 3001;

let accessToken = null;
let refreshToken = null;
let tokenExpiresAt = 0;

function genState() {
  return crypto.randomBytes(8).toString('hex');
}

app.get('/', (req, res) => {
  res.json({ status: 'ok', authed: !!accessToken });
});

app.get('/login', (req, res) => {
  const scope = 'user-read-currently-playing user-read-playback-state user-modify-playback-state';
  res.redirect('https://accounts.spotify.com/authorize?' + querystring.stringify({
    response_type: 'code', client_id: CLIENT_ID, scope,
    redirect_uri: REDIRECT_URI, state: genState(),
  }));
});

app.get('/callback', async (req, res) => {
  if (!req.query.code) return res.status(400).json({ error: 'No code' });
  try {
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64') },
      body: querystring.stringify({ code: req.query.code, redirect_uri: REDIRECT_URI, grant_type: 'authorization_code' }),
    });
    const data = await r.json();
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;
    res.json({ message: 'Autenticado' });
  } catch (e) {
    res.status(500).json({ error: 'Error al autenticar', details: e.message });
  }
});

async function getToken() {
  if (!accessToken) throw new Error('No autenticado. Ve a /login');
  if (Date.now() < tokenExpiresAt) return accessToken;
  const r = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64') },
    body: querystring.stringify({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  const data = await r.json();
  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return accessToken;
}

const headers = () => ({ Authorization: `Bearer ${accessToken}` });

app.get('/now-playing', async (req, res) => {
  try {
    await getToken();
    const r = await fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: headers() });
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
    res.status(500).json({ error: 'Error', details: e.message });
  }
});

app.put('/play-pause', async (req, res) => {
  try {
    await getToken();
    const r = await fetch('https://api.spotify.com/v1/me/player', { headers: headers() });
    if (r.status === 204) { await fetch('https://api.spotify.com/v1/me/player/play', { method: 'PUT', headers: headers() }); }
    else {
      const data = await r.json();
      if (!data?.is_playing) await fetch('https://api.spotify.com/v1/me/player/play', { method: 'PUT', headers: headers() });
      else await fetch('https://api.spotify.com/v1/me/player/pause', { method: 'PUT', headers: headers() });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/next', async (req, res) => {
  try {
    await getToken();
    await fetch('https://api.spotify.com/v1/me/player/next', { method: 'POST', headers: headers() });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/previous', async (req, res) => {
  try {
    await getToken();
    await fetch('https://api.spotify.com/v1/me/player/previous', { method: 'POST', headers: headers() });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/lyrics', async (req, res) => {
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

app.put('/seek', async (req, res) => {
  const pos = parseInt(req.query.position);
  if (isNaN(pos)) return res.status(400).json({ error: '?position=ms requerido' });
  try {
    await getToken();
    await fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${pos}`, { method: 'PUT', headers: headers() });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor: http://localhost:${PORT}`);
  if (!CLIENT_ID || CLIENT_ID === 'tu_client_id_aqui') console.log('Configura .env con SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET');
  else console.log('Autentica en http://localhost:' + PORT + '/login');
});
