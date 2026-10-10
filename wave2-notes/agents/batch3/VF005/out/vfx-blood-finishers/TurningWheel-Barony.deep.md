# TurningWheel-Barony (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/TurningWheel-Barony/src/actgib.cpp` | Licence: BSD 2-Clause (LICENSE.txt: "This open source release of Barony is licensed under the BSD 2-Clause License", copyright Turning Wheel LLC 2013-2020) | C++ | symbols `actGib`, `spawnGib`, `Entity::handleEffects` (bleed drip), `Entity::attack` (bleed roll)

Checked: Read `src/actgib.cpp` 33-253 (the whole `actGib` behaviour), 962-1083 (`spawnGib`), and 1539-1598 (`spawnGibClient`, `serverSpawnGibForClient`). Read `src/entity.cpp` 760-766 start and 1518-1528 (`Entity::effectTimes`, timer countdown), 3810 start and 6639-6754 (bleed drip in `Entity::handleEffects`, including the clear path at 6742-6748), 10097 start and 16046-16148 (bleed roll and application inside `Entity::attack`), 16046-16148 incl. the heavy and extend branches. Read `src/monster_shared.cpp` 443-466 (`Entity::spawnBlood`), `src/game.cpp` 1265-1290 (per-tick behaviour loop), 4127-4140 (fixed-step accumulator), 5309-5316 (tick loop), `src/input.cpp:5` (TICKS_PER_SECOND 50), `src/menu.cpp:203` (`spawn_blood` default), `src/monster.hpp:437` (gibtype table declaration only; per-monster values not read), `src/monster_gnome.cpp` 829-843 and `src/monster_goatman.cpp` 730-742 (two death callers), and `src/net.cpp` 3156-3163 (the client receive for the gib packet). Not read: `spawnDamageGib`, `actDamageGib` (damage numbers), `actFociGib`, `spawnMiscPuddle` and `actMiscPuddle` bodies, the lifetime of a blood splat, what `modHP` does at death, the SHAK client decoder, the multiplayer guards around the behaviour call, and the order of `handleEffects` versus `effectTimes` inside the same monster function (they are at actmonster.cpp:3627 and 4228; I did not confirm they are in one call sequence). Confidence: high on the bleed numbers and gib spawn and motion (receipted); medium on the death path and on the multiplayer roles. Camera scope: not a camera cell.

## 1. Mechanism

Two linked mechanisms: a bleed wound that drips damage over time, and gibs (body and blood particles) that the wound and death spawn.

**Bleed (wound) lifecycle.**
- Apply on a landed hit, inside `Entity::attack` (16046-16148). Only creatures with a gib type that is not 0 and not 5 can bleed (16050), and only when the hit does damage to a target with HP above 5 (16052). The roll is 1 in 20 for a weapon-skill band above sword up to polearm, 1 in 10 for sword, 1 in 4 for golem smash, and a few others such as whip cases (16054-16062).
- The bleed branch is chosen by two flags. `wasBleeding` is the timer being above zero at the time of the roll (16049). A normal bleed sets the timer only when not already bleeding (16084). A heavy bleed is set by golem smash (always), or by vampire hits and vampiric-aura hits at a 50% share (16073-16078). Heavy when not bleeding sets 500 + random 0-499 minus CON x 10, floor 250 ticks (16118-16123); heavy when already bleeding adds random 0-349 minus CON x 5, floor 100 ticks (16134-16136). A normal roll on a bleeding target does nothing: there is no stacking for normal bleeds, only for heavy ones.
- Whip hits set the timer to at least 250 ticks and spawn five gibs (16092-16101). A status-inflicted bleed (the sword capstone) sets at least 250 ticks (16087-16090).
- The timer counts down once per tick in `Entity::effectTimes` (1526-1528); called from the monster and player behaviours (actmonster.cpp:4228, actplayer.cpp:8933).
- Drip. In `Entity::handleEffects` (3810), while bleeding (6639) and on every 120th tick of the entity's own age (6641; `Entity::ticks` is "duration of the entity's existence", entity.hpp:155):
  1. Blood ward active: bleed cleared (6643-6649). For a player, one MP is also consumed (6650-6654).
  2. HP above 5 + max(0, CON) (6656): damage = base 1 + MAXHP / 30 (6658); minus a random share of half the base (6661); minus CON / 5 when CON > 0 (6665); capped at 15 for the four lich and devil types (6672); floored at 1 (6674). Applied with `modHP` (6675). A gib is spawned from the creature (6678). If it is the local player, the camera shake is set to -0.03 and +3 (6680-6684); for remote players the server sends a SHAK packet (6685-6693).
  3. HP at or below the floor: the bleed is cleared and the timer set to 0 (6742-6748). The bleed ends at the floor and never drips the creature below it on its own.
