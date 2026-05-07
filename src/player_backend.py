import sys

__all__ = [
    "PlaybackEvent", "PlaybackStatus", "TrackInfo",
    "find_player_instance", "get_player_metadata", "get_player_status",
    "get_position", "monitor_player",
    "send_next", "send_pause", "send_play", "send_play_pause",
    "send_previous", "send_seek",
]

if sys.platform == "win32":
    try:
        from src.backends.windows import (
            PlaybackEvent,
            PlaybackStatus,
            TrackInfo,
            find_player_instance,
            get_player_metadata,
            get_player_status,
            get_position,
            monitor_player,
            send_next,
            send_pause,
            send_play,
            send_play_pause,
            send_previous,
            send_seek,
        )
    except ImportError:
        raise RuntimeError(
            "Windows backend requires 'winrt'. Install with: pip install winrt"
        )
else:
    from src.playerctl import (
        PlaybackEvent,
        PlaybackStatus,
        TrackInfo,
        find_player_instance,
        get_player_metadata,
        get_player_status,
        get_position,
        monitor_player,
        send_next,
        send_pause,
        send_play,
        send_play_pause,
        send_previous,
        send_seek,
    )
