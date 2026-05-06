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
- Player UI composable in `com.mediacontrol.app.ui.PlayerScreen` — takes `(UiState, onCommand, onToggleLyrics)` as parameters
- Lyrics Mode UI composable in `com.mediacontrol.app.ui.LyricsScreen` — same signature as PlayerScreen, shows compressed player with lyrics panel
- Mode toggle state (`showLyrics`) managed via `remember { mutableStateOf(false) }` in `MediaControlApp` composable in `MainActivity.kt`
- Time formatting utility in `com.mediacontrol.app.ui.FormatUtils` — `internal fun formatTime(ms: Long): String` shared between PlayerScreen and LyricsScreen
- `parseLyricsLines(lyrics: String?)` in LyricsScreen parses LRC timestamps into `List<LyricsLine>(timeMs, text)` — regex `\[(\d{2}):(\d{2})\.?(\d*)\]` extracts mm, ss, fractional seconds; centiseconds (2-digit) *10 or milliseconds (3-digit) as-is
- Karaoke-style lyrics highlighting: `findCurrentLineIndex()` finds the last timed line where `timeMs <= progressMs`; `currentLineIndex` drives auto-scroll via `LazyListState.animateScrollToItem()` and conditional styling (white+bold+headlineSmall for current, dimmed+normal+bodyLarge for others)
- Media control icons require `material-icons-extended` dependency (PlayArrow, Pause, SkipNext, SkipPrevious)
- Seekable progress bar pattern: use local `isDragging` state to decouple Slider value from live progress during drag; on `onValueChangeFinished`, send `"seek"` command with seconds value
- LyricsScreen uses 35/65 split: compressed left panel (album art, title+artist, slider, controls) and expanded right panel (scrollable lyrics in LazyColumn)

## Architecture
- Single Activity (`MainActivity`) using `setContent` for Compose UI
- ViewModel (`PlaybackViewModel`) manages state via `StateFlow<UiState>`, injected with `viewModel()` in Compose
- Composable functions receive state as parameters, not as global state
- `PlaybackViewModel.connect()` initializes WebSocket and stores token for command authentication
- Commands sent via `sendCommand(action, value?)` use `kotlinx.serialization.json.buildJsonObject` for proper JSON serialization
- WebSocket reconnection with exponential backoff built into `WebSocketClient` (BASE_DELAY_MS=1s, shr shl retryCount capped at 5, MAX_DELAY_MS=30s); uses `CoroutineScope` passed at construction
- ViewModel uses custom `CoroutineScope(SupervisorJob() + Dispatchers.Main)` instead of `viewModelScope` to avoid dependency issues — cancelled in `onCleared()`
- Screen-wake reconnection via `DisposableEffect` + `LocalLifecycleOwner.current` observing `Lifecycle.Event.ON_START` in `MainActivity`; triggers `viewModel.onScreenWake()`

## UI Animations
- Mode transitions (Player ↔ Lyrics): use `AnimatedContent` with `slideInHorizontally` + `fadeIn` togetherWith `slideOutHorizontally` + `fadeOut` in `MediaControlApp`
- Track change animation: use `AnimatedContent` with `fadeIn() togetherWith fadeOut()` wrapped around album art (in a `Box` with `weight`) and metadata text sections separately; key on `playbackState.title`
- Album art `AsyncImage` inside `AnimatedContent` should use `Modifier.fillMaxSize()` and be wrapped in a parent `Box` with the `weight` modifier to avoid layout issues
