# diasurgical-DevilutionX (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/plrctrls.cpp` | Licence: Sustainable Use License 1.0 (LICENSE.md line 1; line 15: "for non-commercial or personal use."; restricted, not OSI; clean-room, shape only) | C++ | symbol `plrctrls_after_check_curs_move` (with `FindRangedTarget`, `FindMeleeTarget`, `InvalidateTargets`)

Checked: read `plrctrls.cpp` 100-180 (`GetRotaryDistance`, `GetDistance`, `GetDistanceRanged`), 200-400 (`FindRangedTarget`, `CanTargetMonster`, `FindMeleeTarget`, `CheckMonstersNearby`), 2243-2280 (per-frame refresh and the retention branch), `track.cpp` 30-60 (`InvalidateTargets`), `monster.cpp` 4846-4850 (`CanTalkToMonst`), `diablo.cpp` 222-246 (`ProcessInput`), 925-935 (main loop), 1523-1530 (`GameLogic`), `engine/path.h` 40-52 (`PathDirs`), `engine/direction.hpp` 11-21, `diablo.h` 64-75, `LICENSE.md` 1-20. Callers: `plrctrls_after_check_curs_move` has one caller (`diablo.cpp` 240, inside `ProcessInput`); `FindActor` one caller (`plrctrls.cpp` 2278); `CheckMonstersNearby` one caller (`FindActor`, 432). Candidates opened: plrctrls.cpp, track.cpp, monster.cpp, diablo.cpp, path.h, direction.hpp (6 files). The hint file `Source/control/control_panel.cpp` is the WRONG file for lock-on: it is panel layout and button drawing (I read its function list only, 838 lines). Not read: the bodies of `FindPath`, `CanStep`, `PosOkPlayer` and `GetDirection`; `game_controls.cpp` 127-141 (grep only: where `ControllerActionHeld` is set); the touch gesture code (`controls/touch/*`, grep only); `automap.cpp` (1964 lines, not read). Confidence: high on the gamepad pick order, the facing gap and the retention rule (read end to end, callers checked); medium on what `ControllerActionHeld` covers (set in game_controls.cpp by grep only). `camera_scope` not applicable (topic is hud-ui; the donor is top-down, not a camera note).

Best transferable idea: pick the lock by a fixed order (hostile before talkable, then fewest walk steps, then smallest facing gap), stop the search at the first hostile's step count, and keep the locked target while a non-attack button is held, dropping it only when it dies, hides or leaves the lit area.

Decision (proposed): adapt — take the pick order and the held-button retention as the Frankendom lock rule, with the donor's defects fixed: a stable final tie-break by monster id, one distance metric, a lock reach limit, and the pick run on the server tick and not on the render loop. Why: many-on-one target choice and a lock frame that does not flicker are exactly the hud-ui gaps; the pick stays engine-side (the hate list chooses the attacker), and the client only draws and sends intent. The donor's re-pick on every attack is kept, so each swing goes to the current best target.
Acceptance: with three attackers around the player, the target frame shows the nearest hostile (not a talkable NPC) and the facing one on a tie; holding a non-attack button (guard or stance) keeps the frame on its target until that enemy dies or leaves view; an attack press re-picks the target for that swing; a server test asserts the struck monster is the one the engine picked for that tick.

## 1. Mechanism

Gamepad only. `plrctrls_after_check_curs_move` runs once per `ProcessInput`, which is called from `GameLogic` (diablo.cpp 1523-1525) and from the main loop when no game tick is due (933). So the pick is refreshed on render frames as well as on ticks; it is not a fixed step.

