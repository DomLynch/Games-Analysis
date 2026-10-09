# TurningWheel-Barony (vfx-blood-finishers, cell 13)

Donor: /mnt/frankendom-donors/TurningWheel-Barony/src/actgib.cpp | Licence: BSD-2 | C++ | symbol spawnGib / spawnDamageGib / actGib
Symbol check: spawnGib (962), spawnDamageGib (1379), actGib (66) and actDamageGib (839) confirmed. The file is 2733 lines. The gib sprite table is the per-monster-type switch inside spawnGib (987-1040).

## 1. Mechanism
- Two kinds of short-lived visual entity, both spawned on the host and drawn by each client. Nothing here changes game state.
- Gib (spawnGib): a blood or debris sprite spawned at the parent's position with a random z between 8 and the parent's z minus 4. The sprite is chosen from the parent's `gibtype[monster type]` (0 spawns no gib; 1 sprite 5; 2 sprite 211; 3 a slime colour lookup: green 211, blue 215, red 1401, tar 1402, metal 1403; 4 sprite 683; 5 sprite 688 only once the parent's HP is 0 or below and not for a revenant skull; anything else 5), or taken from a custom sprite. It gets random yaw, pitch and roll, a random horizontal speed (rand % 10) / 10 along the yaw, a fixed vertical speed -0.5, and gravity 0.04. Passable, unclickable, no-update flags are set; no life span is set (0 means none).
- actGib, once per tick, in this order: (1) removed (with a poof, if enabled) when z is exactly 8 and both horizontal speeds are under 0.01; (2) once ticks pass its life span (skill 4, only if non-zero) it is removed at once, or if a shrink rate (fskill 4) is set it loses that scale each tick and is removed when scale goes below 0; (3) horizontal motion: after an optional move delay (skill 8, which also extends the life span), yaw advances by speed times 0.05, x and y move, and speed decays by the decay setting (fskill 7) if above 0.001, else by 0.95 per tick; (4) a hit-ground event branch for sprite 245 gibs (see next bullet); (5) gravity: while z < 8, vertical speed gains gravity and z moves by it, with roll +0.1; at z >= 8 it checks the map tile under it: no tile (a pit) keeps it falling, a tile pins z to 8, zeroes vertical speed and sets roll to pi/2, and the first such touch sets a hit-ground flag; (6) removed when z passes 128. Sprites 1895-1903 on first ground touch spawn a misc puddle (sprite + 8) and the gib is removed.
- Special gib (sprite 245 with the sprite flag and `actGibHitGroundEvent` 1): every 5th tick it spawns a grease puddle spawner, and until it first touches ground it also spawns a magic particle each tick (the branch tests the hit-ground flag being 0).
- Damage number (spawnDamageGib): a floating entity spawned at the parent (z = parent z - 4, with a few special-case offsets for colliders, a bell, and duck children), with the damage amount in skill 0 (or, in sprite display mode, the amount as sprite index with scale 0.05 and skill 0 zero). Random yaw and speed (rand % 10) / 20 and vertical speed -0.5; for the stronger, strongest, miss and guard classes speed 0.25 and vertical speed -0.4. Its colour, stored in skill 6, is set by the damage class: stronger (238,150,75), strongest (235,94,0), heal the HUD's character-sheet green (value not read), everything else white. On a server with `updateClients` it is sent to every non-local connected client as a 12-byte "DMGG" packet (parent uid, amount as 16 bits, class byte, display-type byte).
- actDamageGib, per tick: removed when z >= 8 or at life end (life is 0 unless set elsewhere); drifts horizontally with yaw spin and speed decay 0.95. For weaker, weakest, miss and guard classes the scale is 0.2, shrinking to half over ticks 10 to 30 after tick 10; then the normal gravity branch applies (with the same pit and floor tile test as gibs, minus the hit-ground flag). For stronger and strongest the scale follows a loaded animation curve (`damageGibAnimCurves`, values loaded from GameUI.cpp config, contents not read) times 0.2, vertical speed gains half gravity and is clamped to at most -0.001 while the curve plays, and it is removed when ticks exceed the curve length plus 10. (The guard and miss tests in the second branch are unreachable because the first branch catches them.)
- Inputs: parent entity, damage amount, damage class, display type. Outputs: a client-side entity. Runs per tick on each client; the server sends only the damage packet. Gibs themselves are not sent by this file's server path (spawnGibClient at 1539 and the gib packet code are not read).

## 2. Key functions
- spawnGib (Barony) | /mnt/frankendom-donors/TurningWheel-Barony/src/actgib.cpp | 962-1083 | picks the gib sprite from the parent's monster type, places and throws it, sets behaviour to actGib (987-1040 is the sprite table).
- actGib (Barony) | /mnt/frankendom-donors/TurningWheel-Barony/src/actgib.cpp | 66-253 | per-tick settle removal, life and shrink, horizontal motion, sprite-245 ground event, gravity with pit check, z > 128 removal.
- spawnDamageGib (Barony) | /mnt/frankendom-donors/TurningWheel-Barony/src/actgib.cpp | 1379-1537 | damage floater: position, velocity, colour by class, server sends DMGG to clients.
- actDamageGib (Barony) | /mnt/frankendom-donors/TurningWheel-Barony/src/actgib.cpp | 839-951 | per-tick removal at z >= 8 or life end, drift, class-dependent scale; strong classes use an animation curve and half gravity.

