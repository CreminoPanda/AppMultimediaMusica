package com.mediacontrol.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.mediacontrol.app.model.UiState

private data class LyricsLine(val timeMs: Long, val text: String)

@Composable
fun LyricsScreen(
    uiState: UiState,
    onCommand: (String, Number?) -> Unit,
    onToggleLyrics: () -> Unit,
    modifier: Modifier = Modifier
) {
    val playbackState = when (uiState) {
        is UiState.Playing -> uiState.playbackState
        is UiState.Paused -> uiState.playbackState
        else -> return
    }

    val isPlaying = uiState is UiState.Playing
    var isDragging by remember { mutableStateOf(false) }
    var dragProgress by remember { mutableStateOf(0f) }

    val progress = if (playbackState.durationMs > 0)
        playbackState.progressMs.toFloat() / playbackState.durationMs.toFloat()
    else 0f

    val lyricsLines = remember(playbackState.lyrics) {
        parseLyricsLines(playbackState.lyrics)
    }

    val currentLineIndex = remember(playbackState.progressMs, lyricsLines) {
        findCurrentLineIndex(lyricsLines, playbackState.progressMs)
    }

    val listState = rememberLazyListState()

    LaunchedEffect(currentLineIndex) {
        if (lyricsLines.isNotEmpty()) {
            listState.animateScrollToItem(currentLineIndex)
        }
    }

    Row(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .weight(0.35f)
                .fillMaxHeight()
                .padding(end = 8.dp)
        ) {
            AsyncImage(
                model = playbackState.artUrl.ifEmpty { null },
                contentDescription = "Album art",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(0.5f)
                    .padding(8.dp)
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = playbackState.title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Text(
                text = playbackState.artist,
                style = MaterialTheme.typography.bodySmall,
                color = Color.LightGray,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Spacer(modifier = Modifier.weight(0.1f))

            Text(
                text = "${formatTime(playbackState.progressMs)} / ${formatTime(playbackState.durationMs)}",
                color = Color.White,
                style = MaterialTheme.typography.bodySmall
            )

            Slider(
                value = if (isDragging) dragProgress else progress,
                onValueChange = { value ->
                    isDragging = true
                    dragProgress = value
                },
                onValueChangeFinished = {
                    isDragging = false
                    if (playbackState.durationMs > 0) {
                        val seekMs = (dragProgress * playbackState.durationMs).toLong()
                        onCommand("seek", seekMs / 1000f)
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp),
                colors = SliderDefaults.colors(
                    thumbColor = Color.White,
                    activeTrackColor = Color.White,
                    inactiveTrackColor = Color.White.copy(alpha = 0.3f)
                )
            )

            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                IconButton(
                    onClick = { onCommand("previous", null) },
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.SkipPrevious,
                        contentDescription = "Previous",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }

                IconButton(
                    onClick = {
                        onCommand(if (isPlaying) "pause" else "play", null)
                    },
                    modifier = Modifier.size(64.dp)
                ) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        tint = Color.White,
                        modifier = Modifier.size(48.dp)
                    )
                }

                IconButton(
                    onClick = { onCommand("next", null) },
                    modifier = Modifier.size(48.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.SkipNext,
                        contentDescription = "Next",
                        tint = Color.White,
                        modifier = Modifier.size(36.dp)
                    )
                }
            }

            TextButton(onClick = onToggleLyrics) {
                Text(
                    text = "Player",
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium
                )
            }
        }

        Column(
            modifier = Modifier
                .weight(0.65f)
                .fillMaxHeight()
                .padding(start = 8.dp)
        ) {
            if (lyricsLines.isEmpty()) {
                Box(
                    contentAlignment = Alignment.Center,
                    modifier = Modifier.fillMaxSize()
                ) {
                    Text(
                        text = "No lyrics available",
                        color = Color.Gray,
                        style = MaterialTheme.typography.bodyLarge
                    )
                }
            } else {
                LazyColumn(
                    state = listState,
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    itemsIndexed(lyricsLines) { index, line ->
                        val isCurrent = index == currentLineIndex
                        Text(
                            text = line.text,
                            color = if (isCurrent) Color.White else Color.White.copy(alpha = 0.5f),
                            style = if (isCurrent) MaterialTheme.typography.headlineSmall else MaterialTheme.typography.bodyLarge,
                            fontWeight = if (isCurrent) FontWeight.Bold else FontWeight.Normal,
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                        )
                    }
                }
            }
        }
    }
}

private fun parseLyricsLines(lyrics: String?): List<LyricsLine> {
    if (lyrics.isNullOrBlank()) return emptyList()

    val pattern = Regex("""\[(\d{2}):(\d{2})\.?(\d*)\]""")
    return lyrics.lines().mapNotNull { line ->
        val match = pattern.find(line)
        if (match != null) {
            val minutes = match.groupValues[1].toInt()
            val seconds = match.groupValues[2].toInt()
            val fractional = match.groupValues[3]
            val millis = when (fractional.length) {
                2 -> fractional.toInt() * 10
                3 -> fractional.toInt()
                else -> 0
            }
            val timeMs = (minutes * 60L + seconds) * 1000L + millis
            val text = line.replace(pattern, "").trim()
            if (text.isNotBlank()) LyricsLine(timeMs, text) else null
        } else {
            val trimmed = line.trim()
            if (trimmed.isNotBlank()) LyricsLine(0, trimmed) else null
        }
    }
}

private fun findCurrentLineIndex(lines: List<LyricsLine>, progressMs: Long): Int {
    var lastIndex = 0
    for (i in lines.indices) {
        if (lines[i].timeMs > 0 && lines[i].timeMs <= progressMs) {
            lastIndex = i
        }
    }
    return lastIndex
}
