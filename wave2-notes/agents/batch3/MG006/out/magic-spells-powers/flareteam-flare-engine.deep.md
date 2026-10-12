# flareteam-flare-engine (magic-spells-powers, cell 1)

Donor: `/mnt/frankendom-donors/flareteam-flare-engine/src/PowerManager.cpp` | Licence: GPL-3.0-or-later (as read) | C++ | symbol `PowerManager::activate`

Checked: Read in full: `PowerManager::activate` (2031-2108), `payPowerCost` (2110-2155), `spawn` (1866-1928), `effect` (from 1587 to the end of the function), `checkPowerCost` and `checkRequiredResourceState` (2382-2477); `StatBlock::canUsePower` (1323-1361), `StatBlock::logic` regen and DOT (1074-1215), `summonLimitReached` and `removeSummons` (1429-1477), `applyResistToDamage` (1644-1657); `EffectManager::addEffect` (528-600); the hit path in `Entity.cpp` (425-470 and 680-712). Cooldown gate found in the client UI and NPC AI (MenuActionBar.cpp:418, MenuInventory.cpp:799, EntityBehavior.cpp:662); NOT read: the hero action-queue re-check in `Avatar.cpp` beyond 625-650, the death handler `Killed`, the cast animation state machine. The power catalogue is not in this box (`mods/default/engine` holds engine settings only), so the spell numbers below are the engine's field ranges and defaults, not a real spell list. Confidence: high on cost, summon, absorb and resist mechanics; medium on cooldown gating (two client paths read, the server-side path does not exist in this donor). Camera: not applicable.

Best transferable idea: A per-power summon cap (fixed, or scaled by a primary stat with a floor of 1) checked at cast time, plus removing all of a summoner's minions in the same tick the summoner dies, gives a many-on-one minion fight a bounded, self-cleaning shape.
Decision (proposed): adapt. Take the cap-at-cast and the summoner-linked removal; reject the donor's client-only cooldown gate (Frankendom needs the cooldown and cost checks on the server cast path, since the server owns the fight); fix the mismatched HP boundary (see section 6).
Acceptance: A server test casts a 4th minion power while 3 of that power's minions are alive and asserts the cast is rejected; killing the summoner removes its 3 minions in the same tick; a hit on a non-poised casting enemy cancels the cast unless the power is flagged `preventInterrupt` (in the donor this cancel is for non-hero casters; heroes only enter the hit state). Frankendom applies the cost, cooldown and cap checks to every caster, which the donor does not.

## 1. Mechanism

