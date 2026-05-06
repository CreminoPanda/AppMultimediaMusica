# Product Requirements Document (PRD) v2.5
## Proyecto: Monitor y Control Multimedia (Arch Linux ↔ Android)
**Foco:** Integración con Apple Music (PWA) e Interfaz Premium Landscape

---

## 1. Contexto y Visión
Aplicación Android diseñada para funcionar como un dashboard multimedia en formato horizontal (landscape), ideal para móviles apoyados en escritorios y tablets. Actuará como un control remoto avanzado para la reproducción multimedia de un PC con Arch Linux (específicamente la PWA de Apple Music en Brave). El sistema utilizará la API de iTunes para enriquecer metadata (portadas HD, duración) y la API de LRCLIB para obtener letras sincronizadas, superando las limitaciones nativas de MPRIS en navegadores web.

---

## 2. ⚙️ Arquitectura del Sistema

### 1. Backend (Arch Linux - Python)
* **Gestor de Eventos:** `playerctl` (modo monitor) atado a la instancia específica de la PWA de Brave.
* **Enriquecedor de Datos (APIs):** * **iTunes Search API:** Para extraer duración real y Portada HD (600x600).
    * **LRCLIB API:** Para buscar y extraer las letras sincronizadas (formato LRC) basadas en el título y artista.
* **Servidor:** Servidor WebSocket local (`websockets`) blindado a la red LAN.

### 2. Frontend (Android - Kotlin/Jetpack Compose)
* **Orientación:** Forzada a Landscape (Horizontal).
* **UI Engine:** Jetpack Compose con animaciones de transición de estado.
* **Procesamiento Visual:** Android `Palette` API para extraer colores dominantes de la carátula y renderizar el fondo dinámico.

---

## 3. Especificaciones de Interfaz de Usuario (UI/UX)

La aplicación operará en dos estados visuales principales, con transiciones fluidas entre ambos:

### Fondo Dinámico Global (Siempre Activo)
* No hay colores sólidos fijos. El fondo será un "Mesh Gradient" (gradiente de malla) difuminado.
* **Colores:** Extraídos dinámicamente de la portada del álbum actual usando la API `Palette` de Android.
* **Animación:** Emulación del reproductor de Apple Music. Los colores generarán "esferas" o manchas desenfocadas que rotan y se mueven suavemente por el fondo de forma continua.

### Estado 1: Modo Reproductor (Default)
Distribución en pantalla dividida (50/50):
* **Panel Izquierdo:**
    * Imagen de portada (Art) en gran tamaño.
    * Textos centrados debajo de la portada: Título de la canción (destacado), Nombre del Álbum, Nombre del Artista.
* **Panel Derecho:**
    * Línea de tiempo funcional (Barra de progreso / SeekBar).
    * Controles de reproducción grandes (Previous, Play/Pause, Next).
    * Botón para activar "Modo Letras" (Lyrics Toggle).

### Estado 2: Modo Letras (Lyrics Mode)
Distribución ajustada para dar prioridad a la lectura:
* **Panel Izquierdo (Comprimido):**
    * Imagen de portada reduce su tamaño.
    * Textos se minimizan (se oculta el álbum, solo queda Título y Artista).
    * Los controles de reproducción (y barra de progreso) migran a este panel, ubicándose debajo de la portada minimizada.
* **Panel Derecho (Expandido):**
    * Ocupado enteramente por la vista de letras de la canción.
    * **Sincronización:** Las letras deben hacer scroll automáticamente y resaltar el verso actual a medida que avanza la canción (estilo karaoke), utilizando los timestamps del archivo LRC proveído por el backend.

---

## 4. Requerimientos Funcionales Backend

- [ ] Identificar y aislar la instancia de Brave PWA (`brave.instanceXXXX`).
- [ ] Limpiar metadata mediante Regex (separar "Canción — Artista").
- [ ] Consultar API iTunes para `duration_ms` y `art_url_hd`.
- [ ] Consultar API LRCLIB para obtener las letras sincronizadas.
- [ ] Construir JSON unificado y enviarlo por WebSocket.
- [ ] Escuchar y ejecutar comandos provenientes de Android (`playerctl`).

---

## 5. Networking y Seguridad
-   **Entorno:** Operación estricta en Red Local (LAN).
-   **Handshake:** Uso de un `SECRET_TOKEN` estático. Android debe enviarlo al abrir el socket; si falla, el servidor corta la conexión.
-   **Reconexión:** Android debe manejar bloqueos de pantalla reanudando el socket silenciosamente al encender la pantalla (Wake Lock management sugerido).

---

## 6. Estructura de Datos (JSON)

### Salida (Backend → Android)
```json
{
  "status": "Playing",
  "title": "Babe I'm Gonna Leave You",
  "artist": "Led Zeppelin",
  "album": "Led Zeppelin (Remastered)",
  "duration_ms": 401493,
  "progress_ms": 15000,
  "art_url": "https://.../600x600bb.jpg",
  "lyrics": "[00:15.00]Babe, baby, baby, I'm gonna leave you\n[00:22.50]I'll leave you when the summertime..."
}

{
  "token": "MI_PIN_SECRETO",
  "action": "seek",
  "value": 22500
}