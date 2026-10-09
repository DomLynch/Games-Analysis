# Games-Analysis

Phase 2 deep-read notes on open-source donor games for Frankendom: 218 notes (one per strong cell of a 124-game x 20-topic matrix), plus the audits, a per-game feature inventory, and design-intent research.

- `deep/<category>/<game>.deep.md`: mechanism, key functions with line ranges, numbers, a clean-room TypeScript sketch, where it lands in Frankendom, gaps. Corrected three times against the donor code; a final independent audit of 40 random notes: 34 clean, 4 minor, 2 wrong (all fixed). About 9,900 quoted donor lines were machine-checked against the source (0 failed) and all sketches typecheck.
- `docs/`: handoff, briefs, audit results, ratings spot check, feature inventory (`docs/analysis/inventory`), design-intent briefs (`docs/analysis/intent`).
- `gate/`: the mechanical checkers.

Known limits: the ~2,260 partial/none ratings were mostly never read (a spot check found about a third hide a usable mechanism). Donor code is not stored here; sketches are clean-room.
