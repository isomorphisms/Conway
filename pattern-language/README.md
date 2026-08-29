# Pattern language

[`pattern.mjs`](pattern.mjs) is the dependency-free command-line implementation for
repeatable 2D geometry. A `.pattern` file is intentionally not JavaScript. The
parser lowers it to plain affine geometry, and the renderer writes SVG.

From the repository root, run a checked-in example with:

```sh
node pattern-language/pattern.mjs pattern-language/examples/conway-442.pattern conway-442.svg
```

The earlier `Pattern.html` / `js/PatternLanguage.js` live-editor prototype remains
identified by the exact Cayley source commit under
[`../boilerplate/archive/cayley-pr2/`](../boilerplate/archive/cayley-pr2/); it
is not required to execute the Conway examples.

That separation is the important part: another language can generate the same
IR without reproducing the group enumeration or rendering code. The current
language inputs are collected under [`examples/`](examples/); the earlier live
editor prototype is retained under
[`../boilerplate/archive/`](../boilerplate/archive/).

## Why this shape?

Danny Calegari's 2011 post
[Laying train tracks](https://lamington.wordpress.com/2011/12/02/laying-train-tracks/)
uses a short PostScript program in which `L` and `R` both draw one track piece
and update the current coordinate system. Long tracks are therefore programs
made by composing geometric actions.

The pattern language keeps that idea, but separates:

1. **motif construction** — paths, circles, turtle motion, curved turns;
2. **group action** — named Euclidean isometry generators;
3. **rendering** — enumerate the orbit only far enough to cover the viewport.

This is also a useful seam for Conway orbifold notation: a Conway symbol can
compile to ordinary isometry generators instead of requiring special rendering
code for every wallpaper group.

## A complete example

```text
canvas 720 720
viewport -360 -360 360 360
background #f8f6ee
stroke #252a2e 2

motif seed
    move 8 8
    line 34 8
    arc_left 13 90
    line 21 34
    circle 15 15 3
end

orbifold *442 84
orbit seed
```

`orbifold *442 84` is shorthand for square translations, a quarter turn, and a
mirror. `orbit seed` applies the generated group until the viewport is covered.

## Motif commands

Inside `motif NAME` ... `end`:

- `move x y` or `jump x y`
- `line x y`
- `segment x1 y1 x2 y2`
- `forward distance`
- `heading degrees`
- `left degrees` / `right degrees`
- `arc_left radius degrees` / `arc_right radius degrees`
- `circle x y radius`
- `pen_up` / `pen_down`
- `stroke color width`
- `fill color`
- `close`

Coordinates are mathematical: positive `y` points upward.

## Group commands

The general form does not depend on Conway notation:

```text
generator east translate 80 0
generator north translate 0 80
generator quarter_turn rotate 90
generator mirror reflect 0 0 1 0
generator glide glide 0 0 1 0 40
```

Every named generator is automatically used in both directions. `orbit NAME`
enumerates words in those generators, deduplicates equal affine transforms, and
keeps copies intersecting the viewport.

`lattice ux uy vx vy` is a readable shortcut for two translation generators.

The first Conway shorthands are:

- `o`
- `2222`
- `442`
- `*442`
- `333`
- `*333`
- `632`
- `*632`

The missing wallpaper symbols are deliberately not faked. They can already be
written with explicit generators, including glide reflections, and can later be
added to the shorthand compiler.

## Weaving and knitting

Planar symmetry and textile fabrication should not be one language layer.

A future weave frontend should add material concepts such as warp, weft,
crossings, over/under order, floats, and layers, then compile those concepts to
this geometric IR for visualization. A fabrication backend can separately
target loom/knitting representations.

Useful existing precedents:

- [AdaCAD](https://adacad.org/) treats weave design as composable parametric
  operations/dataflows.
- [knitout](https://textiles-lab.github.io/knitout/) is intentionally a
  low-level machine-neutral knitting instruction format.
- [Context Free](https://github.com/MtnViewJohn/context-free) demonstrates how
  a very small grammar plus transformations can generate rich 2D images.

Those are better models to learn from than making the browser's JavaScript
syntax itself the pattern model.
