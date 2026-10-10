# id-Software-Quake (hit-feedback-stack, FEEL, HF003)

Donor: `/mnt/frankendom-donors/id-Software-Quake/` (QuakeC server logic in `qw-qc/`, C engine and client in `WinQuake/`, QuakeWorld client in `QW/client/`) | Licence: GPL-2.0-or-later, `qw-qc/combat.qc` lines 10-11 ("as published by the Free Software Foundation; either version 2" / "of the License, or (at your option) any later version.") | Depth: full | Half read: both (server QuakeC: weapons.qc, combat.qc, player.qc, misc.qc, client.qc; client and engine: WinQuake/view.c, WinQuake/sv_main.c 589, WinQuake/r_part.c 400, QW/client/cl_tent.c 294-307)

Checked: read in full `FireBullets`, `TraceAttack`, `AddMultiDamage`, `ApplyMultiDamage`, `Multi_Finish` and `SpawnBlood` (qw-qc/weapons.qc 151-315); `T_Damage` order around the armour, momentum, godmode and pain call (qw-qc/combat.qc 134-267; the full body is in /private/tmp/p2/out/combat-sim/id-Software-Quake.deep.md); `PainSound` and `player_pain` (qw-qc/player.qc 273-375); the gib threshold (player.qc 624-626); `V_ParseDamage` and the decay and kick code (WinQuake/view.c 316-378, 557, 643, 815-819); the server damage record (WinQuake/sv_main.c 589-598); the blood and gunshot effect handlers (QW/client/cl_tent.c 294-307). Candidates opened: 7 or more files. Confidence high on the order of operations; the cvar defaults and the colour blend are not read.

## 1. What the player sees and feels

- A shotgun volley is one hit per victim. Each pellet that lands on a body adds to one damage total and to one spray count, so three pellets on the same target read as one hit with three times the spray. Each pellet that lands on a wall adds to a dust count. Both sprays play at the end of the volley, at the last hit point.
- The victim's screen flashes red. The tint is pale when the armour count beat the blood count, mid red when some armour soaked, and full red when there was none. The view then kicks away from the attacker: the roll and pitch follow the direction of the hit, and the kick fades over a short timer.
- The status-bar face shows a pain frame for about 0.2 s.
- The pain voice is one of six random clips, and at most one plays every half second per player. A player who is mid-attack does not get the flinch frame, so an attack finishes its swing.
- Particles: twenty per hit count, so a three-pellet body hit throws sixty red particles (colour index in cl_tent.c 307).
- Death: a player who falls below minus 40 health is gibbed (head plus three gibs) with velocity taken from the damage.

## 2. Why it works, or why it is striking

- Readable at 375 wide: the kick points at the attacker, so the victim knows where the hit came from without a minimap. One flash channel plus one kick channel, two cues, no clutter.
- Signature behaviour: the view kick toward the attacker, sized by the damage count and fading over time.
- Signature sound: the pain voice is capped at one per half second per player, so a crowd of attackers gives one grunt, not a wall of noise.
- Could be made ours at 20 to 30 percent resemblance: yes. The kick, the flash cap, the per-victim aggregate and the voice gate are all shape-level ideas with no assets.

## 3. The rule behind it

Per volley, in order:

1. Trace each pellet. A body hit adds one to the blood count, sets the last hit point and adds the pellet's damage to that target's total. A wall hit adds one to the puff count (qw-qc/weapons.qc 272-278, 309-310).
2. Apply each victim's total once, through one damage call (weapons.qc 314, which calls T_Damage at weapons.qc 206). Inside the damage call the momentum push runs before the godmode check (combat.qc 197 before 208), armour soaks first (combat.qc 160-169), damage is recorded for the client (combat.qc 176), health is reduced, and the pain callback runs (combat.qc 265-267).
3. Send the effects once: one gunshot record for the puffs, one blood record for the body hits, both at the last hit point (weapons.qc 224-240, 315).
4. The server accumulates the client's damage record across every hit to that client in the frame, from any attacker (combat.qc 174-179), keeping only the last attacker's position as the origin (combat.qc 178). It sends the record on the next update: first byte armour soaked, second byte health damage taken, then the origin (WinQuake/sv_main.c 589-598). The client reads it in `V_ParseDamage`:
   - count = blood times 0.5 plus armour times 0.5, floored at 10 (view.c 331-332). Here "blood" is the health damage taken and "armour" the soaked part, so the count is about half the raw hit;
   - face hold of 0.2 s (view.c 335);
   - flash += 3 times count, capped at 150 (view.c 337-340);
   - kick roll = count times side times the roll cvar; kick pitch = count times forward times the pitch cvar; kick timer = the kick-time cvar (view.c 373-378).
