# MediaControl — Monitor y Control Multimedia Remoto

Aplicación **Android + Python** que convierte tu celular en un control remoto premium para la música que reproducís en tu PC.

Soporta **Apple Music (Windows)**, **Brave PWA (Linux)**, Spotify, y cualquier app que exponga su estado de reproducción.

## Captura

- **Pantalla dividida**: portada del álbum a la izquierda, controles a la derecha
- **Fondo dinámico**: colores extraídos de la portada con animación tipo mesh gradient
- **Letras sincronizadas**: karaoke con resaltado de línea activa y auto-scroll
- **Transiciones animadas**: cambio suave entre modo reproductor y modo letras

---

## Arquitectura

```
┌─────────────────────┐     WebSocket      ┌──────────────────────┐
│   PC (Servidor)     │ ◄──────────────►   │   Android (Cliente)  │
│                     │     JSON/TCP       │                      │
│  ┌───────────────┐  │                    │  ┌────────────────┐  │
│  │  playerctl    │  │                    │  │  PlayerScreen  │  │
│  │  (Linux)      │  │                    │  │  LyricsScreen  │  │
│  └───────┬───────┘  │                    │  │  MeshGradient  │  │
│          ▼          │                    │  └────────────────┘  │
│  ┌───────────────┐  │                    └──────────────────────┘
│  │ iTunes API    │  │
│  │ LRCLIB API    │  │
│  └───────────────┘  │
│                     │
│  ┌───────────────┐  │
│  │ winrt (SMTC)  │  │  ← Solo Windows
│  └───────────────┘  │
└─────────────────────┘
```

### Backend (Python)

El servidor WebSocket monitorea la reproducción en tiempo real y envía eventos a los clientes Android conectados.

| Componente | Linux | Windows |
|---|---|---|
| **Detección de reproducción** | `playerctl` (D-Bus) | `winrt` (System Media Transport Controls) |
| **Comandos** (play/pause/next/prev) | `playerctl --player` | `winrt session.try_play_async()` |
| **Metadata** | `playerctl metadata --format` | `winrt session.try_get_media_properties()` |
| **Portada HD** | iTunes Search API | iTunes Search API |
| **Letras** | LRCLIB API | LRCLIB API |
| **Duración precisa** | iTunes Search API | iTunes Search API |

### Frontend (Android)

App nativa en Kotlin + Jetpack Compose con:
- **Material3** + temas oscuros
- **Fondo mesh gradient** con colores desde Palette API
- **Animaciones** con `AnimatedContent`, `spring`, `infiniteRepeatable`
- **Karaoke** con resaltado de verso activo y auto-scroll
- **Modo reproductor** (50/50) y **modo letras** (35/65)

---

## Requisitos

### PC — Linux
```bash
# playerctl (monitorear reproducción)
sudo pacman -S playerctl          # Arch
sudo apt install playerctl        # Ubuntu/Debian
```

### PC — Windows
```powershell
# winrt (conexión SMTC con Apple Music, Spotify, etc.)
pip install winrt
```

### PC — Ambos
```bash
# Python 3.11+
python --version

# Dependencias del proyecto
cd media-control
python -m venv .venv
source .venv/bin/activate    # Linux
.venv\Scripts\activate       # Windows
pip install -r requirements.txt
```

### Android
- Android Studio (para compilar)
- JDK 17
- Android SDK 34

---

## Cómo ejecutar

### 1. Configurar la IP

Editar `android/app/build.gradle.kts` con la IP local de tu PC:

```kotlin
buildConfigField("String", "WS_HOST", "\"192.168.1.100\"")   // Cambiar por tu IP
buildConfigField("int", "WS_PORT", "8765")
buildConfigField("String", "WS_TOKEN", "\"media_control_secret\"")
```

> En Linux: `ip addr` o `ip a` para ver tu IP.
> En Windows: `ipconfig`.

### 2. Iniciar el servidor

```bash
cd media-control
source .venv/bin/activate        # Linux
# .venv\Scripts\activate         # Windows

# El backend detecta automáticamente el SO y usa playerctl (Linux) o winrt (Windows)
python -m src.server
```

