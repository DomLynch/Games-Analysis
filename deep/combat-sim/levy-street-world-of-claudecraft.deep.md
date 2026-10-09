# levy-street-world-of-claudecraft (combat-sim, cell 1)

Donor: `/mnt/frankendom-donors/levy-street-world-of-claudecraft/src/sim/combat/damage.ts` | Licence: MIT | TypeScript | symbol `dealDamage / handleDeath / grantXp`

Checked: At 187 (verified: `dealDamage` 187-1323, `handleDeath` 1409-1914, `grantXp` 1916-1969). Read for this pass: `dealDamage` 187-340, 606-700, 750-780, 895-1000, 1100-1160 and 1296-1323; `handleDeath` 1409-1470 and 1600-1700 plus grep hits through 1863; `grantXp` in full. The rest (about half of `dealDamage`, 340-605 and 1000-1100, and most of `handleDeath`) was not read. MIT: lifting is permitted; the sketch below is written from the mechanism.

## 1. Mechanism

- `dealDamage` (187-1323) is the one damage funnel. Inputs: source and target entities, amount, crit flag, school, ability id, kind, threat options, direct flag, already-final flag, aoe flag, a resolution record. Output: the damage actually dealt (a number). Side effects: HP change, absorb auras consumed, threat added, events emitted, possible death.
- Early exits return 0 with no effect (236-319): target already dead, damage-immune, a boss ward hit that is forced to one point, quest-gated, a pet hitting a stealthed player, GM (silent), airborne, stasis aura, and an evading wild mob (leashed, immune while walking home). Dev-god and the profiler-only invulnerable flag (when dev commands are on) also return 0 but first emit a zero-damage event so attack animations still play (263-285). A wild-mob evade emits an "evade" event on a direct hit only (305-317).
- Amount is clamped to zero (320), then passes through a long ordered list of multipliers from 321 to about 605: dev modes, stances, source-side damage mods, target-side amplifiers and cuts. The comments at 394 and 512-530 say amplifiers and cuts land before absorb shields. About forty such stages; only 320-340 and the comments naming the order were read, not each stage.
- Absorb (609-661): a special Debt-of-Light shield is answered first (its soak is returned to the attacker later); then a loop over the target's `absorb` auras from newest, each soaking `min(aura.value, amount)`, reducing its value and removing itself at zero, with events and shield-consumed procs. The loop is skipped for an amount already marked as a resolved copy. Absorb runs after the target amplifiers, so a soaked hit still soaks the amplified total. A hunter's pet can take a share of what is left (678-700).
- HP: after the match rules, `hp = max(0, hp - amount)` (997), unless a guardian ward restores health. Duel mode (target is a duelist hit by the other duelist) floors HP at 1 and ends the duel rather than killing (766-811). In a fiesta or yumi match a takedown benches the entity with HP 0 (843-892). A ranked arena cross-team hit that would kill sets HP 0 and calls `handleDeath` (899-936). A fire-mage first lethal hit and a talent "cheat death" with an internal cooldown can leave the target at 1 HP (944-972). A non-match kill (hp at or below zero) calls `handleDeath` at the tail (1307-1321), again benching in fiesta or yumi.
- Threat (1114-1126): a hostile mob hit by a player or pet adds `(amount x mult + flat) x threatMod(source, school)` to its hate table. Only direct damage refreshes the leash anchor (1112). The first player (or owner of a pet) to damage a mob taps it (1136-1146), and contributors to a world boss or rare are recorded permanently for personal loot (1148-1160).
- `handleDeath` (1409-1914): marks the entity dead with HP 0, clears most auras, ends casts and channels (1433-1466). For a mob it sets the corpse timer and a respawn timer from the spawn zone's schedule (1649-1671, world bosses and instance bosses hold longer, 1672-1706), snapshots contributors before clearing threat, arms death effects, resolves the tapper's claim, and grants XP to each eligible party member through `grantXp` with a level-difference value (`mobXpValue`, 1856-1862). Loot rolls (`rollLoot`) happen in the same path (comment at 1905). A dead player's pet is run through `handleDeath` too (1616-1618). The code between 1470 and 1600, and 1700 to 1855, was not read.
- `grantXp` (1916-1969): on a kill, a rested pool doubles the award up to the pool; lifetime XP accrues for every award; the level bar advances while below the cap, with full heal and stat recalc on each level-up; the bar freezes at the cap.
- Tick: per damage event, not a fixed step.

## 2. Key functions

