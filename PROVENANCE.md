# Provenance

## Cayley pattern-language prototype

The initial Conway-language draft and examples in this repository come from:

- repository: `isomorphisms/Cayley`
- branch: `scriptable-symmetry-patterns`
- pull request: #2, **Add scriptable symmetry pattern language**
- snapshot commit: `778330fdbdfeb595bf1fdd021517a1f5298df243`

The architectural split is motif construction → affine group action → rendering. Conway orbifold notation is a shorthand compiler into ordinary Euclidean isometries.

`isomorphisms/Cayley` is a fork of Nathan Carter's `nathancarter/group-explorer`. The upstream Group Explorer README identifies the project as LGPL v3 and credits Ray Ellis with most of the web version and Nathan Carter with the original version and later web work. Material copied from that codebase retains its source history and applicable upstream terms; putting a copy here is not intended to erase attribution or silently relicense inherited work.

The language note and `.pattern` examples are copied here so Conway can evolve independently. Implementation files that remain Cayley-specific are linked from `boilerplate/archive/cayley-pr2/README.md` at the exact snapshot commit.

## New Conway material

Files written specifically for this repository should remain distinguishable from the archived prototype until a deliberate repository-wide licensing decision is made.
