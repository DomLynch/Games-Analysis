# beyond-all-reason-Beyond-All-Reason (hud-ui, cell 3)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luaui/Widgets/gui_healthbars_gl4.lua` (the listed hint, `luarules/gadgets/unit_healthbars_widget_forwarding.lua`, is the synced forwarder that sends capture, EMP, reload and reclaim events to the widget; read as a candidate, not the implementation) | Licence: GNU GPL v2 (widget header line 9, `license = "GNU GPL v2"`; repo `LICENSE.md` line 2: "BAR game code is released under the GPL v2 licence"; forwarder header: "GNU GPL, v2 or later") | Lua (Spring/Recoil widget API, with a GL4 shader path) | symbols `widget:GameFrame`, `addBarForUnit`, `addBarsForUnit`, `barTypeMap`

Checked: `gui_healthbars_gl4.lua` read in these parts: header and design notes (1-110), the bar type table and its loop (119-328), `addBarForUnit` and `updateReloadBar` (659-741), `removeBarFromUnit` (748-757), `addBarsForUnit` (759-843), the paralysis handler (1040-1057), `widget:GameFrame` (1222-1340), `widget:DrawScreenEffects` (1395-1472), and the shader config block (466-500). The forwarder read in full for its header and the top of its synced branch (lines 1-25). Not read: feature bar functions (861-944), `init` and `initfeaturebars` (945-1015), the reclaim-start and capture-start callins (1016-1038), the projectile reload callin (1059-1064), `Initialize` and `Shutdown` (1072-1126), the visible-unit callins and `VisibleUnitsChanged` (1149-1179), `PlayerChanged` (1180-1221), `FeatureCreated` and `FeatureDestroyed` (1343-1394), and the GLSL shader sources (their paths are set in the widget, but the source was not located on the paths I searched: `luaui`, `common`, `luarules`, `modelmaterials_gl4`; a grep of those found the hide thresholds only in the widget table). Confidence: high on the Lua bar bookkeeping and the watch schedule, which I read end to end; not read on the GPU half (colour blend, hide-at-threshold, glyph text). `depth` is therefore thin. `camera_scope`: not a camera cell; the distance uniforms are tagged as HUD. The `hidethreshold` values are in the table but are not applied anywhere in the Lua I read.

## 1. Mechanism

- A bar is one instance row keyed `unitID .. "_" .. barname` (`addBarForUnit` 677). Bar kinds are data: `barTypeMap` (119-328) gives each kind a colour at value 0 and at value 1, a hide fraction, the uniform slot where the value lives, a glyph offset and a bit mask (overlay, glyph, percent, time left, integer, progress, flash, colour correct).
- Attach rules (`addBarsForUnit` 759-843), in order:
  (1) health bar, if the unit is visible to you: `fullview`, or same ally team, or the unit's def has no `hideDamage` flag (774; the flag is set at 542).
  (2) shield bar for units with a shield or reactive armour (784-796).
  (3) reload bar, only while the primary weapon is reloading (`updateReloadBar` 727-741; the test at 736).
  (4) building bar while build progress is below 1 (801).
  (5) stockpile bar for your own team or full view (811).
  (6) capture bar while capture progress is above 0 (815).
  (7) paralysis: if the unit is stunned, a timed "paralyzed" bar; if not, an "emp_damage" bar (822-838).
- Placement: bar height = unit height + `additionalheightaboveunit` (24) x `effectiveScale` (710; the constant at 419). `effectiveScale` is the unit size multiplier when `variableBarSizes` is on (true, 398), times `barScale` (1, 397), at 706.
- Value upkeep is not per frame. `widget:GameFrame` (1222-1340) runs five watch lists, each on its own frame phase:
  shield on `n % 3 == 0` (1229); EMP on `(n + 1) % 3 == 0` (1266), which is `n % 3 == 2`; paralysis on `(n + 2) % 3 == 0` (1283), which is `n % 3 == 1`; capture on `(n % 3) == 2` (1307); stockpile on `(n % 5) == 2` (1323).
  On its frame, a watch reads the engine value. Shield, EMP, capture and stockpile call `gl.SetUnitBufferUniforms` only if the value changed (1235, 1269, 1310, 1326). The paralysis watch does not compare: while a unit is stunned it uploads on every poll (1283-1295). Shield is normalised by the unit's shield capacity (1239). Reload start and end are written whenever the reload is updated (741).