- `dealDamage`: `damage.ts` 187-1323. The funnel: early exits, multipliers, absorb, HP, threat, death.
- `handleDeath`: `damage.ts` 1409-1914. Read 1409-1470 and 1600-1700; the XP grant at 1856-1862 is from a grep hit and its surrounding lines. Sets dead, HP 0, clears auras that do not survive death, stops casts, then for mobs sets the corpse and respawn timers, resolves the tapper, grants XP, rolls loot.
- `grantXp`: `damage.ts` 1916-1969. Rested bonus, lifetime XP, level-up loop, cap freeze.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| One damage funnel that every source calls | Funnel name and signature (theirs) |
| Absorb soaks from a pool of shields, newest first, removed at zero | Shield values come from auras (theirs) |
| Duel mode floors HP at 1 and ends the duel instead of killing | Floor of 1 (theirs, 774-776) |
| Threat = amount x multiplier + flat, scaled by a stance mod | Multiplier and flat bonus per ability (theirs) |
| Rested pool doubles a kill award up to what is left | 2x while the pool lasts (theirs, 1929-1933); kills only, not at the cap |
| XP level loop with cap freeze and a lifetime counter | Max level and XP curve (theirs) |

## 4. TypeScript sketch

simplified: the sketch shows absorb, the HP floor, threat and the rested bonus only. It omits all early exits, the ordered multiplier stages, resolved-copy handling, match rules (arena, fiesta, yumi), cheat-death saves, pet redirect, tap and contributor tracking, corpse and respawn timers, and XP level-ups. Absorb here soaks from the newest shield and removes it at zero, as in the donor.

```ts
// Licence: MIT (donor). Sketch written from the described mechanism; lifting the real lines is permitted (dealDamage, damage.ts 187-1323).
interface Absorb { value: number; }
interface Target { hp: number; absorbs: Absorb[]; floorHp: number; }

// Absorb pool: soak from the newest shield first; drop shields that are used up.
function soakAbsorbs(t: Target, amount: number): { left: number; soaked: number } {
  let left = amount;
  let soaked = 0;
  for (let i = t.absorbs.length - 1; i >= 0 && left > 0; i--) {
    const take = Math.min(t.absorbs[i].value, left);
    t.absorbs[i].value -= take;
    left -= take;
    soaked += take;
    if (t.absorbs[i].value <= 0) t.absorbs.splice(i, 1);
  }
  return { left, soaked };
}

// HP change: never below the floor; a duel floor keeps the target at 1 instead of dead.
function applyHp(t: Target, amount: number, duel: boolean): { dealt: number; dead: boolean } {
  const floor = duel ? 1 : 0;
  const before = t.hp;
  t.hp = Math.max(floor, t.hp - amount);
  const dealt = before - t.hp;
  return { dealt, dead: !duel && t.hp <= 0 };
}

// Threat added to a hostile entity's hate table from one hit.
function threatFrom(amount: number, mult: number, flat: number, stanceMod: number): number {
  return (amount * mult + flat) * stanceMod;
}

// Rested XP doubles a kill award up to the pool left.
function restedBonus(award: number, rested: number): number {
  return Math.min(Math.floor(rested), award);
}
```

## 5. Lands in

- TARGET `src/fight/duel.ts` (today: `src/duel.ts`, moving), parity-checklist row 1 (duel step / sim): one funnel with an ordered multiplier list, then absorb, then HP, then threat, then death. Check the existing order in `stepDuel` (`src/duel.ts` line 221) before copying anything; this is a shape, not a new rule.
- Parity-checklist row 17 (death / respawn / fight end), TARGET `src/fight/world.ts`: `handleDeath` is the reference for what a death must clear; the mob corpse and respawn timers (1649-1671) are the zone-side shape.
- Parity-checklist row 18 (loot roll and XP award): Frankendom awards XP and career today in `src/career.ts`, `src/awards.ts` and `src/loot.ts` on the Pit side and in `origins/preview/hunt.ts` and `origins/server/mob-rewards.ts` on the Zone side (all four paths checked in worktree `frankendom-backend`, commit 46e670530); the checklist plans a server tick that unifies them (post-K item 3). `grantXp`'s rested bonus and level loop could inform that server award, but it is not a replacement.
- today: `src/duel.ts` (moving), `src/fight/world.ts`, `src/career.ts`, `src/loot.ts`, `origins/server/mob-rewards.ts`.
- Reuse tag: adapt
- Brief rule served: 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- `dealDamage` is roughly forty ordered stages of MMO class mechanics (talents, auras, pets, arena modes). Only the funnel shape, absorb, the match rules, HP and threat were read (about half of the function). Do not claim the full order.
- Frankendom's ruling is one engine: damage resolves in the duel step (`src/duel.ts`, moving to `src/fight/`), which must stay the only resolver. Any absorb or funnel idea lands there, not in a parallel module.
- Death here has corpses, graveyards and respawn timers; the Pit client has a win or loss, not a corpse (checklist row 17: open-world respawn is by design on the zone side). `handleDeath` is only partly read.
- Threat and leash belong to Zone 1 (`src/fight/world.ts`, row 4), which already has its own `Threat` record (damage and out-of-sight seconds) and `MAX_ATTACKERS = 3`; this donor's hate table has no such cap.
- XP and loot are granted inside `handleDeath` in this donor, during the damage call. Frankendom's kill must be server-verified and the award a separate ledger write, so the award step must not be copied into the damage path.
- Server-side authority: this sim runs on the server. Frankendom's kill must be server-verified through `src/net/verify-duel.ts`, so the funnel is a reference, not a second authority.
