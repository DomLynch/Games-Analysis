# electronicarts-CnC_Remastered_Collection (animation-rigs, cell 3)

Donor: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/ANIM.CPP` | Licence: GPL-3.0-or-later (`ANIM.H` header line 7: "either version 3 of the License, or (at your option) any later version") plus Electronic Arts' section 7 additional terms (`LICENSE.md` line 601 onward: no trademark or publicity rights, indemnity on conveyance, no misrepresentation of origin); treated as restricted: clean-room, shape only | C++ | symbol `AnimClass::AI`

Checked: `ANIM.CPP` 725-881 (`AnimClass::AI`) read in full; `Attach_To` 900-912 and `Center_Coord` 186-193 read; `Start` 979-1012 read; the constructor 576-647 read; `Chain` 1207-1225 and `Shorten_Attached_Anims` 117-128 read; `Middle` 1031-1060 read (start only; the crater and scorch code from 1060 to 1207 was not read). `STAGE.H` 38-94 (`StageClass`) read. `ADATA.CPP` 418-490 (the burn types) and 2562-2572 (the type constructor) read. `TERRAIN.CPP` 172-188 read (the one caller of `Shorten_Attached_Anims`). Attach call sites found by grep, not read in context: `BUILDING.CPP` 830, 862, 1576, 1628; `TECHNO.CPP` 2389; `TERRAIN.CPP` 480, 484; `UNIT.CPP` 1029, 1038. Not read: what calls `AnimClass::AI` and how often (the game tick driver), `Get_Build_Frame_Count`, `OptionsClass::Normalize_Delay` (`OPTIONS.CPP` 768), the render path, the flame-thrower types. Confidence: high on the AI order, the attachment offset and the damage accumulator; medium on the tick rate (not read). camera_scope: not applicable (animation cell).

## 1. Mechanism

An effect object (`AnimClass`) plays a sequence of stages over the map. It can be attached to an object, so that it follows the object at a stored offset while it deals fire damage to that object.

Attachment (900-912, 186-193): when attached, the effect's coordinate becomes its offset from the object's centre (911). Its world position is always that offset plus the object's current centre (190). So a fire on a building stays at the same spot on the building while the building moves.

Timing: each type has a rate in game ticks per stage, from the type's delay (constructor 591-593, normalized if the type asks for it). `StageClass::Graphic_Logic` (`STAGE.H` 71-81) counts the timer down each logic tick and, at zero, advances the stage and reloads the timer. A rate of 0 never advances.

`AnimClass::AI` (725-881), once per logic tick, in order:
(a) Kill time against the system clock: if set and reached, the effect is deleted (747-755). This is wall-clock time, not game ticks.
(b) Delete flag: delete and return (761-764).
(c) Brand-new: the first logic tick after creation is skipped (771-774).
(d) Lazy init of stage counts for loaded saves (779-784).
(e) Delay: while `Delay` is above 0 it counts down, and at zero calls `Start()` (786-790). Nothing else runs on delay ticks. `Start()` plays the sound, calls `Middle()` when the type has no biggest stage (996-998), and attaches a sticky effect to a gunboat unit on its cell (1005-1010).
(f) Otherwise the effect is marked for redraw (799) and `Graphic_Logic` runs (801). Only when the stage advances does the rest run:
  - Damage (809-830): if the effect is attached, the type has a damage value, and the stage is before the last stage, then accum += damage (812). If accum > 255, `accum >> 8` whole points are taken from the attached object as fire (820-821). If the object is destroyed, the effect is deleted (822-827). Then the accumulator keeps `accum & 0xFF` (830).
  - Middle event when `Start + stage == Biggest` (838-840). Craters and scorch marks are placed there (comment at 833-837; the code was not read).
  - Loop or end (846-877): with at most one loop left the pass ends at the last stage; with more loops left it ends at `LoopEnd` (846). On a pass end, `Loops` is decremented while above 0 (852). If loops remain, the stage jumps back to `LoopStart` (854). If not, the effect chains to the type's next type if one is set (859-861), otherwise it is deleted.

Chain (1207-1225): the effect swaps to the new type in place, reloads the rate and sets the stage to the new type's start (1216-1223).

Loop count (615-619): `Delay` is the constructor argument (615). `Loops` = max(loop argument, 1) x the type's loop count, and at least 1.

Burn types (`ADATA.CPP` 422-490): BURN-S, BURN-M and BURN-L are ground-layer effects (432, 455, 478) with damage 8, 16 and 24 per stage advance in 8.8 fixed point (435, 458, 481), delay 1 (436), loop start 30 (438), loop end 62 (439), loop count 4 (441), biggest stage 13 (426; 449 and 472 for the others). The chain targets are the smoke type for BURN-S (443), BURN-S for BURN-M (466), and BURN-M for BURN-L (489). With rate 1 the stage advances on every logic tick, so the table value is the damage per tick, as its comment says (435).

Derived timing for BURN-S (my reading of 846-877, not a measured playback): the first pass runs stages 0 to 62. With four loops there are three jumps back to stage 30 (after passes 1 to 3), and the last pass runs from 30 to the last stage (the stage count comes from the image through `Get_Build_Frame_Count`, not read). Damage: 8 per advance, so a point is taken on every 32nd advance (256 / 8). BURN-M takes a point every 16 advances. BURN-L takes one about every 11 advances (24 per advance; the accumulator carries the remainder).

Burning terrain (`TERRAIN.CPP` 177-183, `ANIM.CPP` 117-128): when a burning terrain object is destroyed, every effect attached to it has its loops set to 0. Such an effect plays out to its last stage and does not loop again.

## 2. Key functions

- `AnimClass::AI`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/ANIM.CPP` 725-881. The whole per-tick sequence (a) to (f).
- `AnimClass::Attach_To`: same file, 900-912. `AnimClass::Center_Coord`: 186-193.
- `AnimClass::Start`: same file, 979-1012. `AnimClass::Chain`: 1207-1225. `Shorten_Attached_Anims`: 117-128.
- Constructor: same file, 576-647.
- `StageClass::Graphic_Logic`: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/STAGE.H` 71-81.
- Type constructor and the burn table: `/mnt/frankendom-donors/electronicarts-CnC_Remastered_Collection/TIBERIANDAWN/ADATA.CPP` 2562-2572 and 418-490.
- Callers: the attach call sites listed in the Checked line; the one caller of `Shorten_Attached_Anims` at `TERRAIN.CPP` 183.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Effect follows an object at a stored offset: offset from the centre at attach, plus the centre on each read | None (math). Attach at `ANIM.CPP` 911, read at 190. |
| Frame timer: count down, advance, reload | Rate = type delay; burn types use 1 (`ADATA.CPP` 436), so one stage per logic tick |
| Loop passes that jump back to a loop-start stage, with a loop count | Loop start 30 (438), loop end 62 (439), loops 4 (441) |
| Fire damage as a fraction per advance; one whole point per 256 accumulated | BURN-S 8, BURN-M 16, BURN-L 24 per advance (435, 458, 481) |
| Remainder carried to the next advance | 8-bit accumulator (830) |
| Burning object's effects are cut short | Loops set to 0 (`ANIM.CPP` 124) |
| Chain to a follow-on effect | Smoke for BURN-S (443); BURN-S for BURN-M (466); BURN-M for BURN-L (489) |

Units: logic ticks, stages, and 8.8 fixed point for damage. Screen units were not converted.

## 4. TypeScript sketch

simplified: the sketch keeps the donor order inside one tick: brand-new skip, delay countdown, stage timer, damage on an advance, then the loop and end test with chain. It omits the wall-clock kill time (749-754, left out on purpose, see section 6), the delete flag, the lazy init for loaded saves, the start side effects at the end of the delay (sound, the sticky gunboat attach, the middle call when there is no biggest stage), the middle event at the biggest stage (838-840), the virtual twin and virtual stages (639-646, 856-876), the redraw marks, the visibility flags, the owner used for blame, and the negative loop-count branch (620-621). The sketch takes a damage callback instead of calling the object directly.

```ts
// Licence: GPL-3.0-or-later with EA section 7 additional terms (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export interface EffectType {
  rate: number;          // game ticks per stage; 0 means the stage never advances
  start: number;         // first stage
  loopStart: number;     // stage to jump back to when a loop pass ends
  loopEnd: number;       // stage that ends a loop pass when more than one loop is left
  stages: number;        // total stages; the last pass ends here
  loops: number;         // loop count per type (multiplied by the instance's loop argument)
  damage: number;        // per stage advance, 8.8 fixed point: 256 = one whole point
  chainTo: EffectType | null;
}