## 3. Numbers vs mechanism
| Reusable algorithm | Game-specific constants |
|---|---|
| Spawn from a type-indexed sprite table, with a default for unknown types | gibtype table and sprite ids 5, 211, 215, 683, 688, 1401-1403 (theirs, lines 987-1040) |
| Random yaw and small random speed, fixed downward speed | speed (rand % 10) / 10 for gibs (line 1065), (rand % 10) / 20 for damage floaters, 0.25 for strong classes (lines 1398, 1402) (theirs) |
| Gravity term per entity | fskill 3 = 0.04 (theirs, lines 1069 and 1461; damage floaters of strong classes use half) |
| Remove when at ground height or life ends | ground height z == 8 (line 173), fall-out at z > 128 (line 246), life in ticks (theirs) |
| Colour by damage class, with an extra heal colour | class to colour map (238,150,75), (235,94,0) and the HUD sheet green (theirs, lines 1489, 1492, 1504) |
| Server tells clients a damage event, clients draw it | DMGG packet layout, 12 bytes (theirs, lines 1523-1530) |

## 4. TypeScript sketch
simplified: gibs only plus the floater colour map. Omitted: the gibtype table's none/conditional cases, random pitch and roll, the move delay, shrink-on-expiry, the pit/floor tile test and fall-out at z > 128, sprite-245 and puddle events, the whole damage-floater motion (class scales, animation curve, half gravity) and the DMGG packet. The settled test is `z >= 8` here, the donor tests `z == 8` exactly. Heal colour in the donor is the HUD's green, not pure green.

```ts
// Licence: BSD-2 (TurningWheel-Barony). Logic lifted from src/actgib.cpp
// (spawnGib, actGib, spawnDamageGib, actDamageGib) and rewritten in TS with local types.
interface Gib { x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number; ticks: number; life: number; sprite: number; }

const GRAVITY = 0.04;   // theirs (fskill 3)
const GROUND_Z = 8;     // theirs (remove height)
const DEFAULT_SPRITE = 5; // theirs

function spawnGib(px: number, py: number, pz: number, sprite: number | null, rnd: () => number, lifeTicks: number): Gib {  // rnd: 0..1
  const yaw = rnd() * Math.PI * 2;
  const speed = Math.floor(rnd() * 10) / 10;          // theirs: (rand % 10) / 10
  return {
    x: px, y: py, z: GROUND_Z + rnd() * (pz - 4 - GROUND_Z), // theirs: uniform(8, parent z - 4)
    vx: speed * Math.cos(yaw), vy: speed * Math.sin(yaw), vz: -0.5,
    yaw, ticks: 0, life: lifeTicks, sprite: sprite ?? DEFAULT_SPRITE,
  };
}

function stepGib(g: Gib): boolean {  // false when removed
  g.ticks += 1;
  if (g.z >= GROUND_Z && Math.abs(g.vx) < 0.01 && Math.abs(g.vy) < 0.01) return false; // settled
  if (g.life > 0 && g.ticks > g.life) return false;
  g.yaw += Math.hypot(g.vx, g.vy) * 0.05;
  g.x += g.vx; g.y += g.vy;
  g.vx *= 0.95; g.vy *= 0.95;                          // theirs: decay when no decay setting
  if (g.z < GROUND_Z) {                                // fall until ground height
    g.vz += GRAVITY;
    g.z += g.vz;
    if (g.z >= GROUND_Z) { g.z = GROUND_Z; g.vz = 0; }
  }
  return true;
}

const DAMAGE_COLOUR: Record<string, number> = {
  stronger: 0xee964b, strongest: 0xeb5e00, heal: 0x4caf50, default: 0xffffff, // stronger/strongest theirs; heal is a stand-in (donor uses a HUD colour, value not read)
};
function damageFloaterColour(cls: string): number {
  return DAMAGE_COLOUR[cls] ?? DAMAGE_COLOUR.default;
}
```

## 5. Lands in
- Frankendom file(s): gibs and blood: TARGET src/fight/gore-particles.ts (proposed new module; today src/gore.ts (moving)). Damage floaters: src/hud.ts today (moving), TARGET src/fight/damage-floaters.ts.
- Parity-checklist row: 8 (blood, wounds, pools, decals; K5) for gibs; 14 (HUD: bars, damage numbers; K10, Web) for the floaters, with row 10 (hit impact) as the trigger.
- Reuse tag: adapt (BSD-2, so the logic can be lifted; the sprite ids are Barony's own art)
- Brief rule served: (category default, not per-cell) 2 (engage is a state change); rules 7-9 n/a

## 6. Gaps and risks
- The gib itself is client-side and not replicated; the server sends only the damage number. That fits Frankendom's server-verified rule (one engine, server-verified kills, one ledger) for the damage value; with MAX_ATTACKERS = 3 the number of simultaneous floaters stays small, but a per-fight cap is still needed; but the blood visual must not decide state.
- Gib sprites are Barony's art. Frankendom needs its own gore art and a per-creature table.
- The gib tick is per engine tick, with no delta time in the step (positions advance by speed each call, decay 0.95 per call). Frankendom needs a clean frame-rate-independent step.
- Several gib types are marked "todo" in the donor, so that table is incomplete.
