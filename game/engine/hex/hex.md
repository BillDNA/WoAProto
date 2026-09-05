# Hex

The bottom of the vocabulary. A hex names nothing else; everything else names a hex.

| | |
| --- | --- |
| a hex as a coordinate | `hex.js` |
| a hex as a position on screen | `game/ui/hex/hex-screen.js` |
| tests | `hex.test.js`, `game/ui/hex/hex-screen.test.js` |

## The encoding

Pointy-top axial. A hex **is** its key, the string `'q,r'` — state keys, map data
and log lines all spell it that way, and `key` / `parseKey` are the only place
that spelling is written.

The six directions are an **order**, not a set: `d` is an index into `DIRS` and
into `DIR_NAMES` (`E NE NW W SW SE`), and a side key stores that index. Rotating
the list renumbers every map file.

An **edge** is the border between two hexes, named the same from either end
(`edgeKey`). A **side** is one hex's face of that border, `sideKey(hex, dir)` =
`'q,r>d'` — the two hexes on a border own their faces separately, so anything
sitting on a border is stored per side (see `docs/HexClarificationDiagram.png`).
`facingSide` crosses to the other face.

## Six neighbours, and which of them exist

`step(hex, dir)` is the coordinate one step away, on a board or not: in the
abstract a hex always has six neighbours. **Which of them exist is the board's
outline question**, so the on-board filter and the per-shape neighbour cache are
`game/engine/02-board.js`'s (`neighbor`, `neighbors`), written over `step`.

## Two dialects

The screen asks the same questions in pixels: where a hex's centre is, where the
two ends of one of its faces are, and at what scale. It derives every answer from
the engine's keys and `DIRS` rather than parsing them again, so a hex's identity
and the meaning of a direction are each spelled once for the whole game.

`S` is the live board's hex size; every helper takes an optional scale, which is
the only thing that differs between the live board, the manual's mini-board, the
editor and the map thumbnails.
