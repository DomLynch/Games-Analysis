# OpenRA-OpenRA (hud-ui, cell 3)

Donor: /mnt/frankendom-donors/OpenRA-OpenRA/OpenRA.Mods.Common/Traits/World/RadarPings.cs | Licence: GPL-3.0 (COPYING read: GNU GENERAL PUBLIC LICENSE Version 3; per-file header says GPL v3 or later; copyleft, clean-room, shape only) | C# | symbol RadarPing / RadarPings.Add

Checked: cell 3 = row 3 of cells-HU006.tsv. Hint file IngameMenuLogic.cs (647 lines) is the in-game menu (ChromeLogic); I opened only its class line (23), not the HUD. The real HUD mechanism is the radar attention ping. Read in full: RadarPings.cs (116 lines), RadarWidget.cs 385-411 (DrawRadarPings), DamgeNotifier.cs 28-45 and 60-122. Read partly (grep and short views): JumpToLastEventHotkeyLogic.cs (36-39), HarvesterAttackNotifier.cs (80), MapNotificationEffect.cs (57), PlaceBeacon.cs (84 only), mods/ts/mod.yaml 281-308 (GameSpeeds). Not read: AppearsOnRadar.cs, ProvidesRadar.cs, the RadarWidget world-to-minimap mapping (CellToMinimapPixel body), the rest of DamgeNotifier.cs (1-27 and 46-59). Touch input: grep for finger, touch-event and touch-down names in OpenRA.Game, OpenRA.Platforms.Default and OpenRA.Mods.Common found none. Localisation: mods/common/fluent holds 5 .ftl files (counted with ls and cat; the mods tree holds 180 .ftl files in total, which were not all counted; see section 6). Confidence: high on the ping ring, the damage gate and the expiry arithmetic (checked on the VPS: 249 shrink steps, radius 15 at step 47). Camera_scope: not a camera note.

## 1. Mechanism

A radar attention ping is a three-point ring drawn on the minimap at the event's cell. It is created by game events, then advanced once per logic tick and removed when its tick count reaches its duration.

Creation (DamgeNotifier.Damaged, DamgeNotifier.cs:72-119): the damage is ignored when there is no local player or the local player is spectating (76), when there is no attacker (79), when the attacker shares the target's owner (82), when the attacker is the world (85), when the target type filter fails (88-92), or when an ally does 0 or less damage (94). If Game.RunTime is at or past the unit's nextActiveTick (97), a ping is added with visibility fixed as "allied with the render player" (99-100), then the sound and text notification run for the owner or an ally, and nextActiveTick is set to RunTime plus NotifyInterval (116). A negative interval means notify once (117). The cooldown gates only the visible case: the ping is added first (99-100), then the method returns at once when the owner is not allied with the render player (101-102), before nextActiveTick is re-armed at 116. So pings for non-visible owners are never rate-limited; the sound, text and cooldown re-arm happen only for visible owners.

Lifetime (RadarPings.cs:43-48, 99-107): each logic tick the ping's tick count goes up. When it equals Duration the ping is removed. Otherwise the radius goes down by 4 px but not below 15 px, and the angle goes down by 0.12 rad.

Drawing (RadarWidget.cs:399-411): pings whose visibility holds are drawn as a triangle, centred on the ping cell's minimap pixel, with a 2 px outline, in the ping colour (red by default).

Jump: RadarPings.Add sets LastPingPosition when the ping is visible at creation (55-56). The jump-to-last-event hotkey centres the viewport on that position (JumpToLastEventHotkeyLogic.cs:36-39).

Order of operations: event, filters, cooldown gate, add ping, per-tick shrink and rotate, expiry at Duration, draw while visible.

## 2. Key functions

- DamageNotifier.Damaged (DamgeNotifier.cs:72-120): filter, cooldown gate, ping add, notify, reset the gate.
- RadarPings.Add (RadarPings.cs:50-61) and RadarPings.Tick (43-48): creation and per-tick sweep.
- RadarPing.Tick (99-107) and RadarPing.Points (109-114): the shrink and rotate step and the three vertices.
- RadarWidget.DrawRadarPings (399-411): the draw pass, called at RadarWidget.cs:393.
- JumpToLastEventHotkeyLogic (36-39): jump to the last visible ping.