- Data. A power is a record loaded by `PowerManager::loadPowers` (PowerManager.cpp:333). Fields this note uses: `requires_mp` (483), `requires_hp` (487), `sacrifice` (509), `cooldown` in ms or s (579), `spawn_limit` mode and count (1062-1080), `prevent_interrupt` (421-423). Cooldown per power is a stored duration (PowerManager.h:261).
- Cast gate, hero: `StatBlock::canUsePower` (1323-1361) returns true at once for every non-hero ("AI can always use their powers", ~1329), so the cost checks and the summon cap below apply to heroes only; an enemy caster is not held by them in this function. For a hero it returns true only when `checkPowerCost` passes (1347), the caster is not stunned unless a passive (1350), `checkRequiredResourceState` passes, `requires_spawns` passes (1353), and for a spawn power `summonLimitReached` is false (1355). Items and flags are checked after that. The cooldown is NOT in this function. The hero action bar disables a slot while its cooldown timer runs (MenuActionBar.cpp:418), and the inventory use path checks the same timer (MenuInventory.cpp:799).
- Cast gate, NPC: the NPC AI only picks a power whose own cooldown has ended (EntityBehavior.cpp:662), and the NPC's power list is also filtered by `requires_spawns` (StatBlock.cpp:1568-1569, read in part).
- Activation, `PowerManager::activate` (2031-2108), in order: (a) hero-only MP gate (2038) and per-resource gate (2041-2044); (b) corpse target for hero powers that need one; (c) HP gate: if the caster has hp > 0, the power is not a sacrifice, and `requires_hp >= hp`, the cast fails (2053); (d) block type goes to its own function; (e) cast-trigger script; (f) optional snap of the target to 8 directions; (g) dispatch on power type: fixed, missile, repeater, spawn, transform.
- Payment, `payPowerCost` (2110-2155): inside a hero-only branch, MP is reduced by `requires_mp` (2115); resource stats are reduced the same way (2117); required items are reserved (the loop after 2117); `requires_hp` is taken as neutral self-damage through `takeDamage` (2143); a consumed corpse is removed (the last block of the function). Each spawn, missile and repeater path pays at its own point (for example spawn pays at 1918).
- Cooldown start: an instant power sets its cooldown when it fires (Avatar.cpp:639-640); a cast-animation power sets it when the animation reaches its trigger frame (Avatar.cpp:807-808). NPC cooldown is set by `setPowerCooldown` (StatBlock.cpp:1613).
- Spawn, `PowerManager::spawn` (1866-1928): picks a spawn point (source, target, melee range, or a random neighbour); if that cell is blocked it tries a neighbour of the caster, and if still blocked it aborts with no cost paid (1900 comment, and the early return after it). It queues `count` creatures (1911-1912), applies buffs, pays the cost (1918), and plays a sound (1921).
- Summon cap, `StatBlock::summonLimitReached` (1439-1477): mode `fixed` gives the count (1449); mode `stat` gives `count * (primary stat / ratio)` truncated to int (1456); the result is floored at 1 (1464); the function counts this power's summons that are not dead (1471) and returns `qty_summons >= max_summons` (1476). Unlimited or unknown mode returns false (same function, read). Only power type SPAWN is capped (1355).
- Summoner link. Each summon records its summoner (EntityManager.cpp:261). When a summoner's HP is zero in `StatBlock::logic` (1279-1280), `removeSummons` gives every summon a full-HP hit, recurses into their summons, and clears the list (1429-1437). The destructor also calls it (StatBlock.cpp:235).
- Hit interrupt, `Entity.cpp` (680-712). A hit can interrupt a casting creature only when its `cooldown_hit` window has ended (695); the window length is data per creature (StatBlock.cpp:257). Poise is decided by `poise_style`: chance (686), HP fraction (the branch just above 686), or absorbed fraction (692). The interrupt happens only if the creature is not stunned, the hit is not poised or is critical, and `prevent_interrupt` is false (698). A hero only goes to the hit state; the power cancel (cooldown reset and `activated_power` cleared) happens for non-heroes only (~700-706). A hero's cast is not cancelled by the code at that point. Heroes copy `prevent_interrupt` from the power when they cast (Avatar.cpp:987).
- Stun. Any damage that is above zero, or a power with `ignore_zero_damage`, removes stun (Entity.cpp:537-538).
- Damage order for a hit (Entity.cpp, around 425-463): each damage type is resisted first (428: `dmg += stats.applyResistToDamage(i, dmg_part)`); then, unless the power has `trait_armor_penetration` (432), absorption is drawn between `ABS_MIN` and `ABS_MAX` (434), clamped to the min and max absorb percent of the hit (446, 448), made at least 1 when it is 0 (454), and subtracted (457). When the target is in a triggered block the same clamp uses the `min_block` and `max_block` settings instead (~441-446), and the 1-damage floor uses `max_block`. If the hit is then zero, the hit becomes 1 only when the matching max (absorb or block) is below 100 and the power does not have `ignore_zero_damage` (463).
- Resist, `applyResistToDamage` (1644-1656): a resist value is clamped to `min_resist..max_resist` (the min clamp at 1650, the max clamp just after it; engine defaults 0 and 100 at EngineSettings.cpp:352-353), but negative values (weakness) are not clamped; the result is `damage * (100 - resist) / 100` (1656). Typed DOT uses the same function (1200).
- Status effects, `PowerManager::effect` (1587-1683): each post-effect rolls its own `chance` (1595), skips a target that is dead unless the effect revives (1605), and calls `EffectManager::addEffect` (1669). Before a copy is added, the target may resist it by a percent chance from a stat: DOT (EffectManager.cpp:533), stun (541), and others in the same block (e.g. slow below 100 percent, knockback, stat debuffs; read in part).
- Non-stacking rule, `addEffect` (584-591): an effect that cannot stack is dropped if the new copy is shorter than the remaining time and has the same magnitude as the stored maximum (585); otherwise the old copy is removed (591) and the new one is added.
- Effect types (EffectManager.h:36-55): NONE, DAMAGE, DAMAGE_PERCENT, HPOT, HPOT_PERCENT, MPOT, MPOT_PERCENT, SPEED, ATTACK_SPEED, RESIST_ALL, STUN (47), REVIVE, CONVERT, FEAR (50), DEATH_SENTENCE (51), SHIELD, HEAL, KNOCKBACK (54). There is no charm, silence, root or sleep type by name. Grep for diminishing returns and global cooldown returned nothing (`src/`).
- Regen. Each frame, MP regen is `MP_REGEN / 60 / max_frames_per_sec` (1154) and only while hp > 0 and mp <= max (1153). HP regen uses `HP_REGEN / 60` per frame (1146) for every actor that is not the resting-enemy case, so in-combat enemies use it too, not only heroes and allies. An enemy out of combat heals to full over `resting_hp_regen_seconds` (default 5 s, 162; used at 1142). Resource stats regen the same way (1165). The regen stats are "per minute" in the engine text (resource_stats.txt:24).

