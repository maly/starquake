"""Attribute resolution must match the game routine at 0xEAD3, not SkoolKit."""

from starquake_extract.decode import is_solid, resolve_attr


def test_ordinary_attribute_is_stored_in_full_including_bits_6_and_7() -> None:
    # AND $3F is only for the CP against specials; LD (BC),A stores the whole byte.
    assert resolve_attr(0x07, ea62=0x02, ea63=0x05) == 0x07
    assert resolve_attr(0x47, ea62=0x02, ea63=0x05) == 0x47
    assert resolve_attr(0xC7, ea62=0x02, ea63=0x05) == 0xC7


def test_attribute_zero_keeps_paper_flash_bright_and_takes_ink_from_ea62() -> None:
    # (full & $F8) | (EA62). Snapshot default EA62 is $02.
    # Special only when bits 0-5 are clear (ink and paper both 0).
    assert resolve_attr(0x00, ea62=0x02, ea63=0x05) == 0x02
    assert resolve_attr(0x40, ea62=0x02, ea63=0x05) == 0x42
    assert resolve_attr(0x80, ea62=0x03, ea63=0x05) == 0x83
    assert resolve_attr(0x00, ea62=0x05, ea63=0x03) == 0x05
    # Paper 7 + ink 0 is NOT special: AND $3F yields $38, so the full byte is kept.
    assert resolve_attr(0x38, ea62=0x07, ea63=0x05) == 0x38


def test_attribute_0x36_keeps_flash_bright_and_takes_paper_ink_from_ea63() -> None:
    # CP is on (full & $3F), so $76/$B6/$F6 also take this path.
    # (full & $C0) | EA63.
    assert resolve_attr(0x36, ea62=0x02, ea63=0x05) == 0x05
    assert resolve_attr(0x76, ea62=0x02, ea63=0x05) == 0x45
    assert resolve_attr(0xB6, ea62=0x02, ea63=0x05) == 0x85
    assert resolve_attr(0x36, ea62=0x02, ea63=0x20) == 0x20


def test_skoolkit_mask_0x3f_must_not_be_applied_to_stored_byte() -> None:
    # Bright green paper (bit 6) is solidity; throwing it away is the old bug.
    stored = resolve_attr(0x64, ea62=0x02, ea63=0x05)
    assert stored == 0x64
    assert stored & 0x40


def test_solidity_is_bit_6_except_exact_0x64() -> None:
    assert is_solid(0x47) is True
    assert is_solid(0x07) is False
    assert is_solid(0x64) is False
    assert is_solid(0x65) is True
    assert is_solid(0x00) is False
    assert is_solid(0xC7) is True  # flash + bright still solid
