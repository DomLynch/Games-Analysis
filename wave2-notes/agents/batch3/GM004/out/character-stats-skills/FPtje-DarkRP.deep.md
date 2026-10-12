# FPtje-DarkRP (character-stats-skills, cell 21)

Donor: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/hungermod/sv_player.lua` (energy meter, starvation) with `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/hungermod/sv_hungermod.lua` (tick, spawn reset, AFK, buy food) and `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/sleep/sv_sleep.lua` (sleep, health and armour) | Licence: MIT (repo `LICENSE.txt`, Copyright (c) 2014 Falco Peijnenburg) | Lua (GMod gamemode) | symbol `meta:hungerUpdate`

Checked: stats cell, not camera. Read in full: `hungermod/sv_player.lua` (33), `hungermod/sv_hungermod.lua` (103), `hungermod/sh_init.lua` (103, food table), `sleep/sv_sleep.lua` (230), `sleep/sh_sleep.lua` (17), `entities/entities/food/init.lua` (56), `entities/entities/spawned_food/init.lua` 20-45 (eat). Read in part: `base/sv_util.lua` lines 199 and 201 only (seen through grep; the surrounding spawn function is (not read)); config values by grep at the cited lines. Not read: `hungermod/sh_interface.lua` and `sv_interface.lua` (API stubs), `hungermod/cl_*` (HUD and F4 tab), `playerscale`, `police`. Confidence high on the energy meter and sleep order of operations; medium on the sleep-energy result (read the code, not run). Grep for RPG stat words (luck, mana, spell, magic, resist, poise, stagger, crit, dexterity, endurance, intelligence, talent, xp, skill points, persuade, strength, level) found no stat system: the only hits were unrelated words ("spelling", "change level", a sleep call in police).

Best transferable idea: a per-second fed meter (0..100) that drains by a fixed rate, starts a damage-over-time penalty at zero that goes through the one damage path, refills by food with a clamp, and freezes (not rewrites) while asleep or AFK.
Decision (proposed): adapt. Why: this is a real, self-contained condition meter with a zero-threshold penalty and a refill item, the right shape for a "tired/fed" out-of-fight state in a fighting MMO; it does not give us melee stamina (no per-action cost exists in this donor), so it is adapted to the condition meter only and its defects are fixed in the sketch (per-second rates, one damage writer, freeze instead of a no-op restore).
Acceptance: a server test starts at 100 energy with the donor's default drain (0.2 per second), reaches 0 after 500 s, then loses health through the damage function (armour applies) at the coded starvation rate; a 300 s sleep leaves energy unchanged; respawn resets energy to 100 and health to the class maximum.

## 1. Mechanism

- Meter. `hungerUpdate` (`sv_player.lua` 7-33) runs for each living player on a 10 s timer (`sv_hungermod.lua` 12, dead players skipped at line 8). If `hungerspeed` is unset it returns (line 8). A hook `hungerUpdate` may override the whole step (line 11). Otherwise energy becomes `clamp(energy - hungerspeed, 0, 100)` (line 15). Default `hungerspeed` is 2 (`config.lua` 542), so energy drains 2 per 10 s, about 0.2 per second, from 100 to 0 in about 500 s.
- Starvation. When energy is exactly 0 (line 17), the step builds a `DamageInfo` of `starverate` (3, `config.lua` 544) with type `DMG_DISSOLVE | DMG_NERVEGAS` (21-24), applies it through `TakeDamageInfo` (26), which is the normal damage pipeline. If pre-damage health minus `starverate` is at most 0, it sets `Slayed` and calls `playerStarved` (28-31). Per tick that is 3 health, which is 0.3 per second as coded. The config comment says "every second" (`config.lua` 543), which does not match the 10 s tick.
- Refill by food. A spawned food entity adds its `FoodEnergy` to energy and clamps to 0..100 (`spawned_food/init.lua` 38). If the item has no energy value it adds 1 (the `or 1`). The shipped food table has 11 items with energy values from 5 to 20 (`sh_init.lua` 47-101). Each item's price equals its energy (price = energy, read on all 11). A separate food prop (`food/init.lua` 43) sets energy to exactly 100.
- Reset. Every spawn sets energy to 100 (`sv_hungermod.lua` 2; `sv_player.lua` 4 on first join). Death therefore clears the meter.
- AFK freeze. On going AFK, the current energy is saved (`sv_hungermod.lua` 21). On return it is set back to the saved value (23). Drain during AFK is discarded, but starvation damage taken during AFK is not (it is applied by the same tick, `sv_player.lua` 21-26).
- Sleep (`sleep/sv_sleep.lua`). Sleeping swaps the player to a ragdoll avatar (146-170) with a 5 s lockout (`KnockoutTime`, line 2; check at 37). Health and armour are read before the respawn and set back after (65-69). Weapons and ammo are snapshotted (138-145) and given back on wake (82-100). The sleeper's hunger is saved at wake (62) and written back at wake (120). Damage to a sleeper goes to `SetHealth` directly (220), not through the damage path, and world damage is forced to 10 and scaled by 0.1 (215-218).
- Buy food (`sv_hungermod.lua` 29-102). Cook-only gate (38), custom check (43), per-player buy cap of `maxfooditems` (52, 55-59), then the slot is taken (61), then the affordability check (65), then the debit (69), then the spawn (79-95).

## 2. Key functions

- `meta:hungerUpdate`: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/hungermod/sv_player.lua` 7-33.
- Tick and spawn reset: `hungermod/sv_hungermod.lua` 1-12 (spawn reset 1-4, tick 6-12), AFK 19-27, buy food 29-103.
- Eating: `/mnt/frankendom-donors/FPtje-DarkRP/entities/entities/spawned_food/init.lua` 22-44 (`ENT:Use`), `food/init.lua` 36-49.
- Food table and cook flag: `hungermod/sh_init.lua` 4-21 (createFood), 31-32 (isCook), 47-101 (items).
- Sleep: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/sleep/sv_sleep.lua` 43-197 (`DarkRP.toggleSleep`), 205-230 (`DamageSleepers`).
- Starting health: `/mnt/frankendom-donors/FPtje-DarkRP/gamemode/modules/base/sv_util.lua` 199-201 (grep hits; the rest of the function is (not read)).

## 3. Numbers vs mechanism (SK table)

| name | what it does | formula | number ranges | caps | file:line |
|---|---|---|---|---|---|
| Energy (fed meter) | Hunger meter that drains over time | energy = clamp(energy - hungerspeed, 0, 100) per tick | start 100; drain 2 per tick (0.2 per s); tick 10 s | floor 0, ceiling 100 | sv_player.lua 15; config.lua 542; sv_hungermod.lua 12 |
| Starvation | Damage over time at zero energy | TakeDamageInfo(starverate) per tick, normal damage path | 3 per tick (0.3 per s as coded); config comment says per second | none | sv_player.lua 17-26; config.lua 543-544 |
| Slay flag | Marks a starve death | if pre-damage health - starverate <= 0 then Slayed, hook playerStarved | threshold 0 | n/a | sv_player.lua 18, 28-31 |
| Food restore | Eating adds energy | energy = clamp(energy + FoodEnergy, 0, 100) | FoodEnergy 5-20 over 11 shipped items; default 1 | 0..100 | spawned_food/init.lua 38; sh_init.lua 47-101 |
| Food price | Buy price of a food item | price = energy (all 11 items) | 5-20 | buy cap maxfooditems 20 | sh_init.lua 47-101; sv_hungermod.lua 50-61; config.lua 230 |
| Full meal | Food prop that refills fully | energy = 100 | 100 | n/a | food/init.lua 43 |
| Respawn reset | Clears the meter on spawn | energy = 100 | 100 | n/a | sv_hungermod.lua 2; sv_player.lua 4 |
| AFK freeze | Undoes drain while AFK | save on AFK, restore on return | the saved value | n/a | sv_hungermod.lua 21, 23 |
| Starting health | Health on spawn | MaxHealth = class MaxHealth or startinghealth; Health = class StartHealth or startinghealth | 100 | class override | config.lua 284; base/sv_util.lua 199-201 |
| Armour | Kept across sleep | saved before respawn and set after | not limited in this module | n/a | sleep/sv_sleep.lua 66, 69 |
| Sleep lockout | Refuses sleep right after a sleep | KnockoutTimer + 5 >= now refuses (unless forced) | 5 s | n/a | sv_sleep.lua 2, 37 |
| Sleep hunger | Hunger during sleep | saved at wake, restored from the same value | no net effect (as read) | n/a | sv_sleep.lua 62, 120 |
| Sleeper damage | Damage to a sleeping player | Health -= amount, direct (SetHealth); world damage forced to 10 and scaled 0.1; on lethal damage it force-wakes, strips weapons and re-applies the damage through TakeDamageInfo (223-227) | flat 10 for world damage | n/a | sv_sleep.lua 215-220 |
| Cook gate | Some food needs the cook job | isCook() reads the job flag | boolean | n/a | sv_hungermod.lua 38; sh_init.lua 32 |
| Weapon clip and spare ammo | Ammo of a bought weapon | clip from weapon Primary, spare from shipment | DefaultClip / ClipSize from the weapon script | n/a | base/sv_purchasing.lua 71-75, 86-88 |
| Locale | Player-facing strings | key = "text" lines with %s / %d placeholders, filled by DarkRP.getPhrase | 447 key lines (grep count of the key pattern; not each read) | n/a | modules/language/sh_english.lua (576 lines) |

Not present (grep-checked, see Checked): strength, dexterity, endurance, intelligence, luck, poise, stagger, block, parry, riposte, roll, armour per slot, damage types against armour, crit, hit location and bleed, weapon damage, speed and range, proficiency, skill XP, levels, talents, rank tiers, mana, spells, resistances, persuasion. None of these exist in the donor. (Rows for them would be NONE, not invented.)

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order (drain, then starvation damage at zero, then food with a clamp, then the respawn reset). It changes four things on purpose: rates are per second, with the donor's 10 s tick left to the caller (the donor's config comment says per second but the code runs per 10 s); there is one damage writer (`takeDamage`), so sleep and starvation cannot bypass armour and rules (the donor's sleep path calls SetHealth directly); sleep and AFK set a freeze flag instead of saving and rewriting a value (the donor's sleep save-restore is a no-op); and the donor's flat 10 for world damage is not copied. It omits armour soak, the slay hook, the ragdoll and weapon snapshot, the food price and purchase path, the cook gate and the locale. Donor default rates are shown as `DONOR_DEFAULT`, with the comment making the 3-per-tick versus per-second question explicit.

```ts
// Licence of donor: MIT (FPtje-DarkRP, LICENSE.txt). Clean-room sketch of the mechanism, not a line-by-line port.
export {};

