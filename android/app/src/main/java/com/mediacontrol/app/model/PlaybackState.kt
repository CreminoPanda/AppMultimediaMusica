package com.mediacontrol.app.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PlaybackState(
    val status: String,
    val title: String,
    val artist: String,
    val album: String,
    @SerialName("duration_ms")
    val durationMs: Long = 0,
    @SerialName("progress_ms")
    val progressMs: Long = 0,
    @SerialName("art_url")
    val artUrl: String = "",
    val lyrics: String? = null
)
