package com.mediacontrol.app.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.material.icons.filled.SkipPrevious
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
    var userScrolledAt by remember { mutableStateOf(0L) }

    LaunchedEffect(Unit) {
        snapshotFlow { listState.isScrollInProgress }
            .collect { scrolling ->
                if (scrolling) {
                    userScrolledAt = System.currentTimeMillis()
                }
            }
    }

    LaunchedEffect(currentLineIndex) {
        if (lyricsLines.isNotEmpty()) {
            val timeSinceUserScroll = System.currentTimeMillis() - userScrolledAt
            if (timeSinceUserScroll > 5000) {
                listState.animateScrollToItem(currentLineIndex)
            }
        }
    }

    Row(
        modifier = modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 32.dp)
    ) {
        // Left — compressed album art + controls
        Column(
            modifier = Modifier
                .weight(0.35f)
                .fillMaxHeight(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Album art (smaller)
            AsyncImage(
                model = playbackState.artUrl.ifEmpty { null },
                contentDescription = "Album art",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxWidth(0.85f)
                    .padding(bottom = 16.dp)
                    .clip(RoundedCornerShape(16.dp))
            )

            // Time
            Text(
                text = "${formatTime(playbackState.progressMs)} / ${formatTime(playbackState.durationMs)}",
                color = Color.White.copy(alpha = 0.5f),
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium
            )

            Spacer(modifier = Modifier.height(8.dp))

            // Slider
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
                    .height(4.dp)
                    .padding(horizontal = 4.dp),
                colors = SliderDefaults.colors(
                    thumbColor = Color.White,
                    activeTrackColor = Color.White,
                    inactiveTrackColor = Color.White.copy(alpha = 0.2f)
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Controls
            Row(
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .clickable { onCommand("previous", null) },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.SkipPrevious,
                        contentDescription = "Previous",
                        tint = Color.White.copy(alpha = 0.8f),
                        modifier = Modifier.size(22.dp)
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                Box(
                    modifier = Modifier
                        .size(56.dp)
                        .clip(CircleShape)
                        .background(Color.White)
                        .clickable {
                            onCommand(if (isPlaying) "pause" else "play", null)
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        tint = Color.Black,
                        modifier = Modifier.size(24.dp)
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .clip(CircleShape)
                        .clickable { onCommand("next", null) },
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Filled.SkipNext,
                        contentDescription = "Next",
                        tint = Color.White.copy(alpha = 0.8f),
                        modifier = Modifier.size(22.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Back to player
            Box(
                modifier = Modifier
                    .clickable(onClick = onToggleLyrics)
                    .padding(vertical = 4.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "‹ ",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 18.sp
                    )
                    Text(
                        text = "Player",
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
        }

        Spacer(modifier = Modifier.width(12.dp))

        // Right — Lyrics panel with glass background
        Column(
            modifier = Modifier
                .weight(0.65f)
                .fillMaxHeight()
        ) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .clip(RoundedCornerShape(24.dp))
                    .background(Color.White.copy(alpha = 0.05f))
            ) {
                if (lyricsLines.isEmpty()) {
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.fillMaxSize()
                    ) {
                        Text(
                            text = "No lyrics available",
                            color = Color.White.copy(alpha = 0.5f),
                            fontSize = 16.sp
                        )
                    }
                } else {
                    Box(modifier = Modifier.fillMaxSize()) {
                        LazyColumn(
                            state = listState,
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 20.dp, vertical = 24.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            itemsIndexed(lyricsLines) { index, line ->
                                val isActive = index == currentLineIndex
                                val isPast = index < currentLineIndex
                                val textColor = when {
                                    isActive -> Color.White
                                    isPast -> Color.White.copy(alpha = 0.3f)
                                    else -> Color.White.copy(alpha = 0.5f)
                                }
                                Text(
                                    text = line.text,
                                    color = textColor,
                                    fontSize = if (isActive) 20.sp else 16.sp,
                                    fontWeight = if (isActive) FontWeight.Bold else FontWeight.Normal,
                                    lineHeight = if (isActive) 28.sp else 24.sp,
                                    modifier = Modifier.padding(vertical = 6.dp)
                                )
                            }
                        }

                        // Fade gradients
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(Color.Black.copy(alpha = 0.3f), Color.Transparent)
                                    )
                                )
                                .align(Alignment.TopCenter)
                        )
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(48.dp)
                                .background(
                                    Brush.verticalGradient(
                                        colors = listOf(Color.Transparent, Color.Black.copy(alpha = 0.3f))
                                    )
                                )
                                .align(Alignment.BottomCenter)
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
