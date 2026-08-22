# Conway

Experimental language and rendering playground for planar symmetry, Conway orbifold notation, and patterned geometry.

This repository starts by separating material that previously lived inside the Cayley / Group Explorer experiment:

- language and parser prototypes
- `.pattern` examples
- design notes
- a gallery of pattern renders
- rights-checked references

## Start here

- `docs/language-draft.md` — current language draft
- `examples/` — small scripts
- `gallery/` — pattern images and reproducible SVG examples
- `archive/cayley-pr2/` — provenance and design snapshot of the original Cayley prototype
- `PROVENANCE.md` — where copied material came from
- `references/README.md` — books and other source material, with redistribution status

The language is intentionally split into motif construction, group action, and rendering. Conway orbifold symbols are shorthand that compile to ordinary affine isometries rather than renderer-specific magic.

## Licensing status

No new repository-wide license is asserted by this bootstrap. Material copied from Cayley / Group Explorer retains its existing provenance and applicable license. Third-party books or articles are copied only when redistribution permission is explicit; otherwise this repository records a reference instead of importing the text.