- Removal: a bar is removed when its condition ends. Shield on nil (1237), EMP when the paralyse damage returns to 0, capture when it is 0 or nil, paralysis when the unit stops being stunned (1298-1300, which also adds the EMP bar).
- Draw (`widget:DrawScreenEffects` 1395-1472): drawn after the post passes so the colours are not distorted by water or heat (1396). One instanced draw per VBO (units, feature health, resurrect, reclaim), with uniforms `iconDistance` (config `UnitIconDistance`, default 200, times 27.5; 1412), `cameraDistanceMult` 1.0 (480) and `cameraDistanceMultGlyph` 4.0 (481). Depth test is on, so terrain occludes the bars.
- Order of one bar's life: add (dedupe by key, height, push instance) -> value uploads (watch on its phase, only on change) -> shader draw (every frame, GPU side, not read) -> remove when the condition ends.

## 2. Key functions

- `addBarForUnit`: `gui_healthbars_gl4.lua` 659-725. Dedupe (679-684), defID fallback (665), key (677), height and scale (706-712), push (714).
- `updateReloadBar`: 727-741 (start time at 741; "30" frames per second is used there).
- `addBarsForUnit`: 759-843 (rules 1-7 above).
- `widget:GameFrame`: 1222-1340. Watch blocks at 1229, 1266, 1283, 1307, 1323.
- `widget:DrawScreenEffects`: 1395-1472. Uniform setup 1412-1423.
- `UnitParalyzeDamageHealthbars`: 1040-1057 (the same stun rule as 822-838; reached through the widget callin at 1135, not read).
- Forwarder (hint file): `luarules/gadgets/unit_healthbars_widget_forwarding.lua` 1-25 (synced branch and state tables). It sends the capture, EMP and reload events that the widget watches.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| Change-only upload per watch | none (compare with last value, 1235, 1269) |
| Staggered watch phases | periods 3 and 5 (1229-1323); EMP and capture share phase 2 (see defect 1) |
| Colour range per bar kind | health red at 0 (230), green at 1 (231); other kinds in the table (119-328) |
| Hide fraction | 0.99 for most kinds (234); building 0.999 (288); stockpile 1.99, which is never hidden (261). Not applied in the Lua read. |
| Bar height above unit | 24 units times scale (419, 710) |
| Bar size with unit size | `variableBarSizes` true (398); `barScale` 1 (397) |
| Icon distance | `UnitIconDistance` config (default 200) times 27.5 (1412) |
| Glyph distance multiplier | 4.0 (481) |
| Reload time basis | 30 frames per second, assumed (741) |

## 4. TypeScript sketch

simplified: the sketch keeps the bar row (kind, hide fraction, colour range), the hide rule as the table states it, and the staggered change-only watch runner. It omits the attach rules (ally view, hide-damage units, stun swap), the instance keys and the GL draw, the shield normalisation and reload uniforms, the feature bars, and the removal calls. It takes the phase as a parameter, so the phase collision in the donor is not repeated by the code; the note recommends a free phase for capture (defect 1).