Order of operations:
(a) Keyboard and mouse, or point-and-click: return (2246-2248). Nothing is picked.
(b) Retention: if a controller action is held (`ControllerActionHeld`, set in game_controls.cpp 127-141, grep only) and the last player action is not None, Attack or Spell (2251), the code calls `InvalidateTargets` (2252) and returns (2257). It does not search monsters on this frame. `InvalidateTargets` (track.cpp 37-58) drops the monster target if it is invalid, has no life, is hidden, or its tile is not lit. There is no distance test. If no target remains, `FindTrigger` runs and nothing else.
(c) Otherwise the target is cleared (2260-2262). The code returns if the player has the invincible flag (2270-2271) or the `DoomFlag` global is set (2273-2274). If the inventory is closed (2276), it runs `FindActor` (2278), then `FindItemOrObject`, then `FindTrigger`.
(d) `FindActor` (429-434): outside town it calls `CheckMonstersNearby` (432). That uses the ranged search if the equipped weapon is ranged or a targeted ranged spell is ready (376-381); otherwise the melee search. In town it sets the target to the last present towner within 2 walking steps (`CheckTownersNearby`, 233-243, read, not receipted).
(e) Candidate filter (`CanTargetMonster`, 256-270): not hidden (258), not a player minion (260), not dead, tile lit (265), and the monster's tile is occupied.
(f) Melee (`FindMeleeTarget`, 304-372): breadth-first search from the player's future tile over the eight neighbours (`PathDirs`, path.h 42), expanding nodes up to 25 steps (307, 337). A neighbour that is not walkable and holds a targetable monster (345) is a candidate. Class rule: a hostile is never displaced by a talkable monster (`CanTalkToMonst`, monster.cpp 4848: goal Inquiring or Talking). Same class: smaller facing gap wins (352; a later candidate with an equal gap replaces the earlier one). The first hostile found sets the cap to its step count (358-359), so farther rings are not expanded.
(g) Ranged (`FindRangedTarget`, 273-302): every candidate is scored by `ExactDistance` to its future tile (165, used at 289) and the facing gap. Class rule as in (f) (287-288). Same class: nearer wins (291-293); equal distance then smaller gap wins (294-295). Equal on both: the later monster in the active list replaces the earlier one.
(h) Facing gap (`GetRotaryDistance`, 112-127): the difference of the `Direction` enum values (eight compass values in circle order, direction.hpp 11-19). Above 4 the value wraps: `4 - (d % 4)` (124), which equals 8 - d. If the destination is the player's own tile the function returns -1 (116-117), so it always sorts first.

Numbers: 8 facings; facing gap 0..4; walk cap 25 steps (307); the retention drops the lock only on dead, hidden, or unlit (track.cpp 41-43; 44 clears the target). No reach limit anywhere.

## 2. Key functions

- `plrctrls_after_check_curs_move`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/controls/plrctrls.cpp` 2243-2280. Retention branch, then the full re-pick.
- `FindMeleeTarget`: plrctrls.cpp 304-372. The BFS, the hostile cap, the facing tie-break.
- `FindRangedTarget`: plrctrls.cpp 273-302. Exact-distance pick with the same class rule.
- `CanTargetMonster`: plrctrls.cpp 256-270. Candidate filter.
- `GetRotaryDistance`: plrctrls.cpp 112-127. Facing gap.
- `InvalidateTargets`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/track.cpp` 37-58. Retention drop rule.
- `CanTalkToMonst`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 4846-4850.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Target class: hostile before talkable | goal Inquiring or Talking = talkable (monster.cpp 4848) |
| Search cap at the first hostile's step count, max 25 | 25 steps (plrctrls.cpp 307); cap set at 359 |
| Facing tie-break, 8 directions, wrap | gap 0..4 (plrctrls.cpp 122-124) |
| Retention while a non-attack button is held | drop on dead, hidden, or unlit (track.cpp 41-43); no reach limit |
| Ranged pick by exact distance | ExactDistance on the future tile (plrctrls.cpp 165) |

