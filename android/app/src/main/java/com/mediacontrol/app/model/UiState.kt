package com.mediacontrol.app.model

sealed class UiState {
    object Loading : UiState()
    object Connecting : UiState()
    data class Connected(val playbackState: PlaybackState? = null) : UiState()
    data class Playing(val playbackState: PlaybackState) : UiState()
    data class Paused(val playbackState: PlaybackState) : UiState()
    object Disconnected : UiState()
    data class Error(val message: String) : UiState()
}
