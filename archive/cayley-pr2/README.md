# Cayley PR #2 archive

Source snapshot: `isomorphisms/Cayley@778330fdbdfeb595bf1fdd021517a1f5298df243`, PR #2, **Add scriptable symmetry pattern language**.

The language note and examples have been copied into Conway under `docs/` and `examples/`.

The larger implementation remains directly inspectable at the exact source commit so its Group Explorer inheritance stays obvious:

- `js/PatternLanguage.js` — parser, affine IR, Conway shorthand, orbit enumeration, SVG renderer
- `Pattern.html` and `Pattern.js` — live editor
- `js/GroupPattern.js` — Cayley/Group Explorer integration bridge
- `tests/pattern.test.mjs` — parser, affine, group-recognition, and renderer tests
- `.github/workflows/pattern-tests.yml` — CI for the prototype

Source tree:
https://github.com/isomorphisms/Cayley/tree/778330fdbdfeb595bf1fdd021517a1f5298df243

This directory is an archival pointer, not an attempt to detach inherited Group Explorer code from its LGPL v3 provenance.
