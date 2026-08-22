# Add scriptable symmetry pattern language

Cayley PR #2 added a first scriptable 2D pattern layer rather than hard-coding decorative tilings.

What was implemented:

- dependency-free `.pattern` parser producing a plain affine-geometry IR
- SVG renderer with viewport-bounded group-orbit enumeration
- readable motif/turtle commands, including curved left/right pieces inspired by Danny Calegari's “Laying train tracks” PostScript example
- explicit translate/rotate/reflect/glide group generators
- initial Conway orbifold shorthand for `o`, `2222`, `442`, `*442`, `333`, `*333`, `632`, and `*632`
- responsive live editor in `Pattern.html`
- Calegari-track and Conway `*442` examples
- selected Group Explorer groups feeding the same pattern IR
- notes separating planar symmetry from a future weaving/knitting frontend

Validation included affine transform identities, both example files, Conway shorthand behavior, repository group fixtures, generated `.pattern` source, orbit enumeration, SVG rendering, and negative cases for unsupported faithful planar actions.

Future work noted in the PR:

- fill out the remaining Conway wallpaper shorthand rather than faking unsupported symbols
- decide how 3D/projected/non-faithful actions should be represented for finite groups beyond cyclic/dihedral
- design the higher-level weave frontend and crossing semantics separately from the geometry core