## 2. Key functions

- `PowerManager::activate`: `/mnt/frankendom-donors/flareteam-flare-engine/src/PowerManager.cpp` 2031-2108 (cost gates, HP gate, dispatch).
- `PowerManager::payPowerCost`: `/mnt/frankendom-donors/flareteam-flare-engine/src/PowerManager.cpp` 2110-2155 (MP, resources, items, self-damage cost, corpse).
- `PowerManager::spawn`: `/mnt/frankendom-donors/flareteam-flare-engine/src/PowerManager.cpp` 1866-1928 (spawn point search, count, buff, cost).
- `StatBlock::canUsePower`: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 1323-1361 (gate list; no cooldown here).
- `StatBlock::summonLimitReached` and `removeSummons`: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 1429-1477.
- `StatBlock::applyResistToDamage`: `/mnt/frankendom-donors/flareteam-flare-engine/src/StatBlock.cpp` 1644-1657.
- Hit absorb and interrupt: `/mnt/frankendom-donors/flareteam-flare-engine/src/Entity.cpp` 428-463 and 680-712.
- `EffectManager::addEffect`: `/mnt/frankendom-donors/flareteam-flare-engine/src/EffectManager.cpp` 528-600.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Cast gate: cost, cooldown, cap; cost paid on cast | Cooldown in ms or s per power (PowerManager.cpp:579); `requires_mp` float (483); `requires_hp` float (487); cap per power (1071) |
| Summon cap: fixed count, or count times stat over ratio, truncated, floor 1 | `spawn_limit_count` (1071), `spawn_limit_ratio` default 1 (PowerManager.cpp:158), floor 1 (StatBlock.cpp:1464) |
| Summons die with the summoner, same tick | Full-HP damage to each summon (StatBlock.cpp:1431); hook at HP 0 (1280) |
| Hit cancels a cast unless poised, stunned or flagged | `cooldown_hit` window per creature (StatBlock.cpp:257); poise style (Entity.cpp:686, 692); `prevent_interrupt` (PowerManager.h:198) |
| Absorb: draw in a range, clamp as a share of the hit, floor at 1 | Engine defaults absorb min 0, max 100 (EngineSettings.cpp:350-351); the floor of 1 is code (Entity.cpp:454) |
| Resist: clamp, then scale; weakness is unclamped | Engine defaults resist min 0, max 100 (EngineSettings.cpp:352-353); `(100 - resist) / 100` (StatBlock.cpp:1656) |
| Regen per tick from a per-minute stat | `/ 60` (StatBlock.cpp:1154); divided by frames per second (not delta time) |
| Non-stacking effect: keep the stronger copy | Shorter AND same magnitude is dropped (EffectManager.cpp:585) |

## 4. TypeScript sketch

simplified: The sketch keeps the donor's order of checks, the cap rule and the absorb clamp. It omits the item and corpse costs, the triggered-block min/max variant of absorb and the `ignore_zero_damage` skip of the 1-damage floor, the corpse and pre-cast triggers, the block power type, the neighbour spawn search, buffs, the per-effect resist roll and the other effect types, the damage-type loop, and the full poise styles (only the chance style's flags are kept). It replaces the frame-based regen with a delta-time regen (the donor divides by frames per second). It does not include the cooldown gate in `canCast`, because the donor has none on the server path; `canCast` adds it as the design needs. It also uses the `checkPowerCost` HP rule (`hp < hpCost`), not the `activate` rule (`hpCost >= hp`), which differ at equality.