export interface Vec2 { x: number; y: number; }

export interface Effect {
  type: EffectType;
  stage: number;
  timer: number;                   // ticks until the next stage advance
  loops: number;                   // loop passes still to play
  delay: number;                   // ticks before the first stage
  brandNew: boolean;               // skip the first logic tick after creation
  offset: Vec2;                    // offset from the object centre when attached, else world position
  centre: (() => Vec2) | null;     // object centre getter when attached
  accum: number;                   // fractional damage, 0..255
  alive: boolean;
}

export function create(type: EffectType, at: Vec2, delay: number, loopArg: number): Effect {
  const loops = Math.max(Math.max(loopArg, 1) * type.loops, 1);
  return { type, stage: 0, timer: type.rate, loops, delay, brandNew: true, offset: at, centre: null, accum: 0, alive: true };
}

// Attach: store the offset from the object's centre now; the world position follows the object from then on.
export function attach(e: Effect, centre: () => Vec2): void {
  const c = centre();
  e.offset = { x: e.offset.x - c.x, y: e.offset.y - c.y };
  e.centre = centre;
}

export function worldPos(e: Effect): Vec2 {
  if (!e.centre) return e.offset;
  const c = e.centre();
  return { x: e.offset.x + c.x, y: e.offset.y + c.y };
}