// Data (zone data): meter ceiling and rates. Rates are per SECOND here (donor code runs them per 10 s tick).
interface MeterConfig {
  max: number;          // ceiling of the fed meter (donor: 100)
  drainPerSec: number;  // donor default 2 per 10 s = 0.2 per s
  starvePerSec: number; // donor default 3 per 10 s = 0.3 per s (its config comment says 3 per second)
}

interface Condition {
  energy: number;  // 0..max
  health: number;
  frozen: boolean; // true while asleep or AFK: no drain, no starvation
}

// The only function that lowers health. Sleep and starvation both call it (the donor's sleep path does not for non-lethal hits; its lethal hit does go through TakeDamageInfo).
export function takeDamage(c: Condition, amount: number): void {
  if (amount <= 0) return;
  c.health = Math.max(0, c.health - amount);
}

// Advance the meter by dt seconds. The caller decides how often to call it (donor: every 10 s).
export function step(c: Condition, dtS: number, cfg: MeterConfig): { starving: boolean; dead: boolean } {
  if (!c.frozen) {
    c.energy = Math.max(0, Math.min(cfg.max, c.energy - cfg.drainPerSec * dtS));
    if (c.energy === 0) takeDamage(c, cfg.starvePerSec * dtS);
  }
  return { starving: c.energy === 0, dead: c.health <= 0 };
}

