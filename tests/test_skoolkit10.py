from starquake_extract.skoolkit10 import adapt_text


def test_call_colon_syntax_becomes_parenthesised() -> None:
    src = "; #CALL:print_room_data(#PC,room_0)\n"
    assert adapt_text(src) == "; #CALL(print_room_data(#PC,room_0))\n"


def test_udgarray_star_becomes_frames() -> None:
    src = "#UDGARRAY*(${s}_1;${s}_2)({$s})\n"
    assert "#FRAMES(" in adapt_text(src)
    assert "#UDGARRAY*" not in adapt_text(src)
