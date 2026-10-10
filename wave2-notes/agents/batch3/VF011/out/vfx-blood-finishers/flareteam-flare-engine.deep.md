# flareteam-flare-engine (vfx-blood-finishers, cell 13)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` (with `src/StatBlock.cpp`, `src/EntityBehavior.cpp`, `src/Camera.cpp`, `src/Utils.cpp`, `src/main.cpp`, `src/EngineSettings.cpp`) | Licence: GPL-3.0-or-later (file header of `src/EffectManager.cpp`: "either version 3 of the License, or (at your option) any later version"; COPYING is GPL v3, 29 June 2007) | C++ | symbols `Entity::takeHit`, `StatBlock::takeDamage`, `EntityBehavior` case `ENTITY_CRITDEAD`

Checked: Read the crit path end to end: `Entity::takeHit` (Entity.cpp 319-345 and 469-517), the death decision in `StatBlock::takeDamage` (StatBlock.cpp 879-933), the critical death state machine (EntityBehavior.cpp 905-962), the flag setup (Entity.cpp 994-999), the screen shake (Camera.cpp 42 and 100-135; `Camera::logic` from line 49 to 99 not read; Timer methods Utils.cpp 208-224), the logic loop (main.cpp 184-200; `logic_ticks` increment not read) and the defaults (EngineSettings.cpp 60-68, 355-365, 400-412). Confidence high on order of operations; not read: `Math::percentChanceF` and `randBetweenF` bodies (I assume a percent roll and an inclusive random range), `crit_chance` as filled by the power code, the `critdie` fallback to `die` (RELEASE_NOTES.txt 519 says so, the code path was not read), and the contents of the AI death power. Candidate files opened: `src/EffectManager.cpp` (the hint file: status effects, timed effects, stacking; no hit visuals; read 1-12, 137-146 and the function list, and grep for animation and sparkle words), `src/Entity.cpp` (also the poise block at 680-712, which is row 10 material and not written up here), `src/StatBlock.cpp`, `src/EntityBehavior.cpp`. Camera: the screen shake is noted only as a screen effect; the camera section was not part of this batch.

Best transferable idea: A killing blow that lands as a crit enters a separate finisher death state, decided in the same damage step, and only when the foe has a finisher clip; the sound, the clip and the corpse are cosmetic and follow that state.
Decision (proposed): adapt. Take the state split (crit kill to a finisher state, normal kill to the plain death state) and the rule that heroes never take the finisher. Reject the donor's client-side crit roll and client-side death: in Frankendom the server's damage step decides crit and kill, and the client only plays the finisher.
Acceptance: When the server's damage result reports a crit kill on a foe whose catalogue has a finisher clip, the foe plays that clip with one random sound from its list; its death AI power fires at the clip's second-last frame; it leaves a corpse that fades after the zone's corpse time. A normal kill plays the plain death, and a hero death never plays the finisher. A server test asserts that the crit flag and the kill come from the same damage result.

## 1. Mechanism

- One function applies a hit: `Entity::takeHit(Hazard &h)` (319). The defender is `stats`; the hit is `h`. Dead targets are skipped (339).
- Crit chance (475-487): start from `h.crit_chance`. Then, depending on the power's mode, MULTIPLY (chance x value / 100), ADD (chance + value) or ABSOLUTE (chance = value) (477-482). If the defender is stunned or slowed (speed < 100), add the power's `trait_crits_impaired` (485). Then `crit = Math::percentChanceF(chance)` (487).
- Crit damage (488-490): `dmg = dmg x randBetweenF(min_crit_damage, max_crit_damage) / 100`. The engine defaults are 200 and 200 (EngineSettings.cpp 360-361), so a crit is exactly double. The max is clamped up to the min when the file is read (406).
- Crit feel (491-493): only when the defender is not the hero (`if (!stats.hero)`): the camera shake timer is set to `max_frames_per_sec / 2` logic frames (492), and the joystick rumbles for 500 ms (493). So a crit against any non-hero shakes the screen.
- Crit text (516-517): a crit or an overhit on a non-hero shows the CRIT message. (Read; the text colour is not read.)
- Damage is applied (`stats.takeDamage(dmg, crit, h.source_type)`, after the miss and zero checks). The crit flag is passed in.
- Death (StatBlock.cpp 879-933, `takeDamage(float dmg, bool crit, int source_type)`): `hp -= effects.damageShields(dmg)` (880). If `hp <= 0`: hp is set to 0 and `triggered_death` is set (884). If the entity is the hero, it goes to `ENTITY_DEAD` and nothing else runs (888-889). Otherwise the rewards run first (XP at 924, loot at 927), and only then the state is chosen: `ENTITY_CRITDEAD` if `crit && critdie_enabled`, else `ENTITY_DEAD` (930-933).
- `critdie_enabled` is set per entity from its animation set: it is true only if the set has a `critdie` animation (Entity.cpp 994-999). The default is false (StatBlock.cpp 201).
- Critical death state (EntityBehavior.cpp 943-962). If `triggered_death` is set, the case breaks at once (944), so a death from a status effect skips the finisher. Otherwise: play the `critdie` animation (946). On the first frame, play one random sound from the list (Entity.cpp 191-195) and set the corpse timer to `corpse_timeout` (949). At the second-last frame (or the active frame if the clip has no default active frames) fire the AI death power and clear the status effects (951-956). At the last frame, or when the animation changes, set `corpse = true` and unblock the tile unless the corpse keeps collision (958-960 for the corpse flag; the unblock call is a few lines below 960 and is not receipted).
- Corpse time: `corpse_timeout = 60 * max_frames_per_sec` by default (EngineSettings.cpp 66), in logic frames.
- Shake per frame (Camera.cpp 113-124): `shake_timer.tick()` first. When it reaches zero, the offset is zero. Otherwise both axes get `rand() % (shake_strength x 2) - shake_strength`, scaled by 1/128 (0.0078125). With `shake_strength` 8 (42), that is an offset of -8/128 to +7/128 of a tile per axis, a new random value each logic frame.
- Timing: fixed logic step. `seconds_per_frame = 1 / max_frames_per_sec` (main.cpp 184). A while loop runs logic while `logic_ticks` is behind, capped at `max_frames_per_sec` loops per render (195). `GameStatePlay::logic` calls `mapr->logic` (GameStatePlay.cpp 921), which calls `cam.logic()` (MapRenderer.cpp 283, 328); the conditions around that call were not read. Timer countdowns are in logic frames (Utils.cpp 208-224).