```ts
// Licence: GPL-3.0-or-later (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Pool { cur: number; max: number; regenPerMin: number; }

interface PowerDef {
  id: number;
  cooldownMs: number;          // per-power cooldown after a use
  mpCost: number;
  hpCost: number;              // paid as damage to the caster
  sacrifice: boolean;          // allows hpCost to kill the caster
  preventInterrupt: boolean;   // hits cannot interrupt this cast
  summonLimit: { mode: "unlimited" | "fixed" | "stat"; count: number; statRatio: number };
}

interface Summon { powerId: number; alive: boolean; }

interface Caster {
  mp: Pool;
  hp: number;
  readyAt: Map<number, number>;  // power id -> ms timestamp when usable again
  summons: Summon[];
}

// Regen is a per-minute stat converted to a per-tick amount, capped at the pool max.
function regenTick(p: Pool, dtMs: number): void {
  p.cur = Math.min(p.max, Math.max(0, p.cur + (p.regenPerMin / 60000) * dtMs));
}

// Summon cap: fixed count, or count scaled by a primary stat; the floor is 1.
function summonCap(def: PowerDef, stat: number): number {
  const s = def.summonLimit;
  if (s.mode === "unlimited") return Infinity;
  const raw = s.mode === "fixed" ? s.count : Math.floor(s.count * (stat / s.statRatio));
  return Math.max(raw, 1);
}

function summonCapReached(c: Caster, def: PowerDef, stat: number): boolean {
  const alive = c.summons.filter(s => s.powerId === def.id && s.alive).length;
  return alive >= summonCap(def, stat);
}

// Cast gate: cost, cooldown and summon cap. The cooldown check is added here; the donor keeps it in the client UI.
function canCast(c: Caster, def: PowerDef, nowMs: number, stat: number): boolean {
  if (c.mp.cur < def.mpCost) return false;
  if (!def.sacrifice && c.hp < def.hpCost) return false;
  if ((c.readyAt.get(def.id) ?? 0) > nowMs) return false;
  if (summonCapReached(c, def, stat)) return false;
  return true;
}

// Pay on cast. Cooldown starts when the power is used.
function payCast(c: Caster, def: PowerDef, nowMs: number): void {
  c.mp.cur -= def.mpCost;
  c.hp -= def.hpCost;
  c.readyAt.set(def.id, nowMs + def.cooldownMs);
}

// A hit interrupts a cast only outside the hit-cooldown window, when not stunned or poised,
// and not if the power has preventInterrupt. A crit ignores poise.
function hitInterruptsCast(def: PowerDef, hitWindowOpen: boolean, stunned: boolean, poised: boolean, crit: boolean): boolean {
  return hitWindowOpen && !stunned && (!poised || crit) && !def.preventInterrupt;
}

// Summoner death removes all its summons (donor: removeSummons, called when hp reaches 0 in logic()).
function onSummonerDeath(c: Caster): void {
  if (c.hp > 0) return;
  for (const s of c.summons) s.alive = false;
  c.summons = [];
}

// Absorb: clamp the absorbed share to [minPct, maxPct] of the hit, at least 1 when a hit has absorb.
// Armour-penetrating hits skip absorb entirely.
function absorbDamage(dmg: number, rawAbsorb: number, minPct: number, maxPct: number, armourPen: boolean): number {
  if (armourPen || rawAbsorb <= 0 || dmg <= 0) return dmg;
  let abs = rawAbsorb;
  const pct = (abs * 100) / dmg;
  if (pct < minPct) abs = (dmg * minPct) / 100;
  if (pct > maxPct) abs = (dmg * maxPct) / 100;
  if (abs === 0) abs = 1;
  let out = dmg - abs;
  if (out <= 0) out = maxPct < 100 ? 1 : 0;
  return out;
}

// Resist per damage type: a clamped percentage; negative values (weakness) are not clamped.
function resistDamage(dmg: number, resistPct: number, minR: number, maxR: number): number {
  let r = resistPct;
  if (r >= 0) r = Math.min(Math.max(r, minR), maxR);
  return (dmg * (100 - r)) / 100;
}

// Non-stacking effect: an incoming copy is dropped only if it is shorter and has the same magnitude; otherwise it replaces the old one.
interface Eff { id: string; remainingMs: number; magnitude: number; }
function applyNonStacking(list: Eff[], incoming: Eff): Eff[] {
  const same = list.find(e => e.id === incoming.id);
  if (same && incoming.remainingMs < same.remainingMs && incoming.magnitude === same.magnitude) return list;
  return [...list.filter(e => e.id !== incoming.id), incoming];
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/mg006-flare-cast-sketch.ts`, exit 0.

## 5. Lands in

- TARGET `src/fight/cast.ts` (proposed new module; the current Frankendom file was not read in this pass). Parity-checklist row 13 (specials). Summons also touch row 13 only; no other row is cited.
- Reuse tag: rewrite-from-idea (GPL-3.0-or-later; clean-room only)
- Brief rule served: 1 (one engine, server-verified casts); rules 7-9 n/a

