# Android Project — MediaControl

## Project Setup
- Gradle 8.4 with AGP 8.2.2, Kotlin 1.9.22, Compose BOM 2024.02.00
- Min SDK: 29 (Android 10) — Target SDK: 34
- Landscape forced via `android:screenOrientation="landscape"` in AndroidManifest.xml
- LAN cleartext WebSocket: `android:usesCleartextTraffic="true"` in manifest + INTERNET permission

## Build Config
- Server address and token stored as `buildConfigField` in `app/build.gradle.kts`
- Access via `BuildConfig.WS_HOST`, `BuildConfig.WS_PORT`, `BuildConfig.WS_TOKEN`
- Update these fields (not hardcoded strings) when changing connection settings

## WebSocket
- OkHttp WebSocket client in `com.mediacontrol.app.websocket.WebSocketClient`
- Connection states tracked via `ConnectionState` sealed class: Connecting, Connected, Disconnected, Error
- Token handshake is sent immediately on `onOpen`; first received message confirms authentication
- Use `pingInterval(30, TimeUnit.SECONDS)` to keep connection alive

## UI Components
- Mesh gradient background in `com.mediacontrol.app.ui.MeshGradientBackground` — use as full-screen Box background via `Modifier.fillMaxSize()`
- Extract `artUrl` from `UiState.Playing.playbackState.artUrl` or `UiState.Paused.playbackState.artUrl`; pass empty string for fallback colors
- Coil + Palette API for extracting vibrant/dark/muted colors from album art; DEFAULT_COLORS used when no art is available
- Canvas-based animation with `rememberInfiniteTransition` + `animateFloat` + `tween` for blob movement; radial gradients for bloom effect
- Color extraction runs on `Dispatchers.IO`; bitmap requires explicit `BitmapDrawable.cast()` from Coil `DrawableResult`

## Architecture
- Single Activity (`MainActivity`) using `setContent` for Compose UI
- ViewModel (`PlaybackViewModel`) manages state via `StateFlow<UiState>`, injected with `viewModel()` in Compose
- Composable functions receive state as parameters, not as global state
- `PlaybackViewModel.connect()` initializes WebSocket and stores token for command authentication
- Commands sent via `sendCommand(action, value?)` use `kotlinx.serialization.json.buildJsonObject` for proper JSON serialization