## 3. Numbers vs mechanism

- Start radius 200 px, floor 15 px, shrink 4 px per tick (RadarPings.cs:23-25). The ring reaches the floor on the 47th shrink step (200 - 4 x 47 = 12, held at 15).
- Lifetime: 250 logic ticks by default (DamgeNotifier.cs:37). The check runs before the shrink, so 249 shrink steps happen before removal. Rotation 0.12 rad per tick, so about 52 ticks per turn and about 4.75 turns over the lifetime.
- Logic tick length: 40 ms at the default game speed (mods/ts/mod.yaml:292-294, Timestep 40). So the default ping lasts 250 x 40 ms = 10 s and reaches the floor at about 1.9 s. At the slowest speed (80 ms, line 286) it lasts 20 s; at the fastest (20 ms, line 306) it lasts 5 s. Duration is in ticks but the cooldown is in real milliseconds, so the lifetime in seconds depends on game speed.
- Per-unit cooldown: 30000 ms by default (DamgeNotifier.cs:32). A visible unit under repeated fire pings at most once per 30 s; a non-visible one pings on every hit (early return at 101-102, before the re-arm at 116).
- Colour: red by default (DamgeNotifier.cs:34).
- Defect (expiry): RadarPings.cs:101 uses "++tick == Duration". A duration of 0 or less never matches, so the ping never expires. Fix: test "tick >= duration" (done in the sketch; expires on the first tick for duration <= 0).
- Defect (visibility): DamgeNotifier.cs:99-100 captures visibility once in a local bool, so if the render player's alliance changes the ping keeps the old answer. HarvesterAttackNotifier.cs:80 uses a live lambda. Fix: pass a live function, as the harvester notifier does.
- Defect (cooldown bypass): the early return at DamgeNotifier.cs:101-102 skips the re-arm at 116, so the cooldown never limits pings for non-visible owners. Fix: re-arm the gate before the visibility return; the sketch's notifyGate is applied to every hit regardless of visibility.
- Mixed units: the donor's doc strings say the duration is in ticks (DamgeNotifier.cs:36) and the cooldown in milliseconds (30). Fix: state both units in the data, or use server ticks for both.

## 4. TypeScript sketch

simplified: keeps the ring shape, the shrink and rotate step, the expiry and the per-unit cooldown with the donor's negative-interval rule; omits the filters (team, target type, ally chip damage), the sound and text notifications, the minimap pixel mapping (the caller passes the centre), and the draw. Fixes: expiry uses >= (donor uses ==); visibility is a live function in the caller, not a captured bool (see section 3). Typechecked on the VPS with tsc --strict --target es2020 (exit 0). The 249-step and step-47 figures were checked with a node run on the VPS.

```ts
// Radar attention ping: a 3-point ring that shrinks and rotates, lives for a fixed number of logic ticks,
// and is rate-limited per unit by real time. Client HUD only (the server sends the event, never the ring).

export interface Vec2 { x: number; y: number; }

export interface PingRules {
  fromRadius: number;     // px, starting radius (donor FromRadius = 200)
  toRadius: number;       // px, floor the ring stops at (donor ToRadius = 15)
  shrinkPerTick: number;  // px per logic tick (donor ShrinkSpeed = 4)
  rotationPerTick: number; // radians per logic tick (donor RotationSpeed = 0.12)
}

export interface Ping {
  x: number;              // centre, already mapped to minimap px by the caller
  y: number;
  tick: number;
  duration: number;       // logic ticks; donor default 250
  radius: number;
  angle: number;
  visibleAtCreate: boolean;
}

export function newPing(x: number, y: number, duration: number, rules: PingRules, visibleAtCreate: boolean): Ping {
  return { x, y, tick: 0, duration, radius: rules.fromRadius, angle: 0, visibleAtCreate };
}

// One logic tick. Returns false when the ping has expired.
// Fix vs donor: the donor tests `++tick == duration`, so a duration of 0 or less never expires.
// Here `>=` expires it on its first tick instead.
export function tickPing(p: Ping, rules: PingRules): boolean {
  p.tick += 1;
  if (p.tick >= p.duration) return false;
  p.radius = Math.max(p.radius - rules.shrinkPerTick, rules.toRadius);
  p.angle -= rules.rotationPerTick;
  return true;
}

// Three vertices 120 degrees apart on the ring.
export function trianglePoints(p: Ping): [Vec2, Vec2, Vec2] {
  const at = (a: number): Vec2 => ({ x: p.x + p.radius * Math.cos(a), y: p.y + p.radius * Math.sin(a) });
  return [at(p.angle), at(p.angle + (2 * Math.PI) / 3), at(p.angle + (4 * Math.PI) / 3)];
}

// Per-unit notify gate, in real milliseconds (not ticks). Donor: interval < 0 means notify once.
export function notifyGate(nowMs: number, nextAllowedMs: number, intervalMs: number): { allowed: boolean; next: number } {
  if (nowMs < nextAllowedMs) return { allowed: false, next: nextAllowedMs };
  if (intervalMs < 0) return { allowed: true, next: Number.POSITIVE_INFINITY };
  return { allowed: true, next: nowMs + intervalMs };
}

export {};
```