## 6. Gaps and risks

- GPL-3.0-or-later: clean-room only. The sketch is written from the mechanism; no donor line is translated.
- Also found: the donor's cost and cap checks are hero-only (`canUsePower` returns true for all non-heroes, StatBlock.cpp ~1329; MP gate 2038 and payment 2113-2140 are inside hero branches). Enemy casters pay nothing and are not capped; a many-on-one fight that wants enemy summon caps must add the check itself.
- Client-side gates. The donor's cooldown gate is in the action bar and inventory (MenuActionBar.cpp:418, MenuInventory.cpp:799), and the NPC gate is in AI (EntityBehavior.cpp:662). Frankendom's server must check cost, cooldown and cap on the cast path itself. The Pit client must not be the only check.
- Defect 1 (fix: one comparison). `activate` fails when `requires_hp >= hp` (2053), but `checkPowerCost` fails when `hp < requires_hp` (2467). They disagree at equality. Fix: a single `canCast` used by both paths, with one comparison, and a test at equality.
- Defect 2 (fix: delta time). Regen divides by frames per second (1154), which ties the rate to the frame rate. Fix: regen per tick from elapsed ms, as in `regenTick`.
- Summons and MAX_ATTACKERS = 3. The donor does not count minions against any attacker cap; FLARE has no MAX_ATTACKERS. Frankendom must decide whether a summoned minion counts toward the 3-attacker limit. This note does not decide it.
- One ledger. Summon removal and self-damage cost both go through `takeDamage` in the donor (StatBlock.cpp:1431 and 2143). Frankendom must route both through the one ledger and log the cause.
- Interrupt timing. The donor's interrupt depends on frame-driven timers. Frankendom's interrupt must be decided at the server tick, not the client render frame; the donor does not show a tick order (not read).
- No crowd-control diminishing returns: the donor has per-effect resist percent chances only, and no shared ladder for stun, fear, convert or knockback. The Proof 3 ladder must come from Frankendom's rulings, not this donor.
- Power catalogue: the donor box has no spell data file, so the spell numbers in the sketch are field ranges, not a tuned list. Frankendom's catalogue is the data source.
- Fast mobile fight: casting costs in the donor are float MP and HP; a mobile fight needs short cooldowns (seconds, not minutes) and caps of 1 to 3 summons. Those numbers are proposals, not donor values.


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: Verified: activate 2031-2108 order and requires_hp >= hp (2053), payPowerCost, spawn abort when no free cell and cost paid at 1918, summonLimitReached fixed/stat/floor 1/count non-dead, removeSummons full-HP hit + recursion, hp==0 hook, applyResistToDamage with unclamped negatives, absorb draw/clamp/floor 1/zero->1, poise styles and cooldown_hit/prevent_interrupt gate, addEffect non-stack rule and resist rolls, regen /60/max_frames_per_sec, checkPowerCost hp < requires_hp (2467), engine defaults 0/100, GPL-3-or-later header, catalogue absent from mods/default. ERRORS: (1) Not stated that the MP/resource gate in activate (2038-2044) and the MP/resource/item payment in payPowerCost (2113-2140) are hero-only, and that canUsePower returns true for every non-hero (StatBlock.cpp ~1329 'AI can always use their powers'), so the summon cap and cost checks do NOT apply to NPC casters; note's cap-at-cast idea and acceptance test are described as general. (2) Absorb: block uses min_block/max_block when triggered_block (Entity.cpp ~441-446) and the 1-damage floor is skipped when power has ignore_zero_damage; note describes only the plain absorb path and the sketch omits both. (3) HP regen: the 'else' branch (HP_REGEN/60/fps) covers all non-resting actors, including in-combat enemies, not just 'hero and ally'. (4) Interrupt for heroes only sets ENTITY_HIT; the power-cancel (cooldown reset, activated_power NULL) is non-hero only (Entity.cpp ~700-706).
Missed: Non-hero canUsePower bypass (summons and costs unenforced for enemies); block variant of absorb (min_block/max_block).

Fixed 2026-10-12 (Sonnet fixer): verified all four errors on the donor. Stated that the MP/resource gate, payment and canUsePower checks are hero-only (non-heroes always pass), so the cap and cost ideas do not cover enemies in the donor; added the block variant of absorb and the ignore_zero_damage skip; HP regen branch covers all non-resting actors; hero interrupt only sets the hit state, the power cancel is non-hero only. Sketch unchanged (only its omission list extended); no retypecheck needed.