Defects (keep the idea, fix the defect):
- Last-wins on a full tie: equal distance (or steps) and equal facing gap give the later candidate (plrctrls.cpp 294-295 and 352-357). The result depends on list order. Fix: lower monster id wins a full tie (the sketch does this).
- Two metrics: walk steps for melee (307-359) and exact distance for ranged (165, 289). The same enemies can rank differently by weapon. Fix: one metric in the engine, chosen once per fight.
- No reach limit: the ranged search (273-302) and the retention (track.cpp 37-58) have no max distance, so a far lit monster can be locked. Fix: a lock-reach data field; drop the lock beyond it.
- Render-loop refresh: the pick runs from the main loop when no tick is due (diablo.cpp 933), so the target can change between ticks. Fix: pick on the server tick only, stamped with the tick number.
- The invincible flag stops all target searching (2270-2271). Whether that is intended is not read. Fix: keep the lock state independent of invulnerability.

## 4. TypeScript sketch

simplified: keeps the donor's melee order (hostile before talkable, first hostile caps the search, facing-gap tie-break) and the retention rule while a non-attack action is held. It omits the ranged search (fixed to walk steps, so there is one metric), the town towner search, multiplayer player targets, the rendering, the mouse path and the search for items and objects. `walkable` stands in for `PosOkPlayer` and `CanStep` (the donor's corner rules are not modelled, so `seen` marks a tile at first sight). The full tie goes to the lower monster id (the donor's last-wins is fixed). The `dirOf` callback replaces `GetDirection`.

```ts
// Licence: Sustainable Use License 1.0 (donor; non-commercial or personal use only; restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

interface Pt { x: number; y: number; }
type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // eight compass values in circle order
interface Mon { id: number; tile: Pt; alive: boolean; visible: boolean; talking: boolean; }
interface Pick { id: number; talking: boolean; steps: number; facingGap: number; }
type Action = "none" | "walk" | "spell" | "spellMonsterTarget" | "attack" | "attackMonsterTarget" | "operate";

const MAX_STEPS = 25;  // data: walk search cap (donor maxSteps = 25)
const STEP: Pt[] = [
  { x: -1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: -1 }, { x: 1, y: 1 },
  { x: -1, y: 0 }, { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 },
];
// donor: retention applies unless the last action is None, Attack or Spell
const NOT_RETAINED: ReadonlySet<Action> = new Set<Action>(["none", "spell", "attack"]);

const key = (p: Pt): string => `${p.x},${p.y}`;

// Facing gap around the eight directions, 0..4. Donor 4 - (d % 4) equals 8 - d for d > 4.
function facingGap(facing: Dir, toward: Dir): number {
  const d = Math.abs(facing - toward);
  return d > 4 ? 8 - d : d;
}

// Melee pick: hostile before talkable; then fewer steps; then smaller facing gap.
// fix: a full tie goes to the lower monster id (donor: the later candidate replaces the earlier one).
function pickMelee(me: Pt, facing: Dir, walkable: (p: Pt) => boolean, mons: Mon[], dirOf: (from: Pt, to: Pt) => Dir): Pick | null {
  const atTile = new Map<string, Mon>();
  for (const m of mons) if (m.alive && m.visible) atTile.set(key(m.tile), m);

  const seen = new Set<string>([key(me)]);
  const queue: { p: Pt; steps: number }[] = [{ p: me, steps: 0 }];
  let best: Pick | null = null;
  let cap = MAX_STEPS;

  for (let i = 0; i < queue.length; i++) {
    const node = queue[i];
    for (const d of STEP) {
      const np: Pt = { x: node.p.x + d.x, y: node.p.y + d.y };
      const k = key(np);
      if (seen.has(k)) continue;
      seen.add(k);
      if (node.steps > cap) continue;
      if (!walkable(np)) {
        const m = atTile.get(k);
        if (m === undefined) continue;
        const gap = facingGap(facing, dirOf(me, np));
        if (best !== null && !best.talking && m.talking) continue;               // hostile is never displaced by talkable
        if (best !== null && best.talking === m.talking && best.facingGap < gap) continue;
        if (best !== null && best.talking === m.talking && best.facingGap === gap && best.id < m.id) continue;
        best = { id: m.id, talking: m.talking, steps: node.steps, facingGap: gap };
        if (!m.talking) cap = node.steps; // first hostile caps the search at its step count
        continue;
      }
      queue.push({ p: np, steps: node.steps + 1 });
    }
  }
  return best;
}

// Per frame. While a non-attack button is held, keep the lock and drop it only if the monster is dead, hidden or unlit.
// Otherwise re-pick every frame (donor clears the target before each search).
function refreshLock(prevId: number | null, buttonHeld: boolean, last: Action, mons: Mon[], search: () => Pick | null): number | null {
  if (buttonHeld && !NOT_RETAINED.has(last)) {
    if (prevId === null) return null;
    const m = mons.find(x => x.id === prevId);
    return m !== undefined && m.alive && m.visible ? prevId : null; // no distance check, as in the donor
  }
  const pick = search();
  return pick === null ? null : pick.id;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/HU014-devil-lock.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/target-pick.ts` (new, engine: the candidate pick over the hate list, the class rule and the retention rule; the client draws the lock frame and sends intent only). The donor pick is client-side; Frankendom's pick must be validated by the engine.
- Parity-checklist row 14 (HUD: target frame).
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, non-commercial only; clean-room, shape only)
- Brief rule served: rule 1 (one engine; the pick and hate list are engine-side; the HUD is client-only); hud-ui fold-ins: lock-on forgiveness, target frame, input