5. Per frame: the flash drains 150 per second (view.c 557); the kick is applied as timer over kick-time times roll or pitch, and the timer drains (view.c 815-819).
6. Pain voice: skipped if a pain sound played in the last half second (player.qc 317-322); a random one of six clips (player.qc 335); the flinch frame is skipped when the weapon frame is busy (player.qc 371).

Donor numbers as data fields (JSON): flash gain per count (3), count floor (10), flash cap (150), flash drain per second (150), pain voice gap (0.5 s), face hold (0.2 s), particles per count (20), gib threshold (minus 40 health), momentum factor per damage (8). Donor values are not copied because the donor is GPL (section 6).

## 4. For Frankendom

- Lands in: TARGET `src/fight/hit-impact.ts` (new module: the engine builds one hit record per victim per fixed tick from the volley's totals; the client turns it into flash, kick, voice and particles). Parity-checklist row 10 (hit impact and hit stop). Server tick sub-line: fixed step, input intake, per-tick NPC budget.
- Many-vs-one: the donor merges the victim's record across attackers within one frame (combat.qc 174-179), so three attackers hitting in one frame give one flash and one kick, not three. Keep the merge. The donor's flaw is direction: it keeps only the last attacker's position, so a hit from the left and one from the right read as one side. Fix: keep a summed direction across the three attackers, capped in magnitude, or a short list of hitter directions for the HUD.
- 700 zones as data: the feel numbers (flash gain, cap, kick time, voice gap) are one global feel profile, with a per-kind override only for heavy kinds. Zones do not own feel numbers.
- Server verified: the hit record comes from the engine; the client applies it. The client never decides that a hit landed.
- Keep: the per-victim aggregate (merged per frame across attackers, and per volley within one gun); the flash cap; the kick toward the attacker; the half-second voice gate; the face hold; no flinch while the attacker is committed to a swing (Frankendom's commitment rule in the duel step, row 1).
- Change, with defects fixed in the sketch (section 7): the blood count ignores the damage argument; the spray velocity is computed and never used; the donor has no hit stop, so any freeze we add is our own idea, not a donor one; the donor presents the damage one network update late, and we should present on the hit tick from the same server event.
- Decision for Lead: whether a flinch cancels a windup. The donor says no. For fast duels we propose: a flinch never cancels a committed strike, and a guard-broken hit does.

simplified: keeps the donor order (per-victim aggregate, one damage call, then flash and kick on the client with a decay and a voice gate); omits the armour split, the momentum push, the godmode branch, the gib, the face hold and the particle colours. The count floor and cap are the donor's shape, with our own numbers passed in as config.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch of the aggregate-then-present order, not a translation.
// clean-room
export type Vec3 = [number, number, number];
export interface Pellet { targetId: number | null; at: Vec3; damage: number; }
export interface VictimTotal { damage: number; hits: number; at: Vec3; }
export interface Volley { victims: Map<number, VictimTotal>; wallPuffs: number; }

export function collectVolley(pellets: Pellet[]): Volley {
  const victims = new Map<number, VictimTotal>();
  let wallPuffs = 0;
  for (const p of pellets) {
    if (p.targetId === null) { wallPuffs += 1; continue; }
    const cur = victims.get(p.targetId);
    if (cur) { cur.damage += p.damage; cur.hits += 1; cur.at = p.at; }
    else { victims.set(p.targetId, { damage: p.damage, hits: 1, at: p.at }); }
  }
  return { victims, wallPuffs };
}

export interface FeelCfg { floorCount: number; flashGain: number; flashCap: number; kickScale: number; voiceGapS: number; particlesPerHit: number; }
export interface Presented { flash: number; kick: number; particles: number; voice: boolean; }

// One record per victim per volley. The count is half the raw hit (health taken plus armour soaked), floored.
export function presentHit(v: VictimTotal, armourSoak: number, facing: number, cfg: FeelCfg, sinceLastVoiceS: number): Presented {
  const healthTaken = Math.max(0, v.damage - armourSoak);
  const count = Math.max(cfg.floorCount, 0.5 * healthTaken + 0.5 * armourSoak);
  const flash = Math.min(cfg.flashCap, cfg.flashGain * count);
  const kick = count * facing * cfg.kickScale;   // facing: signed side of the hitter, -1..1
  return { flash, kick, particles: cfg.particlesPerHit * v.hits, voice: sinceLastVoiceS >= cfg.voiceGapS };
}

export function decayFlash(flash: number, dtS: number, drainPerS: number): number {
  return Math.max(0, flash - dtS * drainPerS);
}
```

## 5. Five-minute look test (Dom, on a phone)

Build a three-attackers-on-one fight on the existing scene behind a debug flag with three presets: (A) current feel; (B) the per-victim aggregate with a flash cap and no kick; (C) the same plus a kick toward the strongest hitter and a half-second voice gate. Dom takes ten hits per preset at 375 wide and judges: can you name the side of the hit from the kick alone, does the flash hide the three attackers, and does three-at-once sound like one grunt rather than three. Publish to the preview folder only. No release rows, no lock.

## 6. Licence and IP

GPL-2.0-or-later (`qw-qc/combat.qc` header lines 10-11; the GPL text is in `/mnt/frankendom-donors/id-Software-Quake/gnu.txt`). Clean-room only: the sketch is written from the described order and is not a translation. Kept at category level: the per-victim aggregate, a capped flash, a directional kick, a voice gate, a face hold. Trait kept: aggregate, then one damage call, then presentation. Trait changed: names, numbers, the kick shape (signed side and facing, our cap), the voice gate length (ours), and the particle count (ours, not twenty). No donor values are copied into the data fields, no clip names or colour indices are used, and no legal conclusion is drawn.

## 7. Gaps and defects

Not read: the rest of `Killed` (combat.qc 85-), the cvar defaults for the kick roll, pitch and time (not in the half read), the colour blend that the flash feeds (`V_UpdatePalette`, view.c, not read), the QuakeWorld damage record (`QW/server/sv_send.c` 487-496, grep only), monster QuakeC (not in the `qw-qc` listing; not read), the sound channels, and the TE_BLOOD and TE_GUNSHOT producers in the WinQuake engine (only the QuakeWorld client was read for those).

Defects (keep the idea, fix the defect):

- The blood count ignores the damage. `SpawnBlood (org, damage)` at qw-qc/weapons.qc 151-155 writes a constant 1 as the count, so every non-gun blood call (for example misc.qc 344, the laser, called with 15) makes twenty particles whatever the damage. Fix: write a count from the damage (clamped) or drop the unused parameter. The fire path already uses the real hit count.
- Spray velocity is dead code. `TraceAttack` computes `vel` (qw-qc/weapons.qc 264-266) and the body never uses it (268-280). Fix: use it to aim the spray or delete the two lines.
- The damage record keeps only the last attacker's position (combat.qc 178; sv_main.c 589-598 sends one origin). Fix: sum the directions or keep a short list, so a multi-attacker frame keeps its sides. This is the main readability gap for max-3 attackers.
- The damage record is one network update late. The client applies it from the next server update (sv_main.c 589-598). Fix: send the hit record with the same server event that changes health, and present it on that tick.
- The commented alternative momentum (`* 11`, combat.qc 193) is not used. Nothing to fix; do not port it.

Where else seen (this topic only): the death view is a gib at the overkill threshold (player.qc 624-626) with velocity from the damage (`VelocityForDamage`, player.qc 467-); idle animation and the walk-density rules are not part of this topic.

Best transferable idea: merge every hit on one victim into one presentation record per tick, and keep the hitters' directions in the merge, so three attackers read as one stronger hit with a visible side, not three flashes.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room, shape only). Decision: adapt (idea), with the blood-count and dead-spray defects fixed in the sketch.

Brief rule served: 10 (hit impact and hit stop: the order of feedback); 4 (per-victim aggregate for many-vs-one); 1 (one damage call per victim).