// One game tick. damage() applies whole points to the attached object and returns false if that object was destroyed.
// Returns true while the effect is alive.
export function tick(e: Effect, damage: (points: number) => boolean): boolean {
  if (!e.alive) return false;
  if (e.brandNew) { e.brandNew = false; return true; }
  if (e.delay > 0) {
    e.delay--;
    return true;                         // the start-of-effect side effects (sound, sticky attach) are omitted
  }
  if (e.type.rate === 0) return true;    // a zero rate never advances the stage
  e.timer--;
  if (e.timer > 0) return true;
  e.timer = e.type.rate;
  e.stage++;

  // damage accumulates per stage advance; a whole point is taken when the fraction passes 255
  if (e.centre && e.type.damage > 0 && e.stage < e.type.stages) {
    const acc = e.accum + e.type.damage;
    if (acc > 255) {
      if (!damage(acc >> 8)) { e.alive = false; return false; }
    }
    e.accum = acc & 0xff;
  }

  // loop or end: a pass ends at loopEnd while looping, and at the last stage on the final pass
  const lastPass = e.loops <= 1 ? e.stage >= e.type.stages : e.stage >= e.type.loopEnd - e.type.start;
  if (lastPass) {
    if (e.loops > 0) e.loops--;
    if (e.loops !== 0) {
      e.stage = e.type.loopStart;
    } else if (e.type.chainTo) {
      e.type = e.type.chainTo;           // chain: the same effect continues as the new type
      e.timer = e.type.rate;
      e.stage = e.type.start;
    } else {
      e.alive = false;
      return false;
    }
  }
  return true;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `origins/client/fx/attached-effect.ts` (proposed path, not checked against the repo). Client-only effect layer. Its damage goes through the engine's one damage step (checklist row 1), never through a write by the effect. Parity-checklist row 7 (creature actor/clips), for effects attached to a creature. The hero would use the same module under row 6.
- today: none. The Frankendom effect code was not checked against the repo.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later with EA section 7 terms, treated as restricted: clean-room only; shape only)
- Brief rule served: 1 (one combat core, two clients: the effect is a client-only pass, and any damage it causes goes through the one engine damage step); rules 7-9 n/a

## 6. Gaps and risks

- Wall-clock kill time (`ANIM.CPP` 749-754) ends an effect by the system clock, so two machines can end it on different ticks. Frankendom must end effects on game ticks only.
- Direct damage. The donor's `Take_Damage` call (821) is the effect writing to the object. In Frankendom an effect may only request damage; the server or the one engine step applies it. A client-side burn is not server-verified, so it cannot change a kill.
- Attribution. A blast's damage is blamed on a house so the kill is credited (`Middle` 1037-1059, with the comment at 1039-1043). Frankendom credits kills only through server-verified kills and the one ledger. Effects carry no kill credit.
- Sync. Invisible effects exist only to keep machines in step (`ANIM.H` 157-161; the virtual twin at 639-646). Frankendom has its own sync rules; do not copy this for sync.
- Frame rate. The stage advances once per logic tick, so the timing is tied to the logic tick. A browser renders at a variable frame rate, so the effect clock must be the game tick (the server tick or a fixed client tick), not the render frame.
- Zones as data. Rates, loop counts and damage per advance are per effect type (`ADATA.CPP`). In Frankendom they are effect data. Burn damage per advance is a per-type constant, not a per-zone value.
- The loop timing for BURN-S (three jumps back to stage 30 for four loops) is derived by hand from 846-877. It was not measured by running the game.
- The stage count comes from the image (`Get_Build_Frame_Count`, not read). The sketch takes stage counts as data.
- Nothing here touches MAX_ATTACKERS or the Pit. The effect is a client layer.

Best transferable idea: Attach an effect to its object by storing its offset from the object's centre and adding the centre back on each read, so fire stays on the same spot as the object moves, while its fractional damage accumulates per advance and whole points go through one damage step.
Decision (proposed): adapt - attach effects to hero and creature anchors as a client-only offset-follow, with the damage callback routed through the engine's damage step, ticks instead of wall-clock, and no effect-owned kill credit.
Acceptance: Player sees: a burning creature keeps its flame on the same body spot while it moves, and the flame ends on the same game tick on every client; a server test asserts that one whole damage point is applied per 256 of accumulated fire damage, through the engine damage step, and that kill credit is unchanged by the effect.

Reuse tag: rewrite-from-idea (GPL-3.0-or-later with EA section 7 terms, treated as restricted: clean-room only; shape only)
Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a
