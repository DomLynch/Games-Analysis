# 0ad-0ad (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/gui/session/selection_details.js` | Licence: GPL-2.0-or-later (root LICENSE.txt: "binaries/data/ GPL version 2 (or later) - see license_gpl-2.0.txt"; the JS file has no licence header of its own) | JavaScript | symbol `displayMultiple`

Checked: Read in full: `selection_details.js` 1-150 (layoutSelection*, updateGarrisonHealthBar, start of displaySingle), 371-496 (displayMultiple), 499-542 (updateSelectionDetails); `gui/common/tooltips.js` 167-189 (health and capture tooltips). Read in part: `input.js` 945-958 (camera follow release); lines 1244, 1287, 1294 by grep only. XML layout (data half): `selection_panels_middle/multiple_details_area.xml` 25 and 28, `selection_panels_left/garrison_panel.xml` 15, by grep only. String catalogue counts by grep (see section 6). Not read: `selection_details.js` 151-370 (the rest of displaySingle) and 543-582 (trading tooltips); `minimap/MiniMap.js`; the simulation side that produces `hitpoints` (the `GetEntityState` source). Confidence: high on the group bar and the single/group switch; medium on the garrison bar (its intent is not commented; I read the code, not a design note). camera_scope: n/a.

Best transferable idea: Summarise a group as one bar, the sum of current HP over the sum of max HP, clamped, with a count, and hide it when no member has HP.
Decision (proposed): adapt - the one-bar group summary is what Frankendom's many-on-one fight needs (for the attack set of up to MAX_ATTACKERS = 3), but the donor sums the player's own selection, not the enemies on the hero, and its weighting by max HP is a choice we must make on purpose; the capture bar and carried or loot totals do not apply to a duel and are rejected.
Acceptance: With three enemies attacking the hero, a group bar and a "3" count sit above their frame; when one dies the bar drops by that enemy's share of the total HP, and a test over the engine's attack set asserts the frame value equals sum(hp) / sum(maxHp) for the same three entities.

## 1. Mechanism

- Entry point `updateSelectionDetails` (499-542): it collects the entity state of each selected entity (507-513). With none, it hides the panels (515-525). With exactly one it calls `displaySingle` (528-529); with two or more it calls `displayMultiple` (530-531). It then shows the details panel (534), fills the command panel (537), and, only if the garrison panel is open, updates the garrison bar (540-541).
- `displayMultiple` (371-496) makes one pass over the states (382-416). Health: it adds `hitpoints` and `maxHitpoints` only for entities whose `hitpoints` is truthy (385-389). Capture points are summed per player (390-394). Carried resources and loot are summed per type (396-409). Garrison slots are summed from `garrisonable.size` and `garrisonHolder.occupiedSlots` (411-415).
- Order of steps for the health bar: if the summed HP is 0 or less, hide it (418). Otherwise set the bar's fill to `clamp(sumHP / sumMaxHP, 0, 1)` (423). The bar is a GUI object whose top edge moves down by `100 - 100 x fraction` percent (`rtop`), so the visible part fills from the bottom. The tooltip is `Health: current / max` (426-429). The unit count is `entStates.length` (466).
- Capture bars (432-463): each player's band is `clamp(points_p / maxCapture)` (441). Non-owners are drawn first, each band starting where the last one ended (450-452), and the owner's band last at the bottom (454-455). This is a stacked bar, not an average.
- Garrison bar (`updateGarrisonHealthBar`, 14-49): it returns at once unless the first selected entity has a `garrisonHolder` (16-17). It then sums `hitpoints` and `maxHitpoints` over every unit inside every selected holder (22-31), hides the bar when the total is 0 or less (36), and sets the fill to `clamp(total / max)` (41).
- Text: the single panel caption shows `ceil(hitpoints) / ceil(maxHitpoints)` (141-144). The tooltip helper returns an empty string when there is no max (169-170) and shows `Math.round` of both numbers (172-176).
- Tick: none. This is a display recomputed each time the selection changes or the GUI updates; no timing, no accumulator, no sim tick.

## 2. Key functions

- `displayMultiple` 371-496 (group health sum, group bar, count, capture stack, carried and loot totals).
- `updateSelectionDetails` 499-542 (the switch between single and group, and the garrison call).
- `updateGarrisonHealthBar` 14-49 (garrison aggregate; gated on the first selected entity).
- `getCurrentHealthTooltip` in `gui/common/tooltips.js` 167-177 (the "current / max" text; returns empty when max is 0).
- `input.js` 954-955 (camera follow is released when a different entity is clicked): the closest thing to a lock-on in what I read.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Group HP is the sum of current over the sum of max, clamped to 0..1 | Clamp range 0..1 (theirs, 423); the bar's fill is driven by `rtop = 100 - 100 x fraction` (theirs, 423) |
| Members with no HP do not count | Truthy check on `hitpoints` (theirs, 385) |
| Hide the group bar when nothing is left | `<= 0` (theirs, 418) |
| Single versus group switch | Count of one (theirs, 528) |
| Count shown beside the bar | `entStates.length` (theirs, 466) |
| Capture-style stacked bands, owner last | Owner band drawn last (theirs, 454-455) |
| Rounding of shown HP | `Math.ceil` in the single-unit caption (theirs, 142); `Math.round` in the group and garrison tooltip (theirs, tooltips.js 174, used at selection_details.js 44 and 426) |

