"""ZX Spectrum palette matching SkoolKit's ImageWriter defaults."""

# Indices 0-7: ink/paper without BRIGHT. Values from skoolkit.image.ImageWriter.
SPECTRUM = (
    (0, 0, 0),
    (0, 0, 197),
    (197, 0, 0),
    (197, 0, 197),
    (0, 198, 0),
    (0, 198, 197),
    (197, 198, 0),
    (205, 198, 205),
)

BRIGHT = (
    (0, 0, 0),
    (0, 0, 255),
    (255, 0, 0),
    (255, 0, 255),
    (0, 255, 0),
    (0, 255, 255),
    (255, 255, 0),
    (255, 255, 255),
)


def attr_paper_ink(attr: int) -> tuple[tuple[int, int, int], tuple[int, int, int]]:
    """Return (paper, ink) RGB triples for a Spectrum attribute byte."""
    ink_i = attr & 7
    paper_i = (attr >> 3) & 7
    table = BRIGHT if attr & 0x40 else SPECTRUM
    return table[paper_i], table[ink_i]