- Worked numbers: MAXHP 300, CON 0: base 11, minus a random 0-4, so 7-11 damage every 2.4 s, with no drip once HP is 5 or less. MAXHP 30, CON 0: base 2, no random reduction, so 2 damage per drip.

**Gibs.**
- `spawnGib(parent, sprite)` (962-1083) chooses a sprite from the parent's gib type (987-1041): 0 spawns nothing; 1 is sprite 5; 2 is 211; 3 is a slime colour sprite (211, 215, 1401-1403); 4 is 683; 5 spawns only when the parent is dead (HP at or below 0), sprite 688. A custom sprite overrides this.
- The gib starts at the parent's x and y, at a random z from 8 up to parent z minus 4 (1058). Random yaw, pitch and roll in whole degrees (1062-1064). Horizontal speed is a random tenth from 0.0 to 0.9 units per tick along the yaw (1065-1067). Vertical speed starts at -0.5 (1068). Gravity is 0.04 per tick (1069). Behaviour is `actGib` (1070). Hidden when blood is off and the sprite is 5 (1075). Gibs get the fixed uid -3 (1080) rather than a normal network id; that is what the code does, and I did not read the uid handling elsewhere.
- Per tick, `actGib` (66-253): a gib at z 8 with horizontal speed under 0.01 is removed, with a poof if its poof flag is set (71-77). A gib past its lifespan is removed, optionally after shrinking (80-102). Horizontal motion: x and y advance by the velocity, then the velocity is multiplied by 0.95 (122-135; the delay-move branch and the per-gib decay field are in the donor but not sketched). Gravity: while z is below 8, or when the cell under the gib is empty, `vz += 0.04; z += vz` (173-178, 215-217). On landing (z at or above 8 over a non-empty cell) the vertical speed is zeroed, z is set to 8 and the gib is at rest (221-233). A gib landing on a puddle sprite (1895-1903) spawns a misc puddle and is removed (224-230). A gib past z 128 is removed (246-252). Poof: a sound and three puffs at random offsets (54-64), when skill[5] is non-zero.
- Network. The server does not send gib motion. `serverSpawnGibForClient` (1571-1598) sends a 13-byte "SPGB" packet per remote client: x, y, z and sprite as 16-bit values, a flags byte (bit 0 sprite flag, bit 1 poof) (1586-1595). The client's packet table entry (`src/net.cpp:3156-3163`) reads the position, sprite and flags, calls `spawnGibClient` (1539-1569), and copies the poof bit into skill 5 (it stores 2 for poof, which still counts as non-zero). `spawnGibClient` picks its own yaw, pitch, roll and horizontal speed from its own RNG, with the same -0.5 start and 0.04 gravity. So only the start position is shared; the motion is each client's own.
- Blood splat (decal). `Entity::spawnBlood(bloodSprite = 160)` (monster_shared.cpp:443-466): when `spawn_blood` is on or the sprite is not 160 (445), and the tile under the entity is non-empty (449) and not an obstacle (451), it creates an entity at z 8.00-8.19 (456) with a random yaw. No behaviour is set in this function, so its lifetime is not shown here (not read).

**Tick driver.** `gameLogic` runs the behaviour loop (game.cpp 1265-1290): for each entity `ticks++` (1279), then `(*entity->behavior)(entity)` (1282), with `multiplayer` forced to SINGLE and `clientnum` to 0 for the loop (1269-1271). `gameLogic` is called once per counted tick (5313). The count comes from a fixed-step accumulator: `time_diff += timesync` (4128); a tick is `1000 / TICKS_PER_SECOND` = 20 units (4129); each full tick subtracts one frame (4131) and adds one to `numframes`; at most 5 are run per call of this function (4136-4139; the caller that drives it once per main-loop pass was not read), and the excess is dropped, not carried. The units of `timesync` were not read; the 1000 suggests milliseconds. So bleed drips are 120 ticks at 50 Hz = 2.4 s, and gib motion is per logic tick, not per draw.

