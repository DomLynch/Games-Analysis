# Gap check: BS (boss staging, dragons, big creatures)

Date 2026-10-12. Frankendom repo read: frankendom-lead-catalogue at commit 8d6ae33a9 (read-only). Notes read: BS001 to BS005, 10 donor notes.

## Summary for Dom
- 24 rows. REUSE 7, ADD 11 rows (7 distinct ideas once merged), SKIP 6.
- Top 3 additions: (1) a boss walk-in: a timed hold, the boss name in gold, skip button (4 notes agree); (2) boss reinforcements at a visible spot with a hard cap of 3 alive (3 notes agree); (3) a boss-kill finish: slow to the landing, then a typed finale card.
- Smaller adds: per-opponent head/torso/legs damage table, event-driven fight music, health-banded move weights.
- Already built and reusable: stagger/posture, contact freeze, boss wind-up ring, versus card, flee-at retreat, finisher staging.
- Important: the proposed target paths src/fight/... do not exist in this checkout (there is no src/fight folder; the engine is flat src/*.ts). Every ADD below names the real nearest file instead. Our fights are 1v1 duels, so anything with many minions only fits the world boss in origins/boss.

## Table

| Donor note | Idea (8 words) | We have today | Gap | Call | Lands in |
|---|---|---|---|---|---|
| openbor | Boss death slows time until the landing | Contact freeze only: hitStop at src/main.ts:1965-1976; finishers in src/finishers.ts | No slow on a boss kill (the donor never even releases it; our own idea) | ADD | Client-only, src/finishers.ts plus the frame loop in src/main.ts; look-test flag first |
| openbor | Victory pose and boss name/icon HUD panel | Versus card names the foe (src/main.ts:525); sheathed walk to gate (src/scene.ts:540); win line (src/victory-headline.ts) | None worth a build | REUSE | Versus card + walkToGate |
| openbor | Clear the room, boss count per zone, rider thrown | Duel is 1v1. World boss gather/boss/defeated machine (origins/boss/boss.ts:41); minion kills during the boss count for nothing | Not needed | SKIP | n/a: no rooms of minions in a duel |
| ikemen | 30-tick freeze and half darkening on a super | Contact freeze (src/main.ts:1965); boss special timing (src/special-boss-timing.ts); src/special-lighting.ts exists | Boss-special freeze length not checked | REUSE | src/special-lighting.ts, src/special-boss-timing.ts |
| ikemen | Stagger meter, one stun per combo, cooldown | Posture bar and PostureBroken event (src/duel.ts:27); per-opponent poise (src/duel.ts:40) | None | REUSE | src/duel.ts posture |
| dhewm3 | Per-zone damage multipliers held as data | One global table head/torso/legs, all set to 1 (src/moves.ts:220), applied at src/duel.ts:434; hit regions in src/blade.ts:43 | Not per opponent | ADD | Add an optional location table on the Opponent recipe in src/moves.ts (ROSTER, line ~700) |
| dhewm3 | Boss only one attack kind can hurt | Nothing | Blade duel has no attack-kind classes; shape only (GPL) | SKIP | n/a: does not fit a blade duel |
| DevilutionX | Timed talk hold before first attack, gold name | 800 ms draw-in after the versus card (src/standoff.ts:3), presentation only | No boss-specific hold, no gold name card, no skip | ADD | src/standoff.ts (the proposed src/fight/boss-staging.ts does not exist). Same as xoreos and OpenGothic rows below |
| DevilutionX | Retreat at half HP, heal when player far | flee-at twist with percent and catch window (origins/encounters/encounters.ts:120, :136) | Heal-on-retreat amount is a missing field | REUSE | origins/encounters flee-at; add heal field only if wanted |
| DevilutionX | Death drift and corpse keeps own tint | Finisher staging (src/finishers.ts, scene finishClock src/scene.ts:1111-1113); camera shove src/camera-kick.ts | Donor 7 s drift too long for a phone | REUSE | src/finishers.ts, src/camera-kick.ts |
| xoreos | Boss intro as named verbs, abort restores control | Same standoff window as the DevilutionX row | Verb list and skip input missing | ADD (merged with DevilutionX talk hold) | src/standoff.ts |
| DOOM | Telegraph projectile spawns reinforcement, three alive | No summon code in src/. World boss waves only (origins/boss/boss.ts:5, :85). Cap of 3 attackers (lead.md says #2129 merged) is not in this checkout: no MAX_ATTACKERS in src or origins | Whole feature missing; also unclear fit with 1v1 | ADD | Data-only stage rows in origins/boss/boss.ts for the world boss; in a duel only if a pack waits on the ring (docs/specs/origins/server-save-schema.md:41) |
| DOOM | Death chain of puffs, then reward | Finisher staging and reward flow exist (src/finishers.ts) | Nothing new | SKIP | n/a |
| Quake | Finale card typed from a server event | Win line only (src/victory-headline.ts); no typed card | Typed finale text for a boss kill | ADD | src/victory-headline.ts (nearest), shown by src/hud.ts; typing rate as data |
| Quake | 0.2 s beam dies unless server re-sends | No beam. Specials run on fixed ticks (src/special-timing.ts) | Our specials already stop when the sim stops | SKIP | n/a: GPL, shape only, no caster beam in the game |
| Warzone2100 | Escort of 3 attaches to boss | Same gap as the DOOM reinforcement row | Same | ADD (merged with DOOM row) | origins/boss/boss.ts |
| Warzone2100 | Boss runs to shelter, heals, returns | flee-at twist (origins/encounters/encounters.ts:120) | Heal-and-return step | REUSE (merged with DevilutionX retreat row) | origins/encounters |
| Warzone2100 | 60 s clock with cue beeps | Nothing in a duel; no timer HUD | Not a boss-staging need | SKIP | n/a |
| OpenGothic | Three-tier music from attack state, stingers | Only a crowd bed, "never a stinger" (src/audio/arena.ts:40). No music system | All of it. Drive from engage/attack events, not the donor 5 s poll | ADD | New file under src/audio/ (name not chosen); low priority |
| OpenGothic | Cutscene camera spline as boss intro | Camera kick and walk-follow only (src/camera-kick.ts, src/scene.ts:540) | 3 to 4 key intro camera | ADD (merged with DevilutionX talk hold) | src/standoff.ts + src/camera.ts |
| veloren | Boss sheds minions at health steps, burst cap | Nothing | Same gap as the DOOM row; add a max-per-burst field | ADD (merged with DOOM row) | origins/boss/boss.ts |
| veloren | Wind-up tell before the heavy move | Boss ring fills during windup, flashes last 24 ticks (src/boss-telegraph.ts:7-13) | Shorten donor 4 s; ours already shorter | REUSE | src/boss-telegraph.ts, src/special-boss-timing.ts |
| veloren | Move weights shift to heavy as health drops | Mode deltas on AI knobs (origins/mobs/kits.ts:27-31); none by health | Health-banded weights | ADD | origins/mobs/kits.ts |
| veloren | Never-leash flag, pillar guard in zone data | Roam leash exists for world mobs (origins/mobs/row.test.ts:49) | Not needed for duel bosses | SKIP | n/a |

## Merges
- Boss walk-in: DevilutionX, xoreos, OpenGothic spline are one build in src/standoff.ts.
- Reinforcements with cap: DOOM, Warzone2100, Veloren are one build in origins/boss/boss.ts.
- Retreat and heal: DevilutionX and Warzone2100 are one existing flee-at reuse.
- Dragons and mounts: none of the 10 notes gave a usable dragon rule; the repo has no mounts or dragons either.

## Not verified
- The merged 3-attacker cap (PR 2129) is only seen in docs/state/lead.md, not in code at this commit.
- src/special-lighting.ts and src/camera.ts were found by name, not read in depth.
- No git writes were run; donor numbers were left out (GPL and UNCLEAR donors).