## 5. Lands in

Target: src/fight/radar-ping.ts (proposed new client module). Parity row 14 (HUD). The server sends the hit event (who, where, when); the client builds the ring and the cooldown. The ring is never a source of truth for combat.

## 6. Gaps and risks

- Client-only: the ring and its cooldown are display state. Hit detection, damage and death stay server-verified (one ledger).
- Cooldown per unit: with MAX_ATTACKERS = 3, a hero under three attackers pings once per 30 s. This is intended readability, but the attackers are not all shown; if Frankendom wants each attacker marked, that needs a different rule.
- Units: pick one unit for lifetime and cooldown in Frankendom data. The donor mixes ticks and milliseconds, so its lifetime changes with game speed.
- The Pit is a fixed arena with no world minimap, so the ring is a world-view element only.
- Touch: no touch-input code in this donor (grep found none). The jump hotkey is a keyboard binding. The ring's 2 px outline and 15 px floor must be checked at 375 px, where the minimap is smaller than the donor's; not tested.
- Localisation: mods/common/fluent (English, 5 files) has 1056 message-key lines, 164 section headers (##), 25 plural selector blocks ([one] and *[other]) and 1 term definition. Entries are key = value per line, with attributes indented (.label, .description) and placeables in braces (Fluent syntax; placeables not counted). The mods tree holds 180 .ftl files in total; only the common set was counted. Fluent is a good shape for Frankendom's strings if we localise; the donor's string files are not the HUD code.
- SelectionDecorationsBase.cs (health bars, 139 lines) was not read; not claimed here.
- Licence GPL-3.0: shape only; no line-by-line translation.

Reuse tag: reuse-candidate (radar attention ping with per-unit cooldown). Donor licence copyleft; shape only.

Brief rule served: "keep the idea, fix the defect". The == expiry, the captured visibility and the mixed units are fixed or flagged above. Judged on the mechanism, not the genre.

Best transferable idea: A minimap ping that is started by the event itself, shrinks and rotates for a fixed number of ticks, and is rate-limited per unit by real time.
Decision (proposed): adapt - keep the shrinking ring, the fixed lifetime and the per-unit cooldown; fix the expiry test and make the visibility live; use one time unit.
Acceptance: When the hero takes a hostile hit, a red three-point ring appears at the hit position, shrinks from 200 px to 15 px by about 2 s at 40 ms per tick, and is gone after 250 ticks; a second hit on the same unit within 30 s starts no new ring (whether or not the unit is visible to the render player; the donor limits only the visible case), and a test with duration 0 expires on its first tick.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Sec1 said the ping and notification share one per-unit cooldown; real: DamgeNotifier.cs:99-102 adds the ping then returns when not visible before nextActiveTick is re-armed (116), so non-visible owners are never rate-limited. Confirmed against the donor.
- Acceptance 'second hit within 30 s starts no new ring' held only for the visible case. Confirmed.
- Missed: none significant.

Fixed 2026-10-12: Sec1, Sec3 cooldown line and Acceptance now state the cooldown applies only to visible owners; added a cooldown-bypass defect line with the fix (re-arm before the visibility return). Sketch unchanged (its gate already applies to every hit).
