package com.mediacontrol.app.websocket

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
    private val onStateChanged: (ConnectionState) -> Unit,
    private val onMessageReceived: (String) -> Unit
) {
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()

    private var webSocket: WebSocket? = null
    private var authenticated = false

    fun connect() {
        authenticated = false
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
                    onStateChanged(ConnectionState.Connected)
                }
                onMessageReceived(text)
            }

            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                authenticated = false
                onStateChanged(ConnectionState.Disconnected)
            }

            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                authenticated = false
                onStateChanged(ConnectionState.Error(t.message ?: "Unknown error"))
            }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, "Client closing")
        webSocket = null
        authenticated = false
    }

    fun send(message: String): Boolean {
        return webSocket?.send(message) ?: false
    }

    fun isConnected(): Boolean = authenticated
}
