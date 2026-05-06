package com.mediacontrol.app.viewmodel

import android.util.Log
import androidx.lifecycle.ViewModel
import com.mediacontrol.app.model.PlaybackState
import com.mediacontrol.app.model.UiState
import com.mediacontrol.app.websocket.ConnectionState
import com.mediacontrol.app.websocket.WebSocketClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

class PlaybackViewModel : ViewModel() {
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    private var webSocketClient: WebSocketClient? = null
    private var host: String = ""
    private var port: String = ""
    private var token: String = ""

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    private val json = Json { ignoreUnknownKeys = true }

    fun connect(host: String, port: String, token: String) {
        this.host = host
        this.port = port
        this.token = token
        val serverUrl = "ws://$host:$port"

        webSocketClient = WebSocketClient(
            serverUrl = serverUrl,
            token = token,
            coroutineScope = scope,
            onStateChanged = { connectionState ->
                handleConnectionState(connectionState)
            },
            onMessageReceived = { message ->
                handleMessage(message)
            }
        )

        _uiState.value = UiState.Connecting
        webSocketClient?.connect()
    }

    private fun handleConnectionState(connectionState: ConnectionState) {
        when (connectionState) {
            is ConnectionState.Connecting -> {
                _uiState.value = UiState.Connecting
            }
            is ConnectionState.Connected -> {
                val current = _uiState.value
                if (current is UiState.Connecting || current is UiState.Disconnected || current is UiState.Error) {
                    _uiState.value = UiState.Connected()
                }
            }
            is ConnectionState.Disconnected -> {
                _uiState.value = UiState.Disconnected
            }
            is ConnectionState.Error -> {
                _uiState.value = UiState.Error(connectionState.message)
            }
        }
    }

    private fun handleMessage(message: String) {
        try {
            val playbackState = json.decodeFromString<PlaybackState>(message)
            val state = when (playbackState.status) {
                "Playing" -> UiState.Playing(playbackState)
                "Paused" -> UiState.Paused(playbackState)
                else -> UiState.Connected(playbackState)
            }
            _uiState.value = state
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse message: $message", e)
        }
    }

    fun sendCommand(action: String, value: Number? = null) {
        val client = webSocketClient
        if (client != null && client.isConnected()) {
            val payload = buildJsonObject {
                put("token", token)
                put("action", action)
                if (value != null) {
                    put("value", value.toDouble())
                }
            }
            client.send(payload.toString())
        }
    }

    fun onScreenWake() {
        val current = _uiState.value
        if (current is UiState.Disconnected || current is UiState.Error) {
            webSocketClient?.disconnect()
            connect(host, port, token)
        }
    }

    override fun onCleared() {
        webSocketClient?.disconnect()
        scope.cancel()
        super.onCleared()
    }

    companion object {
        private const val TAG = "PlaybackViewModel"
    }
}
