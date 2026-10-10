# id-Software-DOOM (hit-feedback-stack, FEEL, HF003)

Donor: `/mnt/frankendom-donors/id-Software-DOOM/linuxdoom-1.10/` (C, 1990s id Software source) | Licence: GNU GPL version 2, `/mnt/frankendom-donors/id-Software-DOOM/LICENSE.TXT` | Depth: full | Half read: both (game logic and status-bar presentation are in one tree; sound and palette output not read)

Checked: read in full `P_DamageMobj` (p_inter.c 765-921), the overkill branch of `P_KillMobj` (p_inter.c 716-722), `ST_doPaletteStuff` (st_stuff.c 1004-1040), `ST_updateFaceWidget` (st_stuff.c 752-917), `P_SpawnBlood` and `P_SpawnPuff` (p_mobj.c 812-860), the hitscan call order in `PTR_ShootTraverse` (p_map.c 899-1012), `A_Pain` (p_enemy.c 1577-1581), the player and monster pain states (info.c 292-293, 324), `P_DeathThink` and the living-player decay (p_user.c 182-225, 236-360). Candidates opened: p_inter.c, p_map.c, p_mobj.c, p_enemy.c, st_stuff.c, p_user.c, info.c, i_system.c, d_player.h. Confidence high on order and on the defect in section 7. The mobjinfo table was read by line, not receipted (its fields are tab-aligned).

## 1. What the player sees and feels

- A hit turns the whole screen red. The tint climbs in bands as hits pile up and falls off one band at a time as the counter drains. The status-bar face turns toward whoever hit you (left, right or head-on).
- The player almost always flinches on a hit: the donor's player roll is 255 of 256, so the flinch frame plays and the pain voice follows it. A light foe with a high roll flinches on about 4 hits in 5. The donor's heaviest kind has a roll of 20 of 256, so it takes the hit and keeps walking.
- The pain voice lands on the second pain frame, about four ticks (roughly 0.11 s at 35 ticks a second) after the hit. A missed roll gives no flinch and no sound, so a hit can land silently.
- Blood spawns at the hit point in three sizes by damage (small, medium, large). It rises a little and its life is cut by 0 to 3 ticks at random, so no two splats match.
- Death: the camera drops and turns toward the killer while the body falls. A kill that drops health below minus the kind's own spawn health swaps to the gib state.

## 2. Why it works, or why it is striking

- Readable at 375 wide: the red screen tint is the one whole-screen cue and it is banded, so one hit is a tint and five hits is the cap. The face is a second channel that says where the hit came from.
- One signature behaviour: a per-kind flinch roll. Some foes always react, some almost never. That gives a cheap poise dial with no extra state.
- One signature sound: the pain voice is tied to the flinch frame, so the voice and the stagger are one event.
- Could be made ours at 20 to 30 percent resemblance: yes. The per-kind poise roll, banded tint and blood size tiers are all data, and none needs the donor's assets.

## 3. The rule behind it

Order of operations inside one damage call (the donor runs this on the same tick as the hit):

1. Visual first: blood or puff at the hit point, sized from the raw roll (p_map.c 1005-1008), then the damage call (p_map.c 1011).
2. Knockback impulse = damage x scale / victim mass (p_inter.c 817, applied at 830). A small killing hit may flip forward (p_inter.c 819-826). This runs before the immunity gate, so an immune target is still pushed.
3. Immunity gate: returns before armour, health and flash (p_inter.c 847-849, below 1000 damage only).
4. Armour soaks one third (armour type 1) or one half (type 2) of the hit until empty (p_inter.c 857-863). Health takes the rest (870).
5. Flash counter += damage, capped at 100 (p_inter.c 875-878). In life it drains one point per tick (p_user.c 355-356). Death view only: it drains faster while the dead player turns to face the killer (p_user.c 209-215).
6. Death: health at or below zero calls the kill (p_inter.c 888-890). Overkill past the kind's own max health picks the gib state (p_inter.c 719-722).
7. Pain roll: if a random 0-255 value is below the kind's painchance, the victim takes the pain state (p_inter.c 894-899). A miss does nothing else visible.
8. Threat: if the victim has no lock, it takes the hitter as target and locks for 100 ticks (p_inter.c 910-911; define in p_local.h line 61).