```ts
// Licence: GNU GPL v2 (donor widget header, BAR LICENSE.md). CLEAN-ROOM: shape only, written from the described mechanism.
// Unit bar stack: bar rows as data, staggered watch polling, change-only uploads, hide-at-threshold rule.

export type BarKind = "health" | "shield" | "emp" | "paralyzed" | "reload" | "capture" | "building" | "stockpile";

export interface BarRow {
  kind: BarKind;
  hideAt: number;                           // fraction at which the bar is hidden (donor table value; enforcement not read)
  lo: [number, number, number, number];     // colour at 0 fraction
  hi: [number, number, number, number];     // colour at 1 fraction
}

// Hide rule, as the donor table states it (the donor's Lua does not apply it; see notes).
export function shouldShow(row: BarRow, fraction: number): boolean {
  return fraction < row.hideAt;
}

// One watch: polls a value for every tracked unit, but only on frames where frame % period == phase.
export interface WatchState {
  period: number;
  phase: number;
  last: Map<string, number>;                // last value sent, per unit id (change-only uploads)
  read: (unitId: string) => number | null;  // null means "no value now" (caller removes the bar)
}

// Returns how many values were uploaded this frame. Units not read this frame keep their last value.
export function runWatch(
  frame: number,
  w: WatchState,
  unitIds: Iterable<string>,
  upload: (unitId: string, value: number) => void,
): number {
  if (frame % w.period !== w.phase) return 0;
  let uploads = 0;
  for (const id of unitIds) {
    const v = w.read(id);
    if (v === null) continue;
    if (w.last.get(id) !== v) {
      w.last.set(id, v);
      upload(id, v);
      uploads++;
    }
  }
  return uploads;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020 bar-watch-poll.ts` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/client/hud/unit-bars.ts` (new file; client only). Parity-checklist row 14 (HUD). The bars read state the server has sent; they never write state, so the server-verified kill rule is untouched.
- Reuse tag: adapt-idea (GPL v2: clean-room, shape only; the sketch is written from the mechanism)
- Brief rule served: client-only HUD (camera, HUD and sound are client-only); one engine (the bars read the engine's unit state, not a client copy)

Best transferable idea: a per-unit bar stack where each bar is a data row (colour range, hide fraction), values are pushed only when they change, and each watch runs on its own frame phase so one frame never pays for every bar.
Decision (proposed): adapt — keep the data-row bars, the change-only updates and the staggered phases; move the attach rules (ally view, hide-damage units, stun swap) into data; do not poll: the server sends changes and the client redraws only on a change. Why: it is a HUD mechanism that fits row 14 and never writes state; the engine-polling part does not apply to Frankendom, where the server sends state, so only the change-only and budget parts are kept.
Acceptance: with three attackers and an ally on screen, each enemy shows one health bar that changes only when the server's hp changes (a test counts uploads: one per change, none on unchanged frames); a stunned enemy shows a timer bar, not an hp bar; an enemy flagged hide-damage shows no bar to the opposing team.

## 6. Gaps and risks

- Frankendom has no engine polling: the server pushes state. The phase stagger is a client budget, not a server tick, so it does not map to the server tick (row 18 / post-K item 3). The change-only rule transfers; "poll on frame n % 3" does not.
- Defect 1, two watches share one phase. EMP runs on `(n + 1) % 3 == 0` (1266) and capture on `(n % 3) == 2` (1307); both are `n % 3 == 2`. Shield (1229) and paralysis (1283) take the other two phases. fix: give capture its own period or phase (the sketch takes the phase as a parameter).
- Defect 2, an undeclared name reaches the engine fallback. GameFrame calls `addBarForUnit(unitID, unitDefID, "emp_damage", "unitEmpDamagedWatch")` (1300), but `unitDefID` is not declared in GameFrame or at file level (grep found no `local unitDefID`). It works only because `addBarForUnit` falls back to `spGetUnitDefID` when the value is nil (665). fix: pass `spGetUnitDefID(unitID)` explicitly.
- Defect 3, the hide threshold is defined but not read in the Lua. The table gives 0.99, 0.999 and 1.99 (234-324); the widget does not reference them anywhere else, and the TODO list says "Hide buildbars when at full hp ... done" (173). So the hide rule is not enforced in any code I could read. fix: enforce `shouldShow` in one place and test it; do not rely on the GPU side.
- Defect 4, reload timing assumes 30 frames per second (741). A different sim rate would mis-time the bar. fix: express reload as an end timestamp from the server, not frames.
- Bar count per unit can reach five (health, shield, reload, building, capture, stockpile, EMP or paralysis). Frankendom has MAX_ATTACKERS = 3; a cap of two bars per enemy (health plus one status) is a proposal, not something the donor does; the donor's limit was not read.
- Readability at 375 wide: bar size follows unit size, icon distance follows a user config, and the donor does not set a minimum on-screen size (the GPU side was not read). Frankendom's bars need a minimum pixel size and a fixed count per screen; not measured.
- Feature bars (wrecks: health, reclaim, resurrect) are a separate VBO with their own distance multipliers (1435-1457). Not read in full; Frankendom has no reclaim, so only the health part is relevant.

String table fold-in (`language/`, read for structure and counts; values not quoted): 10 locale folders (cs, de, en, es, fr, hr, it, lt, ru, zh) plus a Unicode test script and a Transifex config. Only `en/interface.json` is complete: 3,481 string leaves under three groups (ui, cmd, modoptions), every leaf a string. Other English files: commands 277 keys, tips 264, units 1,968, features 70. Grammar: keys are nested by UI area; 307 placeholders all have the shape `%{name}`; 29 plural groups carry only `one` and `other` (English-style plural rules); a literal percent is written `%%`. Coverage of `interface.json` by key path: de 28.6 percent, es 37.2, ru 37.2, zh 37.1. `fr/interface.json` does not parse as strict JSON (a trailing comma before a closing brace near line 233; not fixed, not changed). `it`, `hr`, `lt` and `cs` have no `interface.json` (only features and tips). The health-bar widget makes no localisation calls (grep found none), so its labels are English-only. The coverage percentages compare key paths with English only for `interface.json`; the other files were counted, not compared.

Reuse tag: adapt-idea (GPL v2, clean-room)
Brief rule served: client-only HUD; row 14; one engine (bars read engine state, never a client copy)