## 2. Key functions

- `actGib`: `/mnt/frankendom-donors/TurningWheel-Barony/src/actgib.cpp` 66-253. Removal, lifespan, horizontal motion, landing, gravity, the far-drop limit.
- `spawnGib`: `/mnt/frankendom-donors/TurningWheel-Barony/src/actgib.cpp` 962-1083. Sprite choice from the gib type, start position, random motion, behaviour.
- `serverSpawnGibForClient` and `spawnGibClient`: `/mnt/frankendom-donors/TurningWheel-Barony/src/actgib.cpp` 1539-1598. The 13-byte packet and the client-side rebuild.
- `Entity::handleEffects`, bleed block: `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` 6639-6754 (the function starts at 3810). Drip cadence, damage, floor and clear.
- `Entity::attack`, bleed roll and branch: `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` 16046-16148 (the function starts at 10097).
- `Entity::effectTimes`: `/mnt/frankendom-donors/TurningWheel-Barony/src/entity.cpp` 760 onward; the countdown at 1524-1528.
- `Entity::spawnBlood`: `/mnt/frankendom-donors/TurningWheel-Barony/src/monster_shared.cpp` 443-466.
- Tick loop: `/mnt/frankendom-donors/TurningWheel-Barony/src/game.cpp` 1265-1290, 4127-4140, 5309-5316.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Bleed roll with a chance gate, then a timer that does not stack for normal hits and extends for heavy hits | Roll odds 1/20 (sword band), 1/10 (sword), 1/4 (golem smash) (`entity.cpp:16054-16057`). Normal timer 480 + rand 0-359 - CON x 100, floor 120 ticks (`entity.cpp:16105`). Heavy first timer 500 + rand 0-499 - CON x 10, floor 250 (`entity.cpp:16122`). Heavy extension rand 0-349 - CON x 5, floor 100 (`entity.cpp:16136`). Sword capstone floor 250 (`entity.cpp:16090`) |
| Drip on a fixed period of the owner's age, only above a floor | Period 120 ticks (`entity.cpp:6641`), i.e. 2.4 s at 50 Hz (`input.cpp:5`). Floor 5 + max(0, CON) (`entity.cpp:6656`) |
| Damage from a share of max HP, with a random part and a stat reduction, floored at 1 | Base 1 + MAXHP / 30 (`entity.cpp:6658`); random reduction up to half the base (`6661`); CON / 5 (`6665`); cap 15 for four boss types (`6672`) |
| Gib start: random spread, upward kick, slow gravity, horizontal decay | Start z 8 to parent z - 4 (`actgib.cpp:1058`); horizontal 0.0-0.9 per tick (`1065`); vertical -0.5 (`1068`); gravity 0.04 per tick (`1069`); decay 0.95 per tick (`actgib.cpp:133`); landing z 8 (`233`); drop limit 128 (`246`) |
| Gib count per death | Gnome 10 (`monster_gnome.cpp:832`); goatman 1 plus 8 (`monster_goatman.cpp:732-736`) |
| Sprite per gib type | Type 1 sprite 5; type 2 sprite 211; type 4 sprite 683; type 5 sprite 688 when dead (`actgib.cpp:992-1034`) |
| Blood option | `spawn_blood` default true (`menu.cpp:203`) |
| Shake on a bleed tick | Local player: -0.03 and +3 (`entity.cpp:6682-6683`) |

Worked example (CON 0, MAXHP 300): base 11, random minus 0-4, so each 2.4 s drip is 7-11 HP, and the bleed ends once HP is 5 or less. Worked example (CON 0, first normal bleed): 480-839 ticks, i.e. 9.6-16.8 s. The donor's comment "2.4-16.8 seconds" matches the floor (120 ticks, reached only at CON 4 or more) and the top (839 ticks at CON 0).

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the bleed: the roll branch (normal, status-inflicted, heavy first, heavy extension, and no stacking for a normal roll on a bleeding target), then the per-tick countdown, then the drip on the age period with the floor check, the blood ward and the damage formula. It merges the separate countdown (`effectTimes`) and the drip (`handleEffects`) into one function, treats a timer above zero as "bleeding", omits the whip case, the mana cost, the camera shake and the SHAK packet, and the death path. The gib part keeps the spawn-independent motion: gravity, landing at z 8, horizontal decay, and the far-drop limit. It omits the delay-move branch, the per-gib decay field, the puddle on landing, the poof, and the lifespan and shrink path. The sketch's `solidBelow` stands for the donor's tile test (`actgib.cpp:213`).

