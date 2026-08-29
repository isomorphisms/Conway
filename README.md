# Conway

A pattern language for planar symmetry, with rendered wallpapers in Conway orbifold notation.

- **[Pattern language](pattern-language/)** — the language draft, examples, and mathematical references
- **[Wallpapers](wallpapers/)** — the rendered SVGs and the Idriç wallpaper source

## Wallpapers

| `o` | `2222` |
| --- | --- |
| [![o wallpaper](wallpapers/o.svg)](wallpapers/o.svg) | [![2222 wallpaper](wallpapers/2222.svg)](wallpapers/2222.svg) |
| `333` | `*333` |
| [![333 wallpaper](wallpapers/333.svg)](wallpapers/333.svg) | [![star 333 wallpaper](wallpapers/star-333.svg)](wallpapers/star-333.svg) |
| `442` | `*442` |
| [![442 wallpaper](wallpapers/442.svg)](wallpapers/442.svg) | [![star 442 wallpaper](wallpapers/star-442.svg)](wallpapers/star-442.svg) |
| `632` | `*632` |
| [![632 wallpaper](wallpapers/632.svg)](wallpapers/632.svg) | [![star 632 wallpaper](wallpapers/star-632.svg)](wallpapers/star-632.svg) |

The language separates motif construction, symmetry-group action, and rendering. Conway symbols compile to ordinary affine isometries instead of hiding special cases in the renderer.

## Run the pattern examples

The `.pattern` examples are executable with Node.js 22 or newer and need no npm dependencies:

```sh
node pattern-language/pattern.mjs pattern-language/examples/conway-442.pattern conway-442.svg
node pattern-language/pattern.mjs pattern-language/examples/calegari-tracks.pattern > calegari-tracks.svg
```

Run the parser, transform, renderer, and all-example checks with:

```sh
node --test pattern-language/tests/pattern.test.mjs
```

CI runs the same tests whenever the language, runner, or examples change.

The Android, F-Droid, Fastlane, build, migration, and archived prototype material is collected under [`boilerplate/`](boilerplate/). Source history and licensing are recorded in [`PROVENANCE.md`](PROVENANCE.md), [`LICENSE`](LICENSE), and [`boilerplate/third-party.md`](boilerplate/third-party.md).
