# Hex

| | |
| --- | --- |
| a hex as a coordinate | `hex.js` |
| a hex as a position on screen | `game/ui/board/hex/hex-screen.js` |
| how big it is drawn, and its inks | `game/ui/board/hex/hex-config.js` |
| how it looks | `game/ui/board/hex/hex.css` |
| tests | `hex.test.js`, `game/ui/board/hex/hex-screen.test.js` |

## Changing how hexes look

Size is one row per board in `hex-config.js` — every mark on that board scales with it.
Colour is `hex.css`. The two renderers that cannot use the `.hex` class — the
string-built map thumbnails and the editor's ghost hex — read those same vars back
through `HEX_CONFIG.ink`, so a colour is still written once.