Client presentation, per tick: tint band = ceiling of counter / 8, capped at 7 bands on top of the base (st_stuff.c 1008, 1021-1024). The pain voice is the pain state's action on the second pain frame (info.c 292-293; p_enemy.c 1579-1580).

Donor numbers that matter, as data fields (the `data_fields` list in the JSON): flinch roll per kind (0-256), mass per kind, knockback scale, immunity threshold (1000), armour soak fractions (1/3, 1/2), flash cap (100), flash points per band (8), blood tier boundaries (9 and 12 points), pain-frame ticks (4), threat lock (100 ticks), face ouch threshold (20 hp). Donor values are not copied into the data table because the donor is GPL (see section 6).

## 4. For Frankendom

- Lands in: TARGET `src/fight/hit-impact.ts` (new module: the engine emits one ordered hit list per victim per fixed tick; the client presents it). Parity-checklist row 10 (hit impact and hit stop). The server tick sub-line: fixed step, input intake, per-tick NPC budget.
- 700 zones as data: the feel record (flinch roll, mass, blood tier scale, pain voice id, overkill threshold) lives in the 100-character catalogue, not in the zone. A zone can override the scale, never the kind.
- Many-vs-one: DOOM's flash counter is capped, so three attackers cannot stack past the cap. Keep the cap. Knockback from several hitters is summed in the engine before presentation, so the victim gets one shove per tick.
- Threat rule: the 100-tick lock on the first hitter is the hate-list rule for row 4 (fight loop, aggro). Use it so the newest hitter does not steal a locked target; this is the donor's answer to three attackers.
- Server verified: the flinch roll uses the fight's seeded RNG, so replays and the server agree. The client never rolls; it shows the flag.
- Keep: the order (visual, knockback, immunity, armour, health, flash, death, flinch, threat); the per-kind flinch roll; the three blood sizes; the banded and capped tint; the death camera turn.
- Change, with defects fixed in the sketch (section 7): the ouch face check is sign-inverted; the voice is tied to the flinch roll, so a miss is silent (split the voice from the flinch, play the contact cue on the hit tick, add a per-victim voice gate of about half a second as the other donor does); the rumble call is a stub (phone haptics are new and untested on iOS).
- Decision for Lead: DOOM pushes an immune target but spends no armour. Frankendom must pick one order for guard and parry: proposed, a guard blocks the knockback too, and immunity skips armour as the donor does.

simplified: keeps the donor order (knockback, immunity gate, health, flash, death, flinch roll, threat); omits armour soak, the fall-forward flip, the chainsaw exemption, the death camera, the blood tiers and the palette render. The ouch fix is a separate function; the donor's sign is shown in the comment.

```ts
// Licence: GPL-2.0 (donor). Clean-room sketch of the order and two fixes, not a translation of the donor.
// clean-room
export interface Kind { painChance: number; mass: number; maxHp: number; }
export interface Foe { hp: number; kind: Kind; invulnerable: boolean; lockedUntilTick: number; }
export interface Cfg { knockbackScale: number; flashCap: number; threatLockTicks: number; }
export interface Feel {
  knockback: number; flash: number; flinch: boolean; contactCue: boolean;
  dead: boolean; overkill: boolean; threatLocked: boolean;
}

// 1. knockback first (donor order): pushes even an invulnerable target
// 2. immunity returns before health, flash and flinch
// 3. health, flash, death, flinch roll, threat lock
// Fix: contactCue is true on every landed hit, so a missed flinch roll is never silent.
// The pain voice is a separate, per-victim gated event; the caller plays it when flinch is true.
export function resolveHit(f: Foe, dmg: number, roll256: number, tick: number, cfg: Cfg): Feel {
  const knockback = (dmg * cfg.knockbackScale) / f.kind.mass;
  if (f.invulnerable) {
    return { knockback, flash: 0, flinch: false, contactCue: false, dead: false, overkill: false, threatLocked: false };
  }
  f.hp -= dmg;
  const flash = Math.min(cfg.flashCap, dmg);
  const dead = f.hp <= 0;
  const overkill = dead && f.hp < -f.kind.maxHp;
  if (dead) {
    return { knockback, flash, flinch: false, contactCue: true, dead: true, overkill, threatLocked: false };
  }
  const flinch = roll256 < f.kind.painChance;   // a miss gives no flinch
  const threatLocked = tick < f.lockedUntilTick;
  if (!threatLocked) f.lockedUntilTick = tick + cfg.threatLockTicks;
  return { knockback, flash, flinch, contactCue: true, dead: false, overkill: false, threatLocked };
}

// Fix for the ouch-face check: the donor compares (health now - health last tick), which is negative on damage.
export function bigHitDrop(healthLastTick: number, healthNow: number, threshold: number): boolean {
  return healthLastTick - healthNow > threshold;
}
```

