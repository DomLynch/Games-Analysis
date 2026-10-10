# ValveSoftware-source-sdk-2013 (vfx-blood-finishers, cell 2)

Donor: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/fx_blood.cpp` (symbol `FX_BloodSpray`, 76-297; callback `BloodSprayCallback` 490-496), with `src/game/server/effects.cpp` (`UTIL_BloodSpray` 1149-1163; `CBlood::InputEmitBlood` 1168-1215) | Licence: Valve "Source 1 SDK LICENSE" (free use and modification; any distribution of the SDK must be free of charge and the game must meet Valve's Steam Subscriber Agreement terms) = restricted, clean-room | C++ | symbol `FX_BloodSpray`

Checked: Opened and read in full: `client/fx_blood.cpp` 36-300 and 466-531 (colour table lookup, `FX_BloodSpray`, the spray callbacks), 300-330 (bullet-impact variant, a separate function; read to line 330); `server/effects.cpp` 1145-1232 (`UTIL_BloodSpray`, `CBlood::InputEmitBlood`, console command); `server/hl2/npc_strider.cpp` 4355-4370 (one caller); `shared/shareddefs.h` 670-676 (layer bits). Grep only, not read: other callers (`server/episodic/npc_hunter.cpp:4347`, `server/hl2/npc_BaseZombie.cpp:2281`, `server/hl2/npc_barnacle.cpp:1670,1767,1770,2067,2069`); the hint `client/c_impact_effects.cpp` 880-953 (`FX_Blood`) is a four-particle puff used by the bloodsprite temp entity (`client/c_te_bloodsprite.cpp:138,153`), not the spray, so it is a fragment and not the mechanism. Not read: `RandomVector`, `WorldGetLightForPoint`, `UTIL_IsLowViolence` body, emitter integration (gravity and dampen application), `bloodcolors` table (`shared/effect_color_tables.h:42`), enclosing function name of the strider stab. Confidence: high for the spawn counts, ranges and order in `FX_BloodSpray` (read in full); medium for the on-screen motion, which depends on the emitter code not read. camera_scope: n/a.

## 1. Mechanism

- The server does not make particles. For each spray it dispatches one "bloodspray" effect message carrying origin, normal, `scale` (= the caller's amount), a colour index and a layer bitmask (`UTIL_BloodSpray`, effects.cpp 1149-1162; `data.m_flScale = (float)amount;` at 1158). The client builds the particles in `FX_BloodSpray` (fx_blood.cpp 498 registers the callback; 495 calls the function).
- Layer bits (shareddefs.h 672-675): DROPS 0x01, GORE 0x02, CLOUD 0x04, ALL 0xFF. `CBlood` maps its spawn flags onto these bits (effects.cpp 1195-1212; flags at 1063-1065). Other callers pass the bits directly, e.g. strider 4367-4368.
- Order inside `FX_BloodSpray` (client/fx_blood.cpp):
  (a) Low violence: return at once (78).
  (b) Tint: ambient light at the point (`WorldGetLightForPoint`, not read) times the colour / 255 (88).
  (c) Basis: if the normal is not exactly (0,0,1), `right = normal x (0,0,1)` (100) and `up = right x normal` (101). If it is exactly (0,0,1), `right = (0,0,1)` (105) and `up = right x normal`, which is zero (106). For (0,0,-1) the first branch already gives zero for both vectors. See Gaps.
  (d) DROPS layer, gated at 112-189. A trail emitter with gravity 600 (123) and velocity dampen 0.2 (127). Long drops: 14 (134). Each starts in a square patch around the origin, with offsets of up to 0.5 x scale along right and up (137-139; the donor's comment says circle); direction is normal plus a random vector of +/-0.3 (148); speed 4 to 40 x scale (150); upward kick 4 to 16 x scale (151); width 0.125 to 0.275 x scale (153); length 0.02 to 0.03 x scale (154); life 0.5 to 1.0 s (155). Short drops: 24 (163); direction normal plus +/-1 with z plus 0 to 1 (177-178); speed 2 to 25 x scale (180); upward kick 4 to 16 x scale (181); width 0.25 to 0.375 x scale (183); length 0.0025 to 0.005 x scale (184); life 0.5 to 1.0 s (185).
  (e) GORE or CLOUD, gated at 191. One emitter, gravity 0 (198).
  GORE: 6 particles (211). Start at origin + 0.5 x scale x normal (214) plus a square-patch jitter of up to 0.5 x scale along right and up (215-216). Velocity: random +/-0.2 plus normal x integer 10 to 100 (226-227). Life 0.3 s (223). Start size 0.25 to 1 x scale, end twice that (236-237). Alpha 200 to 255 fading to 0 (239-240).
  CLOUD: 6 particles (257). Start at origin + scale x normal (260) plus a square-patch jitter of up to 1 x scale along right and up (261-262). Velocity: random +/-0.5 plus normal x integer 100 to 200 (272-273). Life 0.5 to 0.8 s (269). Start size 1.5 to 2 x scale, end four times that (281-282). Alpha 80 to 128 fading to 0 (284-285).
  Both gore and cloud pick a colour ramp of 0.75 to 1.25 per particle; the product is clamped to 1.0 and then scaled to 255 (230-234, 275-279).
- Totals for one full spray (ALL, scale s): 14 + 24 drops, 6 gore, 6 cloud = 50 particles, all created in one call.
- Tick: none. A one-shot spawn; motion is handled by the emitters (not read). Nothing in the spray reads or writes game state.
- Callers that use it (grep, see Checked): the strider stab kill sends a full spray at scale 8 and then a drops-only spray at scale 11, at the same point (npc_strider.cpp 4367-4368), but only once the victim is dead (4361-4362). ALL includes the drops bit, so the drops are emitted twice in that case.

## 2. Key functions

- `FX_BloodSpray`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/client/fx_blood.cpp` 76-297 (basis 98-107; drops 112-189; gore and cloud 191-292).
- `BloodSprayCallback`: same file, 490-496 (colour index to RGB via `GetBloodColor`, 47-64, then calls `FX_BloodSpray`).
- `UTIL_BloodSpray`: `/mnt/frankendom-donors/ValveSoftware-source-sdk-2013/src/game/server/effects.cpp` 1149-1163 (builds `CEffectData`, dispatches "bloodspray").
- `CBlood::InputEmitBlood`: same file, 1168-1215 (spawn flags to layer bits at 1195-1212; amount passed as scale at 1213).
- Hint `FX_Blood` (`client/c_impact_effects.cpp` 880-953): four-particle puff, not used for the spray (see Checked).

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants |
|---|---|
| One scale number drives the sizes and speeds of every layer | Scale = caller's amount (theirs: 4 in `CC_BloodSpray` effects.cpp 1228; 8 and 11 in strider 4367-4368; 8 in barnacle 1670, not read) |
| Fixed particle counts per layer | Drops 14 long (fx_blood.cpp 134) and 24 short (163); gore 6 (211); cloud 6 (257) (theirs) |
| Speed bands, in units of scale | Long drops 4 to 40 (150); short 2 to 25 (180); gore velocity 10 to 100 along normal (227); cloud 100 to 200 along normal (273) (theirs) |
| Sizes, in units of scale | Long drop width 0.125 to 0.275 (153), length 0.02 to 0.03 (154); short width 0.25 to 0.375 (183), length 0.0025 to 0.005 (184); gore 0.25 to 1 (236); cloud 1.5 to 2 (281) (theirs) |
| Life | Drops 0.5 to 1.0 s (155, 185); gore 0.3 s (223); cloud 0.5 to 0.8 s (269) (theirs) |
| Gravity and dampen (drops only) | Gravity 600 (123), dampen 0.2 (127) (theirs; units per the donor's engine) |
| Layer bits | DROPS 0x01, GORE 0x02, CLOUD 0x04, ALL 0xFF (theirs, shareddefs.h 672-675) |
| Low-violence switch | Return before any particle (fx_blood.cpp 78) (theirs) |

Worked case: a scale-8 ALL spray gives long-drop speeds of 32 to 320 units and gore sizes of 2 to 8 units (theirs, with the arithmetic from lines 150 and 236). The donor units are not converted.

## 4. TypeScript sketch

simplified: The sketch returns particle specifications only. It does not draw, does not tint from ambient light, and does not integrate motion (no gravity or dampen applied, the donor's emitter is not read). It reorders nothing else. Two changes from the donor, both stated: (1) for a normal of exactly (0,0,1), the donor's `up` is zero (fx_blood.cpp 106), which collapses the offsets onto one line; the sketch uses fixed x and y axes instead (the donor also zeroes both vectors for (0,0,-1); the sketch handles both); (2) the donor's `RandomInt` is an integer; the sketch uses a float range. The donor's basis is not normalised (magnitude is sin of the angle to vertical for a unit normal), and the sketch keeps that.

```ts
// Licence: Valve Source 1 SDK licence (donor, restricted). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface V3 { x: number; y: number; z: number }
const add = (a: V3, b: V3): V3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });

// Spray layers, one bit each (donor: FX_BLOODSPRAY_DROPS 0x01, GORE 0x02, CLOUD 0x04).
export const SPRAY_DROPS = 0x01;
export const SPRAY_GORE = 0x02;
export const SPRAY_CLOUD = 0x04;

export interface Particle { layer: "drop-long" | "drop-short" | "gore" | "cloud"; pos: V3; vel: V3; life: number; gravity: number; width?: number; length?: number; sizeStart?: number; sizeEnd?: number }

// The caller supplies the random source (uniform range) and the vector helper.
export interface Rnd { f(lo: number, hi: number): number; vec(lo: number, hi: number): V3 }

// One call per spray. `scale` is the server amount (4, 8, 11 in the donor's callers).
export function bloodSpray(origin: V3, normal: V3, scale: number, flags: number, rnd: Rnd, lowViolence: boolean): Particle[] {
  if (lowViolence) return [];
  // Basis perpendicular to the normal. Donor: right = normal x up; up = right x normal.
  // Fallback for a vertical normal (the donor's cross product is zero there): use fixed axes.
  const vertical = normal.x === 0 && normal.y === 0 && Math.abs(normal.z) === 1;
  const right: V3 = vertical ? { x: 1, y: 0, z: 0 } : cross(normal, { x: 0, y: 0, z: 1 });
  const up: V3 = vertical ? { x: 0, y: 1, z: 0 } : cross(right, normal);
  const out: Particle[] = [];

  if (flags & SPRAY_DROPS) {
    // 14 long stringy drops, then 24 short ones. Gravity 600 (donor units); the donor also sets velocity dampen 0.2 (not modelled here).
    for (let i = 0; i < 14; i++) {
      const off = add(add(origin, mul(right, rnd.f(-0.5, 0.5) * scale)), mul(up, rnd.f(-0.5, 0.5) * scale));
      const dir = add(normal, rnd.vec(-0.3, 0.3));
      const vel = add(mul(dir, rnd.f(4 * scale, 40 * scale)), { x: 0, y: 0, z: rnd.f(4, 16) * scale });
      out.push({ layer: "drop-long", pos: off, vel, life: rnd.f(0.5, 1.0), gravity: 600, width: rnd.f(0.125, 0.275) * scale, length: rnd.f(0.02, 0.03) * scale });
    }
    for (let i = 0; i < 24; i++) {
      const off = add(add(origin, mul(right, rnd.f(-0.5, 0.5) * scale)), mul(up, rnd.f(-0.5, 0.5) * scale));
      const d0 = add(normal, rnd.vec(-1, 1));
      const dir = { x: d0.x, y: d0.y, z: d0.z + rnd.f(0, 1) };
      const vel = add(mul(dir, rnd.f(2 * scale, 25 * scale)), { x: 0, y: 0, z: rnd.f(4, 16) * scale });
      out.push({ layer: "drop-short", pos: off, vel, life: rnd.f(0.5, 1.0), gravity: 600, width: rnd.f(0.25, 0.375) * scale, length: rnd.f(0.0025, 0.005) * scale });
    }
  }
  if (flags & SPRAY_GORE) {
    // 6 tight gore particles at the exit point, short-lived, pushed along the normal.
    for (let i = 0; i < 6; i++) {
      const off = add(add(add(origin, mul(normal, 0.5 * scale)), mul(right, rnd.f(-0.5, 0.5) * scale)), mul(up, rnd.f(-0.5, 0.5) * scale));
      const vel = add(rnd.vec(-0.2, 0.2), mul(normal, rnd.f(10, 100)));
      const s = rnd.f(scale * 0.25, scale);
      out.push({ layer: "gore", pos: off, vel, life: 0.3, sizeStart: s, sizeEnd: s * 2, gravity: 0 });
    }
  }
  if (flags & SPRAY_CLOUD) {
    // 6 diffuse puffs just in front of the wound.
    for (let i = 0; i < 6; i++) {
      const off = add(add(add(origin, mul(normal, scale)), mul(right, rnd.f(-1, 1) * scale)), mul(up, rnd.f(-1, 1) * scale));
      const vel = add(rnd.vec(-0.5, 0.5), mul(normal, rnd.f(100, 200)));
      const s = rnd.f(scale * 1.5, scale * 2.0);
      out.push({ layer: "cloud", pos: off, vel, life: rnd.f(0.5, 0.8), sizeStart: s, sizeEnd: s * 4, gravity: 0 });
    }
  }
  return out;
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/sourcesdk-bloodspray.ts), exit 0.

## 5. Lands in

- TARGET `src/fight/blood-spray.ts` (new, client-only). The server sends one effect message per spray event with origin, normal, scale and layer bits; the client builds the particles. Health and the ledger are never touched. Parity-checklist row 8 (blood, wounds, decals).
- today: (not read; no Frankendom repo was opened in this pass).
- Reuse tag: rewrite-from-idea (Valve Source 1 SDK licence, restricted; clean-room, shape only)
- Brief rule served: 8 (blood, wounds, decals; client-only); rule 1 (the spray is a visual of a server-sent effect, not a second source of damage).
Best transferable idea: one scale number per hit sets the size and speed of several particle layers with fixed counts, and a bitmask chooses which layers show, so a light hit is small and a finisher can add a second layer without a new effect.
Decision (proposed): adapt - take the bitmask layers and the single scale knob (one gore amount per hit, from data), but set the counts from a phone particle budget; the donor's 50 particles per spray is a desktop-sized count, and its drops are double-counted when ALL and DROPS are both sent.
Acceptance: A 25-damage hit on a Pit gladiator sends one spray with scale from data and only the layers the data allows; a finisher adds a drops-only layer; with three attackers on screen, live gore particles stay under the budget field; with the low-violence setting on, no particles spawn.

## 6. Gaps and risks

- Phone budget: 50 particles per full spray, and three attackers can stack sprays (MAX_ATTACKERS = 3). Frankendom needs a live-particle cap; the donor has none (not in the donor, new).
- Vertical normal: the donor's `up` is zero for a normal of exactly (0,0,1) (fx_blood.cpp 105-106), and for (0,0,-1) both basis vectors are zero (100-101), so the offsets fall on one line. The sketch uses a fallback that the donor does not have. Frankendom should pick one rule and test it.
- Non-normalised basis: for a unit normal, the basis vectors have length equal to the sine of the angle to vertical, so the spread shrinks as the normal tilts toward vertical. That may be wanted on floors and walls; decide it, do not inherit it by accident.
- Double drops: the strider sends ALL (includes the drops bit, 0xFF) and then DROPS again at scale 11 (npc_strider.cpp 4367-4368). Frankendom's finisher must not send overlapping layers without a rule.
- Kill trigger: the strider sprays only when the victim is dead (4361-4362). That is a finisher-style gore event. It belongs with row 9 (finishers) and row 17 (death); the layer choice should come from the kill, not from the hit.
- Low violence: the donor gate is a client setting (fx_blood.cpp 78). Frankendom's setting is client-only, never a server rule.
- Colour: the donor tints from ambient light (88). Frankendom's grade (row 16) must agree, or blood will look grey on a dark Pit.
- Not read: `RandomVector`, `WorldGetLightForPoint`, emitter gravity and dampen, the colour table, the strider's enclosing function. Claims about how particles move are unverified.
