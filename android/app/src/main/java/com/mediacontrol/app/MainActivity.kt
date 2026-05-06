package com.mediacontrol.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.viewmodel.compose.viewModel
import com.mediacontrol.app.model.UiState
import com.mediacontrol.app.ui.MeshGradientBackground
import com.mediacontrol.app.ui.LyricsScreen
import com.mediacontrol.app.ui.PlayerScreen
import com.mediacontrol.app.viewmodel.PlaybackViewModel

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContent {
            val viewModel = viewModel<PlaybackViewModel>()
            val uiState by viewModel.uiState.collectAsState()

            val lifecycleOwner = LocalLifecycleOwner.current
            DisposableEffect(lifecycleOwner) {
                val observer = LifecycleEventObserver { _, event ->
                    if (event == Lifecycle.Event.ON_START) {
                        viewModel.onScreenWake()
                    }
                }
                lifecycleOwner.lifecycle.addObserver(observer)
                onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
            }

            LaunchedEffect(Unit) {
                viewModel.connect(
                    host = BuildConfig.WS_HOST,
                    port = BuildConfig.WS_PORT.toString(),
                    token = BuildConfig.WS_TOKEN
                )
            }

            MaterialTheme {
                MediaControlApp(
                    uiState = uiState,
                    onCommand = viewModel::sendCommand
                )
            }
        }
    }
}

@Composable
fun MediaControlApp(
    uiState: UiState,
    onCommand: (String, Number?) -> Unit = { _, _ -> }
) {
    var showLyrics by remember { mutableStateOf(false) }
    val artUrl = when (uiState) {
        is UiState.Playing -> uiState.playbackState.artUrl
        is UiState.Paused -> uiState.playbackState.artUrl
        is UiState.Connected -> uiState.playbackState?.artUrl ?: ""
        else -> ""
    }

    Box(modifier = Modifier.fillMaxSize()) {
        MeshGradientBackground(
            artUrl = artUrl,
            modifier = Modifier.fillMaxSize()
        )

        when (uiState) {
            is UiState.Loading, is UiState.Connecting -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp)
                ) {
                    CircularProgressIndicator(color = Color.White)
                    Text(
                        text = "Connecting...",
                        color = Color.White,
                        style = MaterialTheme.typography.headlineSmall,
                        modifier = Modifier.padding(top = 16.dp)
                    )
                }
            }
            is UiState.Connected -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp)
                ) {
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
            }
            is UiState.Playing, is UiState.Paused -> {
                val toggleLyrics = { showLyrics = !showLyrics }
                AnimatedContent(
                    targetState = showLyrics,
                    transitionSpec = {
                        if (targetState) {
                            slideInHorizontally { width -> width } + fadeIn() togetherWith
                                slideOutHorizontally { width -> -width } + fadeOut()
                        } else {
                            slideInHorizontally { width -> -width } + fadeIn() togetherWith
                                slideOutHorizontally { width -> width } + fadeOut()
                        }
                    },
                    label = "mode_transition"
                ) { isLyrics ->
                    if (isLyrics) {
                        LyricsScreen(
                            uiState = uiState,
                            onCommand = onCommand,
                            onToggleLyrics = toggleLyrics
                        )
                    } else {
                        PlayerScreen(
                            uiState = uiState,
                            onCommand = onCommand,
                            onToggleLyrics = toggleLyrics
                        )
                    }
                }
            }
            is UiState.Disconnected -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp)
                ) {
                    Text(
                        text = "Disconnected",
                        color = Color.Gray,
                        style = MaterialTheme.typography.headlineSmall
                    )
                }
            }
            is UiState.Error -> {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp)
                ) {
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
