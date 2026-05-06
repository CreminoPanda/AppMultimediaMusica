package com.mediacontrol.app

import android.os.Bundle
import android.util.Log
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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.mediacontrol.app.websocket.ConnectionState
import com.mediacontrol.app.websocket.WebSocketClient

class MainActivity : ComponentActivity() {
    private lateinit var webSocketClient: WebSocketClient
    private var connectionState by mutableStateOf<ConnectionState>(ConnectionState.Disconnected)
    private var lastMessage by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setupWebSocket()
        setContent {
            MaterialTheme {
                MediaControlApp(connectionState = connectionState, lastMessage = lastMessage)
            }
        }
    }

    private fun setupWebSocket() {
        val host = BuildConfig.WS_HOST
        val port = BuildConfig.WS_PORT
        val token = BuildConfig.WS_TOKEN
        val serverUrl = "ws://$host:$port"

        webSocketClient = WebSocketClient(
            serverUrl = serverUrl,
            token = token,
            onStateChanged = { state ->
                connectionState = state
                Log.i(TAG, "Connection state: $state")
            },
            onMessageReceived = { message ->
                lastMessage = message
                Log.i(TAG, "Message received: $message")
            }
        )
        webSocketClient.connect()
    }

    override fun onDestroy() {
        webSocketClient.disconnect()
        super.onDestroy()
    }

    companion object {
        private const val TAG = "MediaControl"
    }
}

@Composable
fun MediaControlApp(
    connectionState: ConnectionState,
    lastMessage: String?
) {
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
            when (connectionState) {
                is ConnectionState.Connecting -> {
                    CircularProgressIndicator(color = Color.White)
                    Text(
                        text = "Connecting...",
                        color = Color.White,
                        style = MaterialTheme.typography.headlineSmall,
                        modifier = Modifier.padding(top = 16.dp)
                    )
                }
                is ConnectionState.Connected -> {
                    Text(
                        text = "Connected",
                        color = Color.Green,
                        style = MaterialTheme.typography.headlineSmall
                    )
                    lastMessage?.let { msg ->
                        Text(
                            text = msg,
                            color = Color.White,
                            style = MaterialTheme.typography.bodyMedium,
                            textAlign = TextAlign.Center,
                            modifier = Modifier.padding(top = 16.dp)
                        )
                    }
                }
                is ConnectionState.Disconnected -> {
                    Text(
                        text = "Disconnected",
                        color = Color.Gray,
                        style = MaterialTheme.typography.headlineSmall
                    )
                }
                is ConnectionState.Error -> {
                    Text(
                        text = "Error: ${connectionState.message}",
                        color = Color.Red,
                        style = MaterialTheme.typography.headlineSmall,
                        textAlign = TextAlign.Center
                    )
                }
            }
        }
    }
}