Defect and oddities, each with a fix:
- Rounding inconsistency: the single-unit caption uses `Math.ceil` (142), while the group and garrison tooltips use `Math.round` (tooltips.js 174). A living unit at 0.4 HP reads "1" in the single caption and "0" in a group tooltip. Fix: one rounding helper for every panel, ceil for a living unit with more than 0 HP. (Whether the single panel's own tooltip uses this helper was not read, lines 151-370.)
- Misnamed variable: `averageHealth` (373, 387) is a sum, not an average. The bar is sum over sum. Fix: rename it; if an average is wanted, use the mean option in the sketch.
- Order-dependent garrison gate: the garrison bar only appears when the first selected entity is a holder (16-17, called with `entStates[0]` at 541), but it then sums every selected holder (22-31). Whether that is intended is not stated in the code (not read further). Fix for Frankendom: make any group summary order-free (sum over the whole set, gated on the set, not on the first member).
- Sum-of-max weighting: a unit with a large max HP moves the bar more than a small one (a 500-HP brute outweighs a 50-HP imp). This is a design choice, not a bug. Fix: offer both, as in the sketch.

## 4. TypeScript sketch

simplified: keeps the donor's group rule: sum current HP and sum max HP over members whose HP is truthy, clamp the ratio to 0..1, hide when no HP remains, and report the member count. It omits the GUI writes (`rtop`, tooltips, visibility), the capture bands, the carried and loot totals, the garrison gate on the first entity, and the single-versus-group switch. It adds two things the donor does not have: a guard for max HP of 0 (hardening, not an observed case), and an equal-weight mean option.

```ts
// Licence: GPL-2.0-or-later (donor, binaries/data). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface GroupMember {
  hitpoints: number;
  maxHitpoints: number;
}

export interface GroupHealth {
  fraction: number; // 0..1, width of the group bar
  count: number;    // number of members, shown as a number beside the bar
  hidden: boolean;  // no bar when nobody in the group has hit points
}

const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));

// Ratio of sums: a member with more max HP moves the bar more.
export function groupHealthBySum(members: GroupMember[]): GroupHealth {
  let hp = 0;
  let maxHp = 0;
  for (const m of members) {
    if (m.hitpoints) {            // members without hit points do not count
      hp += m.hitpoints;
      maxHp += m.maxHitpoints;
    }
  }
  const hidden = hp <= 0;
  const fraction = hidden || maxHp <= 0 ? 0 : clamp01(hp / maxHp); // guard for max 0 (not in donor)
  return { fraction, count: members.length, hidden };
}

// Equal-weight option the donor does not have: mean of each member's own ratio.
export function groupHealthByMean(members: GroupMember[]): GroupHealth {
  let sum = 0;
  let n = 0;
  for (const m of members) {
    if (m.hitpoints && m.maxHitpoints > 0) {
      sum += clamp01(m.hitpoints / m.maxHitpoints);
      n += 1;
    }
  }
  const hidden = n === 0;
  return { fraction: hidden ? 0 : sum / n, count: members.length, hidden };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/hud.ts` (proposed; Frankendom's current HUD file was not read). A group frame for the attack set; client-only, numbers from the engine's attack set.
- Parity-checklist row 14 (HUD).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 14 (HUD, client-only); MAX_ATTACKERS = 3 (the group is the attack set, read from the engine).

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. The sketch is written from the mechanism.
- Direction is reversed: the donor summarises the player's own selection; Frankendom needs the enemies on the hero. The set must come from the engine's hate or attacker list, never from the client's own guess.
- Kills are server-verified: a dead attacker must leave the group only when the engine says so; the client must not drop a member on its own timer.
- Weighting is a design choice (sum-over-max favours big units). Pick one on purpose and test it.
- Capture bars and carried or loot totals do not transfer (no capture point or carried stack in the duel). Reject.
- The rounding mismatch, the misnamed sum and the order-dependent garrison gate are described in section 3 with fixes.
- Not read: `displaySingle` 151-370, `selection_details.js` 543-582, `minimap/MiniMap.js`, and the simulation source of `hitpoints`.

Also seen (hud-ui fold-ins; checked by reading or by grep, not separate notes):
- Minimap and world map: `gui/session/minimap/` holds `MiniMap.js`, `MiniMapPanel.js` and button scripts; `MiniMap.js` itself was not read. No world-map screen was looked for beyond this folder.
- Touch UX: none found in what I read (this is a desktop RTS; I did not search the whole donor for touch code).
- Input buffer: a held hotkey buffers orders. `input.js` 1244 reads `session.queue` into a `queued` flag. The comment at 1287-1289 says a held queue key adds the order to the unit's order queue "instead of running it immediately", and a held push-front key executes the order at once and continues the queue afterwards. Lines 1290-1295 were read; the queue itself lives in the simulation, not read. Lock-on forgiveness: none found; the only follow-release is `input.js` 954-955, which releases the camera follow when a different entity is clicked.
- String table (grammar, no quotes): the public mod's l10n folder has 1960 files, including 16 `.pot` templates (for example `public-gui-ingame.pot`, 370 msgid lines, where some msgid lines are multi-line starts). The English `en_GB` catalogue has 56 `msgctxt` and 20 `msgid_plural` lines in that ingame file. `binaries/data/l10n` has 122 `.po` files plus `engine.pot` and `messages.json`. Strings are gettext catalogues; the GUI calls `translate` for plain text, `translateWithContext` with a context word such as "Rank" (line 85), and `sprintf` with named placeholders such as `%(hitpoints)s` (141). `translateWithContext`'s definition was not found in `gui/common` and was not read.
- Accessibility: none found in what I read.
- Idle or ambient animation, death presentation, boss staging and readability at 375 wide: not read here.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 14 (HUD, client-only); MAX_ATTACKERS = 3 (the group is the engine's attack set)