```ts
// Licence: BSD-2-Clause (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const TICKS_PER_SECOND = 50;     // engine constant (donor input.cpp:5)
export const DRIP_PERIOD_TICKS = 120;   // engine constant: one drip per 120 ticks (2.4 s at 50 Hz)
export const BLEED_HP_FLOOR = 5;        // engine constant: no drip damage at or below 5 + CON
export const GIB_GRAVITY = 0.04;        // per tick (donor actgib.cpp:1069)
export const FLOOR_Z = 8;               // landing height (donor actgib.cpp:233)
export const DROP_LIMIT_Z = 128;        // removed when it falls past this (donor actgib.cpp:246)

// ---- wounds ----
export interface Wound {
  hp: number;
  maxHp: number;
  con: number;            // constitution stat
  timer: number;          // ticks of bleeding left; > 0 means bleeding
  age: number;            // ticks since the wound's owner was created
  bloodWard: boolean;     // blocks the bleed
  bossCap: number | null; // 15 for the four boss types in the donor, null otherwise
}

export interface HitRoll { heavy: boolean; inflicted: boolean; }

// Bleed from a landed hit. Per-hit roll (chance gate) is assumed done by the caller.
export function applyBleed(w: Wound, roll: HitRoll, rand: () => number): void {
  const wasBleeding = w.timer > 0;
  if ((!wasBleeding && !roll.heavy) || roll.inflicted) {
    // normal bleed, or a status-inflicted bleed with a 250-tick floor
    const normal = Math.max(480 + Math.floor(rand() * 360) - w.con * 100, 120);
    w.timer = roll.inflicted ? Math.max(w.timer, 250) : normal;
  } else if (roll.heavy) {
    if (!wasBleeding) {
      w.timer = Math.max(500 + Math.floor(rand() * 500) - w.con * 10, 250);
    } else {
      w.timer += Math.max(Math.floor(rand() * 350) - w.con * 5, 100);
    }
  }
  // else: a normal roll on a bleeding target changes nothing (no stacking)
}

// Once per tick. The timer counts down every tick; the drip runs on the age period.
// Returns damage dealt this tick. onGib is called on each drip (the donor spawns a gib there).
export function tickWound(w: Wound, rand: () => number, onGib: () => void): number {
  if (w.timer > 0) w.timer -= 1; // simplified: the donor counts down in a separate function
  w.age += 1;
  if (w.timer <= 0 || w.age % DRIP_PERIOD_TICKS !== 0) return 0;
  if (w.bloodWard) { w.timer = 0; return 0; }
  if (w.hp <= BLEED_HP_FLOOR + Math.max(0, w.con)) { w.timer = 0; return 0; } // ends the bleed at the floor
  let hurt = 1 + Math.floor(w.maxHp / 30);
  if (hurt > 1) hurt -= Math.floor(rand() * Math.max(1, Math.floor(hurt / 2)));
  if (w.con > 0) hurt -= Math.floor(w.con / 5);
  if (w.bossCap !== null) hurt = Math.min(hurt, w.bossCap);
  hurt = Math.max(1, hurt);
  w.hp -= hurt;
  onGib();
  return hurt;
}

// ---- gibs (cosmetic, client side in the donor) ----
export interface Gib { x: number; y: number; z: number; vx: number; vy: number; vz: number; landed: boolean; }

// One logic tick. solidBelow(x, y) is true when the cell under the gib has ground.
// Returns false when the gib should be removed.
export function stepGib(g: Gib, solidBelow: (x: number, y: number) => boolean): boolean {
  if (g.z === FLOOR_Z && Math.abs(g.vx) < 0.01 && Math.abs(g.vy) < 0.01) return false; // settled
  g.x += g.vx;
  g.y += g.vy;
  g.vx *= 0.95; // horizontal decay (the donor's delay-move and per-gib decay field are omitted)
  g.vy *= 0.95;
  if (g.z < FLOOR_Z || !solidBelow(g.x, g.y)) {
    g.vz += GIB_GRAVITY;
    g.z += g.vz;
  } else {
    g.vz = 0;
    g.z = FLOOR_Z;
    g.landed = true;
  }
  return g.z <= DROP_LIMIT_Z;
}
```

