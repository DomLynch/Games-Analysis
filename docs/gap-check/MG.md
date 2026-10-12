# MG gap check (magic, spells, powers, dragons, big creatures)

Date 2026-10-12. Frankendom repo read at commit 8d6ae33a9 (read-only checkout). Donor notes: /private/tmp/p2/wave2-haiku/batch3/MG001-MG011 (33 notes, 3 per group).

## Summary for Dom

1. 33 notes: 7 REUSE, 8 ADD, 18 SKIP (most SKIPs are duplicates merged into one ADD row).
2. There is no `src/fight/` folder. The fight engine is `src/duel.ts` plus the numbers in `src/moves.ts`. Every proposed `src/fight/*.ts` path is new; the real nearest files are named in the table.
3. The sim has no spell, mana, resist, status or summon state today. A special is one rule: 2 s windup, cooldown, unblockable hit, cut by damage (`src/duel.ts:487`, `src/moves.ts:182`).
4. Top 3 additions: (a) boss phase-gated special timers (MG011 TrinityCore, merges MG011 EQEmu burst); (b) resource pool plus spell rows as data (MG003 swgemu, MG001 OpenEnroth); (c) one resist step with partial damage (MG002 EQEmu, merges MG001 daggerfall, MG007 l1j). Also listed: breath cone (MG011 veloren), summon cap (MG006 flare), non-lethal DoT (MG008 wesnoth), interrupt lockout curve (MG002 ModernUO).
5. The shared crowd-control ladder (MG003 OpenDAoC, MG004 TrinityCore, MG005 veloren) is Proof 3 / #2161, shipped per `docs/state/lead.md` but NOT in this commit's code. All three are REUSE; compare against that PR, do not rebuild.

Licence rule: no donor numbers below. Restricted donor (MG008 sven-n-MuMain) is idea-level only.

## Table

| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| MG001 OpenEnroth | Spell cost and recovery in one row | `SPECIAL_ROWS` holds only `interruptible` (`src/moves.ts:730`); one shared `RULES.special` row (`moves.ts:182`) | No per-special cost, recovery or damage row | ADD [MG001] (merges MG010 daggerfall cost function) | `src/moves.ts` `SPECIAL_ROWS` (exists); `src/fight/spell-table.ts` does not exist |
| MG001 openmw | One-roll cast gate with stamina term | Specials roll nothing and cost no stamina (`src/duel.ts:181`, `src/ai.ts:83`); fights are deterministic | A fizzle roll adds noise to a fast duel | SKIP: duel stays deterministic (merged with MG005 crawl, MG003 ACE, MG010 ryzom roll idea) | n/a |
| MG001 daggerfall-unity | One resisted-hit roll, kept percent | No resist concept anywhere in `src/` or `origins/` | Same gap as MG002 EQEmu | SKIP: merged into MG002 EQEmu ADD | see MG002 EQEmu |
| MG002 EQEmu | Resisted spell still lands partial damage | Special release is flat `specialShare * maxHealth`, unblockable (`src/duel.ts:471-473`) | No target resist stat, no level-gap term, no partial damage | ADD [MG002] (merges MG001 daggerfall, MG007 l1j status chance) | `src/duel.ts` release step (:471); new field on the special row in `src/moves.ts`; `src/fight/resist.ts` does not exist |
| MG002 ModernUO | Cast cut early costs more lockout | Cut cast sets a fixed `interruptCooldown` (`src/duel.ts:493`, `moves.ts:182`) | Lockout does not depend on how far the cast got | ADD [MG002] (small: one formula using remaining `special` ticks) | `src/duel.ts:493` and `src/moves.ts:182` |
| MG002 gemrb | Hit mid-cast breaks it, more when harder | Damage taken in the windup adds up; cut at 10% of max health (`src/duel.ts:487-496`; spec `docs/specs/combat/interruptible-windups.md`) | None worth adding; threshold form already beats a roll for determinism | REUSE interruptible windups | `src/duel.ts:487` |
| MG003 swgemu-Core3 | Focus pool, charge only after accept | Stamina is the only pool; specials cost nothing (`src/duel.ts:24,181`); Dom ruling "mana as per-character row value" is unconfirmed (`docs/state/lead.md:16`) | No second resource, no regen rule | ADD [MG003] (merges MG006 WarEmu pool; MG008 Barony drip is SKIP) | `Fighter` in `src/duel.ts:24` and `RULES` in `src/moves.ts`; mob rows `origins/mobs/row.ts`; `src/fight/powers.ts` does not exist |
| MG003 ACE | Fixed cast order; broken cast costs little | Cooldown spent at commitment (`src/duel.ts:250`); cut cast pays a reduced cooldown (`:493`) | Order already fixed in the engine | REUSE | `src/duel.ts:234-250,487` |
| MG003 OpenDAoC | CC halves each repeat; immunity window | No CC state in this commit; the shared ladder is Proof 3 #2161 (lead.md) | Not in code here; unverified in the shipped PR | REUSE Proof 3 CC ladder (#2161) | the ladder module from #2161 (not in this checkout) |
| MG004 TrinityCore | One DR ladder for all CC | Same as above | Same | REUSE Proof 3 CC ladder (#2161) | as above |
| MG004 rathena | Fixed plus variable windup, hit cancels | Windup fixed at 120 ticks (`moves.ts:182`); damage cancel exists (`duel.ts:487`); cut caster is not held back (no `specialRecover` on cut) | Stat-shortened windup absent (no need) | REUSE | `src/duel.ts:487-496` |
| MG004 Segs | Queued special, charge, recharge, toggle | One queued action buffer (`src/duel.ts:154`); cooldown at commit; no toggles | Toggles and endurance have no place in a duel | SKIP: one buffered action already does the queue | n/a |
| MG005 crawl | Spell failure curve with armour penalty | None; no spell failure | Merged with MG001 openmw reasoning | SKIP: duel stays deterministic | n/a |
| MG005 NetHack | Boss picks ability by level, cooldown by level | `specialOf` picks one of three by level (`src/moves.ts:732`); `ai.ts:85` casts when ready and in reach; cooldown fixed | Level-scaled cooldown only (one number) | SKIP: level gating already built; cooldown by level can be one RULES field if tuning asks | `src/moves.ts:182` if ever needed |
| MG005 veloren | Shared CC resistance pool per target | Proof 3 #2161 | Same as MG004 | REUSE Proof 3 CC ladder (#2161) | as above |
| MG006 flare-engine | Summon cap; minions die with summoner | No summons anywhere in `src/` or `origins/`; crowd has one holder at a time (`origins/crowd/crowd.ts:52`) | No summon or minion concept | ADD [MG006] (merges MG009 crawl cap/expire-soonest, MG009 EQEmu join; MG009 ModernUO raise is SKIP) | `origins/crowd/crowd.ts` (enemy list and queue, exists); `src/fight/summons.ts` does not exist |
| MG006 Shadowbane | Lock from cast press; void if caster dies | Cooldown spent at commitment (`src/duel.ts:250`); caster death fizzles the cast (`:485`) | None | REUSE | `src/duel.ts:250,485` |
| MG006 WarEmu | Action-point pool, pause regen on global cooldown | Same gap as MG003 swgemu; `specialRecover` already blocks attacks after release (`duel.ts:473`) | Pool only | SKIP: merged into MG003 swgemu ADD | see MG003 |
| MG007 ryzom | Timed effect link, upkeep, rising resistance | No status state ("the sim has no status state", `src/miasma-mark.ts:4`) | DoT or sustain missing; rising resistance is the CC ladder | SKIP: merged into MG008 wesnoth ADD (resistance part is #2161) | see MG008 |
| MG007 AAEmu | Gates at start, spend at finish, CC drops cast | Gates at start exist; Frankendom spends at commit by design (`duel.ts:250`); stagger does not cut a cast (`interruptible-windups.md` section 1) | Needs CC states from #2161 first | SKIP: revisit after reading #2161 | n/a |
| MG007 l1j | One roll for status chance, one damage pipeline | No status roll; no damage pipeline for spells | Same as MG002 EQEmu | SKIP: merged into MG002 EQEmu ADD | see MG002 |
| MG008 Barony | Cost dripped in windup, learner fumble | Cost charged at commitment; no learner state | Not needed | SKIP: no fumble or learner rule in a fixed-row game | n/a |
| MG008 wesnoth | DoT that cannot kill, best single heal | No DoT; `legWound` and attrition exist (`src/duel.ts:407`) but no ticking effect | Non-lethal poison tick on the engine clock | ADD [MG008] (merges MG007 ryzom) | `src/duel.ts` tick loop; ruling says statuses ride the #2161 ladder; `src/fight/status.ts` does not exist |
| MG008 sven-n-MuMain (restricted) | Walk to target, then fire | Press out of reach is refused, nothing spent (`src/duel.ts:234`) | Player moves himself in a 1v1 duel | SKIP: not needed for a duel (idea level only, restricted donor) | n/a |
| MG009 crawl | Per-spell summon cap; remove soonest-to-expire | No summons | See MG006 flare | SKIP: merged into MG006 flare ADD | see MG006 |
| MG009 EQEmu | Pet joins when owner is hit; target lock | No pets; `MAX_ATTACKERS` is only in `docs/state/lead.md` (#2129), not in this commit's code | Needs summons first | SKIP: merged into MG006 flare ADD (cap joins at the attacker limit) | see MG006 |
| MG009 ModernUO | Raise a corpse, cap three, drains per tick | No corpse object in the sim | Necromancy not in the game | SKIP: no corpse state | n/a |
| MG010 ryzom | Spell built from parts, level picks chance | Spells are fixed rows | Build system not wanted | SKIP: fixed catalogue rows | n/a |
| MG010 ModernUO | Skill window gates spell; scroll route | No spell skill; no scroll item found in `src/loot.ts` or `origins/inventory` | Whole access system absent | SKIP: no spell skill to gate on | n/a |
| MG010 daggerfall-unity | Cost and price derived from effects | Fixed rows | Merged with MG001 OpenEnroth | SKIP: merged into MG001 OpenEnroth ADD | see MG001 |
| MG011 EQEmu | Boss burst window, HP-gated, riposte | Boss special fires whenever ready and in reach (`src/ai.ts:85`); no HP gate, no burst | Merged with TrinityCore phases (HP gate is a phase) | SKIP: merged into MG011 TrinityCore ADD | see next row |
| MG011 TrinityCore | Phase-masked boss timers, wait while casting | `specialOf` by ladder level only (`src/moves.ts:732`); `origins/boss/boss.ts` is a wave stage machine, "paper and prototype only", nothing in `src/` imports it | No in-fight phases or timers | ADD [MG011] | `origins/boss/boss.ts` (stages exist, no in-fight phases) and `src/moves.ts` `SPECIAL_ROWS`; `src/fight/boss-phases.ts` does not exist |
| MG011 veloren | Breath is a channelled cone, ticks damage | Dragon-like specials are presentation only (`src/special-fx-boss.ts:206`, `special-boss-timing.ts:6`); the hit is one unblockable flat blow (`duel.ts:471`); witch fire has a cone for drawing only (`src/witchfire.ts`) | No channel, cone hit test or ramp in the sim | ADD [MG011] | `src/duel.ts` step 4 (:465) and a new special row in `src/moves.ts`; `src/fight/breath.ts` does not exist |

## Merge notes

- Spell rows and cost: MG001 OpenEnroth is the lead; MG010 daggerfall and MG010 ryzom are the same idea.
- Resist and status chance: MG002 EQEmu is the lead; MG001 daggerfall and MG007 l1j merge in.
- Resource pool: MG003 swgemu is the lead; MG006 WarEmu and MG008 Barony merge in.
- Summons: MG006 flare is the lead; MG009 crawl, EQEmu and ModernUO merge in.
- DoT: MG008 wesnoth is the lead; MG007 ryzom merges in.
- Boss phases: MG011 TrinityCore is the lead; MG011 EQEmu merges in.
- CC ladder (MG003 OpenDAoC, MG004 TrinityCore, MG005 veloren): no donor work needed.

## Not verified

- Whether Proof 3 / #2161 (CC ladder) and #2129 (attacker cap) match the donor notes: only `docs/state/lead.md` mentions them; neither is in this commit's code.
- Where the Proof 3 ladder module lives, so the DoT row's landing path is the nearest file only.
- Donor notes were skimmed through their Decision lines only, as instructed; Acceptance lines and Checker findings were not read.