## 2. Key functions

- `Entity::takeHit`: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` 319-517 (crit roll 475-487, crit damage and feel 488-493, text 516-517; read end to end for the crit path, skipping the power and hazard target checks at the top).
- `StatBlock::takeDamage`: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 879-933 (damage, death, rewards, state choice).
- Critical death state: `/mnt/frankendom-donors/flareteam-flare-engine/src/EntityBehavior.cpp` 943-962.
- Flag setup: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` 994-999.
- Screen shake: `/mnt/frankendom-donors/flareteam-flare-engine/src/Camera.cpp` 113-124 (logic) and 130-131 (warp reset); timer `/mnt/frankendom-donors/flareteam-flare-engine/src/Utils.cpp` 208-224.
- Loop: `/mnt/frankendom-donors/flareteam-flare-engine/src/main.cpp` 184-200.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Crit is a percent roll on a chance that the power can modify | Chance modes MULTIPLY / ADD / ABSOLUTE (Entity.cpp 476-482); stun or slow adds `trait_crits_impaired` (485); the values themselves were not read |
| Crit multiplies damage by a random percent in a range | 200 and 200 (EngineSettings.cpp 360-361): exact x2 by default; max clamped up to min (406) |
| Killing blow on a crit picks a different death state, only if the foe has the clip | `critdie_enabled` from the clip (Entity.cpp 998); heroes excluded (StatBlock.cpp 889) |
| Rewards come before the state is chosen | No number (order: 924, 927, then 930-933) |
| Finisher clip timing: death power and effects cleared at the second-last frame, corpse on the last | Frame rule (EntityBehavior.cpp 951-960); no number |
| Corpse time | 60 s, stored as 60 x fps logic frames (EngineSettings.cpp 66) |
| Screen shake on crit | Duration fps / 2 logic frames (Entity.cpp 492); offsets from rand() over 2 x 8, scaled by 1/128 (Camera.cpp 42, 120-121) |
| Rumble on crit | 500 ms (Entity.cpp 493) |

## 4. TypeScript sketch

simplified: keeps the donor order: the crit roll and the crit damage come before the kill check; a kill on a non-hero with a crit and a finisher clip becomes `critdead`; a hero never does. The screen shake is driven by the same crit, and the shake step mirrors the donor timer (tick first, zero offset when it reaches zero). The death clip is a frame step: corpse timer on frame 0, the death power and effects clear at the second-last frame, corpse on the last frame. It omits: the power's crit-chance modes and the impaired bonus (the chance is an input), the overhit path, the damage-shield and miss paths, the rewards and loot (the caller does them, before the state is read, as in the donor), the sound pick, the joystick rumble, the `triggered_death` break (effect deaths skip the clip in the donor; the sketch does not model effect deaths), and the tile unblock. The RNG is injected instead of `rand()`. Times are logic frames.