## 5. Five-minute look test (Dom, on a phone)

Build a one-versus-three fight on the existing scene behind a debug flag with three presets: (A) current feel, no flash and no flinch variance; (B) the donor order: banded red tint capped at seven bands, a per-kind flinch roll (a near-always roll for the hero's kind, a rare roll for a heavy), and the ouch face fixed; (C) the same plus a half-second voice gate and a kick toward the hitter. Dom plays ten hits in each preset on a 375-wide screen and judges three things: can you tell which of the three hit you, does the tint hide the enemies, and does a heavy foe look heavy without a flinch. Publish to the preview folder only. No release rows, no lock.

## 6. Licence and IP

GPL version 2 (`/mnt/frankendom-donors/id-Software-DOOM/LICENSE.TXT`). Clean-room only: the code is not adapted; the sketch is written from the described order. The ideas are kept at category level: an order of steps, a per-kind dice roll, banded tint, three blood sizes. Trait kept: the order of visual, knockback, immunity, armour, health, flash, death, flinch, threat. Trait changed: names, numbers and the band count (we use a different step size), plus the voice gate and the fixed ouch face. No donor values are copied into the data fields, and no monster names, sprites or sounds are used. No legal conclusion is drawn.

## 7. Gaps and defects

Not read: sound output (s_sound.c, i_sound.c, sndserv/), the palette application (i_video.c, I_SetPalette), the full state tables for each monster (only the pain states listed in section 3), P_KillMobj beyond the overkill branch, P_LineAttack beyond line 1011, and the WAD assets.

Defects (keep the idea, fix the defect):

- Ouch face is sign-inverted. `st_stuff.c` 807 and 860 test `plyr->health - st_oldhealth > ST_MUCHPAIN`. `st_oldhealth` is last tick's health (st_stuff.c 994), so a hit makes the difference negative and the "much pain" face cannot fire on damage. It fires only on a large heal while the flash is up. Fix: test `st_oldhealth - plyr->health > ST_MUCHPAIN`. Sketch: `bigHitDrop`.
- Rumble is a stub. `p_inter.c` 883 calls `I_Tactile (40,10,40+temp*2)`, but `i_system.c` 55-61 is marked UNUSED and does nothing. Fix: implement the call on the client (phone vibration, untested on iOS) or drop it.
- The pain voice is tied to the flinch roll (info.c 292-293; p_enemy.c 1579-1580), so a missed roll is silent even when the hit was heavy. Fix: play the contact cue on the hit tick and gate the voice per victim.
- Immunity order: knockback applies before the immunity return, armour does not. Keep, but decide it once for our ledger (section 4).

Where else seen (this topic only): death view turns to the killer at 5 degrees per tick and drops the camera by one unit per tick to a low height (p_user.c 182-198); the blood tiers and puffs above; no idle or ambient animation is part of this topic.

Best transferable idea: a per-kind flinch roll on the same hit call as the damage, with the pain voice on the flinch frame, so a heavy foe reads as heavy at 375 wide without any extra state.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room, shape only). Decision: adapt (idea), with the ouch-face sign, the rumble stub and the silent-miss voice fixed in the sketch.

Brief rule served: 10 (hit impact and hit stop: the order of feedback); 4 (threat lock as hate-list rule); seed discipline for the roll.
