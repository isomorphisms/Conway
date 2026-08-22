# Migration notes from Cayley

Cayley PR #2 mixed two separable concerns:

1. a small language for motifs, Euclidean isometries, Conway orbifold shorthand, orbit enumeration, and SVG rendering;
2. a Group Explorer bridge that recognizes selected finite groups and turns them into editable pattern programs.

Conway should own the first concern. Cayley can consume Conway later through a stable IR or compiler interface.

## Pieces worth preserving

- `PatternLanguage.js`: parser, affine transforms, Conway shorthand, orbit enumeration, SVG output.
- `Pattern.html` + `Pattern.js`: live editing experiment.
- `.pattern` examples: concrete syntax experiments.
- tests: affine identities, parser behavior, shorthands, end-to-end rendering.
- `GroupPattern.js`: useful as an integration example, but conceptually on the Cayley side of the boundary.

## Current supported Conway shorthands

`o`, `2222`, `442`, `*442`, `333`, `*333`, `632`, `*632`.

The missing wallpaper symbols are intentionally not fabricated. The general generator syntax can represent translations, rotations, reflections, and glide reflections while shorthand coverage expands.

## Direction

Keep at least three layers distinct:

- **motif language**: what gets drawn;
- **symmetry language**: what transformations act on it;
- **renderer/fabricator**: SVG today, potentially weaving/knitting/CAD or other outputs later.

A higher-level Conway language can change syntax freely as long as it can lower to a small explicit geometric IR.