```ts
// Licence: GPL-3.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Rng = () => number; // uniform in [0, 1), injected instead of rand()

interface Cfg {
  fps: number;            // logic frames per second (donor max_frames_per_sec)
  critMinPct: number;     // donor min_crit_damage, percent (200 = x2)
  critMaxPct: number;     // donor max_crit_damage, percent (clamped up to min)
  shakeStrength: number;  // donor shake_strength (8)
  corpseTimeoutS: number; // donor corpse_timeout, seconds (60)
}

type DeathState = "alive" | "dead" | "critdead";

interface Foe {
  hp: number;
  isHero: boolean;
  hasCritdieClip: boolean;  // donor critdie_enabled (set from the animation set)
  state: DeathState;
  effectsCleared: boolean;
  corpseTimer: number;      // logic frames until the corpse fades
  corpse: boolean;
}

interface Screen {
  shakeTicks: number;       // donor Camera.shake_timer
}

interface HitOut {
  damage: number;
  crit: boolean;
  killed: boolean;
  state: DeathState;
}

// One hit. The crit roll decides damage and, for a killing blow, the death state.
export function resolveHit(
  foe: Foe, screen: Screen, raw: number, critChancePct: number, rng: Rng, cfg: Cfg,
): HitOut {
  if (foe.state !== "alive") {
    return { damage: 0, crit: false, killed: false, state: foe.state };
  }
  const crit = rng() * 100 < critChancePct;   // donor: Math::percentChanceF (body not read)
  let dmg = raw;
  if (crit) {
    const pct = cfg.critMinPct + rng() * (cfg.critMaxPct - cfg.critMinPct);
    dmg = (dmg * pct) / 100;
    if (!foe.isHero) {
      screen.shakeTicks = Math.floor(cfg.fps / 2);   // donor: setDuration(max_frames_per_sec / 2)
    }
  }
  foe.hp -= dmg;
  if (foe.hp > 0) {
    return { damage: dmg, crit, killed: false, state: "alive" };
  }
  foe.hp = 0;
  // Heroes never take the critical death state.
  const state: DeathState = !foe.isHero && crit && foe.hasCritdieClip ? "critdead" : "dead";
  foe.state = state;
  return { damage: dmg, crit, killed: true, state };
}

// Screen shake, once per logic frame. Mirrors the donor order: tick first, zero offset at the end.
export function shakeStep(screen: Screen, rng: Rng, cfg: Cfg): { x: number; y: number } {
  if (screen.shakeTicks > 0) screen.shakeTicks -= 1;
  if (screen.shakeTicks === 0) return { x: 0, y: 0 };
  const span = cfg.shakeStrength * 2;
  const x = (Math.floor(rng() * span) - cfg.shakeStrength) / 128; // donor 0.0078125 = 1/128 tile
  const y = (Math.floor(rng() * span) - cfg.shakeStrength) / 128;
  return { x, y };
}

// Critical death animation, once per logic frame; frames is the clip length in frames.
export function critDeathStep(
  foe: Foe, frame: number, frames: number, cfg: Cfg, firePowerDeath: () => void,
): void {
  if (foe.state !== "critdead") return;
  if (frame === 0) {
    foe.corpseTimer = Math.floor(cfg.corpseTimeoutS * cfg.fps); // donor: corpse timer on first frame
  }
  if (frame === frames - 2 && !foe.effectsCleared) {
    firePowerDeath();            // donor: AI death power at the second-last frame
    foe.effectsCleared = true;   // donor: status effects cleared there too
  }
  if (frame >= frames - 1) {
    foe.corpse = true;           // donor: corpse set on the last frame
  }
}

export {};
```

## 5. Lands in

- TARGET `src/fight/finisher.ts`: the engine's damage step decides crit and kill and returns a death kind (normal or finisher); the client plays the finisher clip, sound and corpse from that kind. The donor's order (rewards before the state) is kept on the server.
- Parity-checklist row 9 (finishers). The screen shake is a row 11 item (fight camera) and is not part of this note; the crit damage multiplier is a row 1 duel-step item.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one combat core, two clients): the server decides crit and kill, the client only plays them; rules 7-9 n/a.

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism.
- The donor rolls crit and kill in client-side C code. In Frankendom the server must decide both, and the finisher kind must travel with the kill event. A client-only crit roll would break server-verified kills.
- The donor fires the AI death power at the clip's second-last frame. Frankendom must not tie loot, XP or the kill itself to a clip frame: the kill, rewards and loot happen at the server damage step, before the state is read (as in the donor, StatBlock.cpp 924-933), and only the cosmetic clip waits for the frame.
- The donor skips the finisher when the death came from a status effect (EntityBehavior.cpp 944). Frankendom needs one rule for which deaths get a finisher, written in the kill event, not inferred on the client.
- Critical damage defaults to exactly x2 (EngineSettings.cpp 360-361). Frankendom should expose min and max as data (catalogue or zone) rather than copy the donor constant.
- The corpse time is an engine default of 60 s (EngineSettings.cpp 66). Frankendom should make it a zone data field, since a finisher in a Pit and a field kill may want different fades.
- The screen shake fires on any crit against a non-hero (Entity.cpp 491-492), not only the hero's attacks. The Pit camera is frozen and tuned, so a shake there is a visible change to a locked view: keep it off in the Pit unless the owner rules otherwise.
- Adjacent, not written up: the poise rules (Entity.cpp 680-712) decide whether a hit enters the flinch state, and crits ignore poise. That is row 10 material and would need its own cell.
- The release note says a missing `critdie` clip falls back to `die` (RELEASE_NOTES.txt 519). I read only the flag setup (Entity.cpp 994-999), not the fallback code, so I do not claim the fallback.
- Pattern tags and the screen shake are client-side; the `triggered_death` rule and the frame timing mean the finisher is not a server tick item.