## 6. Gaps and risks

- Licence is restricted: non-commercial or personal use only (LICENSE.md 15-16). Use the idea only; no code, no wording copied.
- The donor is top-down with facing from the sprite direction. A third-person camera needs facing from the camera yaw relative to the character; not read here, and the owner's camera complaint bears on it.
- Walk-step BFS per frame is cheap in a 25-step tile grid; on a 3D zone the equivalent is a bounded grid or a distance check. The cap of 25 is a tile-grid number and needs converting to metres.
- `MAX_ATTACKERS = 3`: the pick only chooses the lock. The attackers themselves come from the engine's roster (the hate list), not from the aim. The donor has one target and no roster.
- Retention with no reach limit (track.cpp 37-58) would let a far enemy stay locked in a zone; the donor has no zone boundary to rely on.
- The server must validate every hit against the engine's chosen target at the tick; the client pick is intent only, and kills stay server-verified.
- Multiplayer player targets (`CheckPlayerNearby`, plrctrls.cpp 384-) were not read.
- Touch UX: `controls/touch/` holds the virtual gamepad (event_handlers.cpp 405 lines, renderers.cpp 625 lines, gamepad.cpp 278 lines). The target is drawn from `pcursmonst` (renderers.cpp 445-453, partly read). Gesture thresholds (long-press, drag) were not read.
- Minimap and world map: `automap.cpp` (1964 lines) and `engine/render/automap_render.cpp` exist; not read.
- Control panel (hint file): `control/control_panel.cpp` (838 lines) holds the panel layout, belt size (line 100), the panel hotkey labels (120: `'c'`, `'q'`, Tab, Esc, `'i'`, `'b'`, Enter), the level-up button (221) and the character panel toggle (301-324). Not a lock-on source; the draw code was not read.
- String tables and localisation: `Translations/devilutionx.pot` has about 2,189 `msgid` entries (grep count), 279 with `msgctxt` and 9 with `msgid_plural`; `de.po` has the same count of `msgid` lines. The placeholders are `%s` and `%i` (glossary.md, read). Grammar: placeholders are filled inside the string; plural forms are chosen by `msgid_plural`; `msgctxt` separates identical sources. I did not read the `.po` headers or fuzzy flags.
- Accessibility: the panel hotkey labels (120) are the only accessibility-relevant text read. The rest was not read.
- Where seen: idle and death presentation, boss intro and max enemies per frame were not read in this donor.

Reuse tag: rewrite-from-idea (Sustainable Use License 1.0, non-commercial only; clean-room, shape only)
Brief rule served: rule 1 (one engine; the pick and hate list are engine-side; the HUD is client-only); hud-ui fold-ins: lock-on forgiveness, target frame, input
