package com.mediacontrol.app.ui

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
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

@Composable
fun PlayerScreen(
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

    Row(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .padding(end = 8.dp)
        ) {
            AsyncImage(
                model = playbackState.artUrl.ifEmpty { null },
                contentDescription = "Album art",
                contentScale = ContentScale.Fit,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(8.dp)
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = playbackState.title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Text(
                text = playbackState.album,
                style = MaterialTheme.typography.bodyMedium,
                color = Color.LightGray,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 8.dp)
            )

            Text(
                text = playbackState.artist,
                style = MaterialTheme.typography.bodyLarge,
                color = Color.LightGray,
                textAlign = TextAlign.Center,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 8.dp)
            )
        }

        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .weight(1f)
                .fillMaxHeight()
                .padding(start = 8.dp)
        ) {
            Spacer(modifier = Modifier.weight(0.3f))

            Text(
                text = "${formatTime(playbackState.progressMs)} / ${formatTime(playbackState.durationMs)}",
                color = Color.White,
                style = MaterialTheme.typography.bodyMedium
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

            Spacer(modifier = Modifier.height(32.dp))

            Row(
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                IconButton(
                    onClick = { onCommand("previous", null) },
                    modifier = Modifier.size(64.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.SkipPrevious,
                        contentDescription = "Previous",
                        tint = Color.White,
                        modifier = Modifier.size(48.dp)
                    )
                }

                IconButton(
                    onClick = {
                        onCommand(if (isPlaying) "pause" else "play", null)
                    },
                    modifier = Modifier.size(80.dp)
                ) {
                    Icon(
                        imageVector = if (isPlaying) Icons.Filled.Pause else Icons.Filled.PlayArrow,
                        contentDescription = if (isPlaying) "Pause" else "Play",
                        tint = Color.White,
                        modifier = Modifier.size(64.dp)
                    )
                }

                IconButton(
                    onClick = { onCommand("next", null) },
                    modifier = Modifier.size(64.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.SkipNext,
                        contentDescription = "Next",
                        tint = Color.White,
                        modifier = Modifier.size(48.dp)
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            TextButton(onClick = onToggleLyrics) {
                Text(
                    text = "Lyrics",
                    color = Color.White,
                    style = MaterialTheme.typography.titleMedium
                )
            }

            Spacer(modifier = Modifier.weight(0.3f))
        }
    }
}

private fun formatTime(ms: Long): String {
    val totalSeconds = ms / 1000
    val minutes = totalSeconds / 60
    val seconds = totalSeconds % 60
    return "%d:%02d".format(minutes, seconds)
}