// Eating adds the food's energy, clamped to 0..max.
export function eat(c: Condition, foodEnergy: number, cfg: MeterConfig): void {
  c.energy = Math.max(0, Math.min(cfg.max, c.energy + foodEnergy));
}

// Respawn resets the meter and health.
export function respawn(c: Condition, cfg: MeterConfig, maxHealth: number): void {
  c.energy = cfg.max;
  c.health = maxHealth;
  c.frozen = false;
}

// Sleep and AFK only switch the freeze flag. The energy value is never rewritten on wake or return.
export function setFrozen(c: Condition, frozen: boolean): void {
  c.frozen = frozen;
}

// Donor default rates expressed per second (see the comment on MeterConfig).
export const DONOR_DEFAULT: MeterConfig = { max: 100, drainPerSec: 2 / 10, starvePerSec: 3 / 10 };
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (`/tmp/gm004-stats-sketch.ts`): exit 0.

## 5. Lands in

- TARGET `origins/server/condition.ts` (new: the fed meter, starvation and food as data rows; the one `takeDamage` writer is shared with the fight damage step).
- Parity row 21 (catalogue fields: the meter's ceiling, drain, starvation and food values are catalogue fields, zone data where they differ per zone).
- Reuse tag: adapt (MIT: code may be adapted; this sketch is written from the mechanism).
- Brief rule served: one damage writer and one engine (the donor's sleep path breaks the rule); zones as data (rates and food values are data fields); no per-action melee stamina is claimed from this donor.

## 6. Gaps and risks

- Gap, no melee stamina, no per-action cost, no block, parry, roll or crit in this donor. The SK table's combat rows are NONE. The meter is a slow out-of-fight condition (minutes), so it does not give Frankendom its fast-fight stamina.
- Defect, rate mismatch. The config comment says starvation is "every second" (`config.lua` 543), but the damage runs per 10 s tick (`sv_hungermod.lua` 12, `sv_player.lua` 21). The coded default is 0.3 HP per second, not 3. Fix: state rates per second in the data row and derive the tick (sketch).
- Defect, sleep bypasses the damage path for non-lethal hits. `DamageSleepers` calls `SetHealth` directly (`sv_sleep.lua` 220), so armour and other damage rules do not apply to a sleeping player's health loss; only the lethal hit force-wakes the player, strips weapons and re-applies the damage through `TakeDamageInfo` (223-227), so death itself uses the normal pipeline. World damage is replaced by a flat 10 (215-216). Fix: one `takeDamage` writer (sketch).
- Defect, the sleep hunger save-restore does nothing useful. The value is saved at wake (62) and written back at wake (120), so no value is held during sleep. The energy tick skips only dead players (`sv_hungermod.lua` 8), so a sleeping (alive) player keeps draining (as read; not run). Fix: freeze the meter at sleep start (sketch `setFrozen`), a rule Dom should confirm.
- Defect, AFK discards drain but not starvation. Energy goes back to its pre-AFK value (`sv_hungermod.lua` 23), but starvation damage applied during AFK stays (`sv_player.lua` 21-26). Fix: freeze both or neither, chosen on purpose.
- Defect, buy-food slot before affordability. The per-player slot is taken (`sv_hungermod.lua` 61) before the affordability check (65), and the early return does not release it (release path not read). Fix: check money first, then take the slot.
- Defect, the default food energy is 1. A food item with no energy value adds 1 (`spawned_food/init.lua` 38). Fix: refuse to spawn a food item without an energy value.
- Ruling note. Starvation death is recorded only as a flag before the damage (`sv_player.lua` 28-31). Frankendom's server-verified kills need the death to be recorded by the damage writer, not by a flag read before the write.
- Ruling note. The meter is a single-player value written from several places (`setSelfDarkRPVar` in the tick, eat, reset, AFK and sleep). Frankendom's one-ledger rule wants one writer; the sketch uses one `Condition` and one `step`.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
- Overstated: "sleeper damage bypasses the damage path" (sv_sleep.lua 220). SetHealth is direct, but lethal damage calls toggleSleep(v,"force") then v:TakeDamageInfo(dmginfo) (223-227). Confirmed against the donor code.
- Missed (minor): nothing important.
Fixed 2026-10-12: Sleeper damage table row, Defect line and sketch comment now say the bypass is for non-lethal hits only and that the lethal hit goes through TakeDamageInfo. Sketch code unchanged.

