package com.mediacontrol.app.websocket

import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import java.util.concurrent.TimeUnit

sealed class ConnectionState {
    object Connecting : ConnectionState()
    object Connected : ConnectionState()
    object Disconnected : ConnectionState()
    data class Error(val message: String) : ConnectionState()
}

class WebSocketClient(
    private val serverUrl: String,
    private val token: String,
    private val coroutineScope: CoroutineScope,
    private val onStateChanged: (ConnectionState) -> Unit,
    private val onMessageReceived: (String) -> Unit
) {
    companion object {
        private const val BASE_DELAY_MS = 1000L
        private const val MAX_DELAY_MS = 30000L
    }

    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private var authenticated = false
    private var reconnectJob: Job? = null
    private var retryCount = 0
    private var shouldReconnect = true

    fun connect() {
        shouldReconnect = true
        authenticated = false
        retryCount = 0
        reconnectJob?.cancel()
        webSocket?.close(1000, "Reconnecting")
        webSocket = null
        doConnect()
    }

    private fun doConnect() {
        onStateChanged(ConnectionState.Connecting)
        val request = Request.Builder()
            .url(serverUrl)
            .build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(webSocket: WebSocket, response: Response) {
                val handshake = """{"token": "$token"}"""
                webSocket.send(handshake)
            }

            override fun onMessage(webSocket: WebSocket, text: String) {
                if (!authenticated) {
                    authenticated = true
                    retryCount = 0
                    onStateChanged(ConnectionState.Connected)
                }
                onMessageReceived(text)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                authenticated = false
                onStateChanged(ConnectionState.Disconnected)
                scheduleReconnect()
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                authenticated = false
                onStateChanged(ConnectionState.Error(t.message ?: "Unknown error"))
                scheduleReconnect()
            }
        })
    }

    private fun scheduleReconnect() {
        reconnectJob?.cancel()
        if (!shouldReconnect) return

        val delayMs = calculateDelay()
        retryCount++
        reconnectJob = coroutineScope.launch {
            delay(delayMs)
            if (shouldReconnect) {
                doConnect()
            }
        }
    }

    private fun calculateDelay(): Long {
        val delay = BASE_DELAY_MS * (1L shl retryCount.coerceAtMost(5))
        return delay.coerceAtMost(MAX_DELAY_MS)
    }

    fun disconnect() {
        shouldReconnect = false
        reconnectJob?.cancel()
        webSocket?.close(1000, "Client closing")
        webSocket = null
        authenticated = false
    }

    fun send(message: String): Boolean {
        return webSocket?.send(message) ?: false
    }

    fun isConnected(): Boolean = authenticated
}