Deberías ver:
```
[INFO] Starting MediaControl WebSocket server on 0.0.0.0:8765
[INFO] Found player instance: brave.instanceXXXX   (Linux)
[INFO] Started playback monitor for windows_smtc    (Windows)
```

### 3. Compilar e instalar APK en Android

```bash
cd android

# En Linux (requiere JDK 17):
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
export ANDROID_HOME=$HOME/android-sdk

# Compilar e instalar en dispositivo conectado por USB:
./gradlew installDebug
```

> La APK se genera en `android/app/build/outputs/apk/debug/app-debug.apk`

---

## Uso

1. Abrí la app en el celular
2. La app se conecta automáticamente al servidor
3. **Modo reproductor**: portada + info + controles (50/50)
4. Tocá **"Lyrics"** (arriba a la derecha) para ver letras sincronizadas
5. En modo letras, el texto avanza automáticamente (karaoke)
6. Si el título es largo, se desplaza tipo marquee
7. La pantalla no se apaga mientras la app está abierta

---

## Personalizar token de seguridad

Por defecto el token es `media_control_secret`. Para cambiarlo:

```bash
export SECRET_TOKEN="mi_token_seguro"
python -m src.server
```

Y actualizar `android/app/build.gradle.kts`:
```kotlin
buildConfigField("String", "WS_TOKEN", "\"mi_token_seguro\"")
```

---

## Estructura del proyecto

```
media-control/
├── src/                          # Backend Python
│   ├── server.py                 # Servidor WebSocket
│   ├── player_backend.py         # Factory multiplataforma
│   ├── playerctl.py              # Backend Linux (playerctl)
│   ├── backends/
│   │   ├── windows.py            # Backend Windows (winrt SMTC)
│   │   └── __init__.py
│   ├── auth.py                   # Verificación de token
│   ├── config.py                 # Config desde variables de entorno
│   ├── itunes.py                 # iTunes Search API
│   └── lrclib.py                 # LRCLIB API (letras)
├── android/                      # App Android
│   ├── app/src/main/java/com/mediacontrol/app/
│   │   ├── MainActivity.kt       # Activity principal
│   │   ├── model/
│   │   │   ├── PlaybackState.kt  # Modelo de datos
│   │   │   └── UiState.kt        # Estados de UI
│   │   ├── viewmodel/
│   │   │   └── PlaybackViewModel.kt
│   │   └── ui/
│   │       ├── PlayerScreen.kt   # Modo reproductor
│   │       ├── LyricsScreen.kt   # Modo letras
│   │       ├── AlbumArtwork.kt   # Portada con placeholder
│   │       ├── MarqueeText.kt    # Texto scroll para overflow
│   │       ├── MeshGradientBackground.kt  # Fondo animado
│   │       └── FormatUtils.kt    # Formateo de tiempo
│   └── app/build.gradle.kts      # Config (IP, puerto, token)
├── tests/                        # Tests Python
├── requirements.txt
└── pyproject.toml
```

---

## Troubleshooting

### "No module named 'src'"
Ejecutar como módulo, no como script:
```bash
python -m src.server    # ✅ correcto
python src/server.py    # ❌ incorrecto
```

### "HTTP Error 404" de LRCLIB
La canción no está en la base de datos de LRCLIB. Es normal para canciones poco conocidas. Las letras se omiten, el resto funciona.

### La app no se conecta
1. Verificá que el celular y el PC estén en la misma red WiFi
2. Verificá la IP en `build.gradle.kts`
3. Verificá que no haya firewall bloqueando el puerto 8765
4. En Windows: Asegurate que Apple Music esté reproduciendo (SMTC solo funciona con sesión activa)

### JDK 17 error con Gradle
Gradle 8.4 requiere JDK 17, no JDK 26. Usar:
```bash
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk
```

### ADB no encuentra el dispositivo
En Android: **Ajustes → Opciones de desarrollador → Depuración USB** activado.
Aceptar la huella RSA cuando conectes el cable por primera vez.

---

## APIs externas

- **iTunes Search API**: Búsqueda pública de Apple. Sin API key necesaria.
- **LRCLIB API**: Base de datos comunitaria de letras sincronizadas. Sin API key necesaria.
