from src.playerctl import parse_metadata


def test_parse_metadata_em_dash() -> None:
    result = parse_metadata("Song Title — Artist Name")
    assert result.title == "Song Title"
    assert result.artist == "Artist Name"


def test_parse_metadata_en_dash() -> None:
    result = parse_metadata("Song Title – Artist Name")
    assert result.title == "Song Title"
    assert result.artist == "Artist Name"


def test_parse_metadata_hyphen() -> None:
    result = parse_metadata("Song Title - Artist Name")
    assert result.title == "Song Title"
    assert result.artist == "Artist Name"


def test_parse_metadata_no_separator() -> None:
    result = parse_metadata("Just a title")
    assert result.title == "Just a title"
    assert result.artist == ""


def test_parse_metadata_empty() -> None:
    result = parse_metadata("")
    assert result.title == ""
    assert result.artist == ""


def test_parse_metadata_whitespace_only() -> None:
    result = parse_metadata("   ")
    assert result.title == ""
    assert result.artist == ""


def test_parse_metadata_multiple_dashes() -> None:
    result = parse_metadata("Song — Title — Artist Name")
    assert result.title == "Song"
    assert result.artist == "Title — Artist Name"


def test_parse_metadata_trailing_dash() -> None:
    result = parse_metadata("Song Title — ")
    assert result.title == "Song Title"
    assert result.artist == ""
