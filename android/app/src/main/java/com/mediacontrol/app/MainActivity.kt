package com.mediacontrol.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mediacontrol.app.model.UiState
import com.mediacontrol.app.viewmodel.PlaybackViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val viewModel = viewModel<PlaybackViewModel>()
            val uiState by viewModel.uiState.collectAsState()

            LaunchedEffect(Unit) {
                viewModel.connect(
                    host = BuildConfig.WS_HOST,
                    port = BuildConfig.WS_PORT.toString(),
                    token = BuildConfig.WS_TOKEN
                )
            }

            MaterialTheme {
                MediaControlApp(uiState = uiState)
            }
        }
    }
}

@Composable
fun MediaControlApp(uiState: UiState) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF1A1A2E)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(32.dp)
        ) {
            when (uiState) {
                is UiState.Loading, is UiState.Connecting -> {
                    CircularProgressIndicator(color = Color.White)
                    Text(
                        text = "Connecting...",
                        color = Color.White,
                        style = MaterialTheme.typography.headlineSmall,
                        modifier = Modifier.padding(top = 16.dp)
                    )
                }
                is UiState.Connected -> {
                    Text(
                        text = "Connected",
                        color = Color.Green,
                        style = MaterialTheme.typography.headlineSmall
                    )
                    uiState.playbackState?.let { state ->
                        Text(
                            text = "Title: ${state.title}",
                            color = Color.White,
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 16.dp)
                        )
                        Text(
                            text = "Artist: ${state.artist}",
                            color = Color.White,
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = TextAlign.Center
                        )
                    }
                }
                is UiState.Playing -> {
                    Text(
                        text = "Playing",
                        color = Color.Green,
                        style = MaterialTheme.typography.headlineSmall
                    )
                    Text(
                        text = uiState.playbackState.title,
                        color = Color.White,
                        style = MaterialTheme.typography.titleLarge,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 16.dp)
                    )
                    Text(
                        text = uiState.playbackState.artist,
                        color = Color.LightGray,
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center
                    )
                }
                is UiState.Paused -> {
                    Text(
                        text = "Paused",
                        color = Color.Yellow,
                        style = MaterialTheme.typography.headlineSmall
                    )
                    Text(
                        text = uiState.playbackState.title,
                        color = Color.White,
                        style = MaterialTheme.typography.titleLarge,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 16.dp)
                    )
                    Text(
                        text = uiState.playbackState.artist,
                        color = Color.LightGray,
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center
                    )
                }
                is UiState.Disconnected -> {
                    Text(
                        text = "Disconnected",
                        color = Color.Gray,
                        style = MaterialTheme.typography.headlineSmall
                    )
                }
                is UiState.Error -> {
                    Text(
                        text = "Error: ${uiState.message}",
                        color = Color.Red,
                        style = MaterialTheme.typography.headlineSmall,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}