Typecheck: `work/barony-wounds-gibs.ts` plus `export {}`, copied to `/tmp/vf005-barony-wounds-gibs.ts` on the VPS, `npx -p typescript tsc --noEmit --strict --target es2020` exit 0.

## 5. Lands in

- TARGET `src/fight/wounds.ts` (engine, new): the bleed status, its roll and stacking rule, and the drip damage, applied through the one ledger on the server. The gib and blood-splat visuals are client-only and go in `src/fight/gore-fx.ts` (client).
- Parity-checklist row 8 (blood / wounds / decals).
- Reuse tag: rewrite-from-idea (BSD-2-Clause; code may be adapted, the sketch is clean-room)
- Brief rule served: 1 (one combat core, two clients: the drip is engine state and the gibs are client visuals); rules 7-9 n/a

Best transferable idea: Model a bleed as a timed status with a per-hit roll, a stacking rule that lets only heavy hits extend it, a drip on a fixed tick period that stops at an HP floor, and cosmetic gibs that are client-only and rebuilt from a shared start position.
Decision (proposed): adapt. Take the bleed rules (per-hit roll, normal-does-not-stack and heavy-extends split, HP floor that ends the bleed, fixed-period drip); reject the per-creature drip clock and the local shake units, since the drip must run on the shared fight tick through the one ledger.
Acceptance: A player sees a red gib drop and a short camera shake every 2.4 s while bleeding after a landed hit, and the bleed stops once HP is at the floor; a server test asserts each drip is one ledger entry of 1 + MAXHP / 30 minus CON / 5 (floor 1; without the random share unless Strategy keeps it), a normal hit on a bleeding target does not extend the bleed, and no drip applies at or below 5 + CON.

## 6. Gaps and risks

- BSD-2-Clause: code may be adapted. The sketch is written from the mechanism, not copied.
- The drip clock is the creature's own age (`entity.cpp:6641` with `Entity::ticks`, `entity.hpp:155`), so drips are staggered per creature. Frankendom's fight tick is shared; the drip should be on the shared tick, and the stagger must be a deliberate choice, not an accident of spawn time.
- The donor's drip has a random reduction (`entity.cpp:6661`). That is a per-drip roll on server-owned damage; Frankendom's server must decide whether it wants that roll, and seed it, before it is shipped.
- The bleed can kill. The drip calls `modHP` (`entity.cpp:6675`) and sets the obituary and killer (6676-6677); the death path was not read. Frankendom's kills are server-verified, so the drip must return a verified death through the one ledger, not kill locally.
- The behaviours run with `multiplayer` forced to SINGLE and `clientnum` set to 0 (`game.cpp:1269-1271`). The drip's server-versus-client role was not checked beyond that; treat it as unknown.
- The camera shake is -0.03 on x and +3 on y (`entity.cpp:6682-6683`); the scales differ and are probably a bug. Do not port the numbers. The world camera is the owner's priority; this shake is client-only and not designed here.
- Gibs are visual only and the server sends only a start position (`actgib.cpp:1586-1595`), truncated to 16 bits. Frankendom can send the same start point, but gib motion must stay client-side and must not drive any hit or kill.
- Null-dereference risk in the donor: `goatmanDie` sets `gib->skill[5]` on the result of `spawnGib` without a null check (`monster_goatman.cpp:732-733`). `spawnGib` returns null for gib type 0 and for gib type 5 while alive (`actgib.cpp:990` and `1031-1032`). Frankendom must check.
- The gore switch is inconsistent: `spawnBlood` ignores `spawn_blood` for any non-default sprite (`monster_shared.cpp:445`). Frankendom should have one gore setting that covers every splat.
- The blood-splat lifetime was not read, so the decal's persistence per zone is unknown. Zones as data would need a decal budget; the donor has none that I found.
- The horizontal decay is 0.95 per tick (`actgib.cpp:133`). A gib travels about 20 times its starting speed in total (derived from the geometric sum), so at most about 18 units, roughly one 16-unit tile. That is a visual bound, not a rule to copy.
- The death and gib counts (gnome 10, goatman 9) are per monster in code. Frankendom should move them into catalogue data, per the zones-as-data rule.
