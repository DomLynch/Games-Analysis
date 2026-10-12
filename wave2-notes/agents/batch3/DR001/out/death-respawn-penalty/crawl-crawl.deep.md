# crawl-crawl (death-respawn-penalty, cell 3)

Donor: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/ouch.cc` (ouch 1325-1500, player_die 1502-1625, _place_player_corpse 1121-1140), `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/religion.cc` (god_protects_from_harm 4157-4170), `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/xom.cc` (xom_saves_your_life 5465-5500), `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/nearby-danger.cc` (revive 441-510, bring_to_safety 390-440), `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/ghost.cc` and `files.cc` (bones/ghost), `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-other.cc` and `mon-death.cc` (Animate Dead), `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/corpse.cc` (rot) | Licence: GPL-2.0 (`/mnt/frankendom-donors/crawl-crawl/LICENSE`, "GNU GENERAL PUBLIC LICENSE Version 2, June 1991"; copyright Linley Henzell and the dev team) | C++ | symbol `ouch`, `player_die`, `god_protects_from_harm`, `xom_saves_your_life`, `revive`, `ghost_demon::init_player_ghost`, `cast_animate_dead`

Checked: Opened and read: ouch.cc 1325-1500 (damage path: pending revival, spirit shield, god save, death call), ouch.cc 1502-1625 (player_die: Xom escape, Xom save, lives and pending revival, corpse), ouch.cc 1121-1140 (player corpse), religion.cc 1046-1052 and 4157-4170 (gift timeout, god save chances), xom.cc 5465-5500 (Xom save), nearby-danger.cc 390-435 (bring_to_safety, partly: the sampling loop head) and 441-510 (revive), main.cc 1090-1105 (where revival runs), ng-setup.cc 585-590 (MUT_MULTILIVED gives one life), ghost.cc 426-440 and 1152-1235 (ghost copy and eligibility), files.cc 150, 3135-3175, 3928-3960 (ghost files, quota, load), spl-other.cc 86-116 (Animate Dead cast), mon-death.cc 1965-1975 and 2040-2050 (reaping on monster death), corpse.cc 20-91 (whole file: rot and skeletons). Not read: _death_is_worth_saving (xom.cc), the body of place_corpse_or_gold (mon-death.cc 474), the ghost fight behaviour, the bones file format and _list_bones, MAX_GHOSTS (initfile merge path only). Confidence: high on the damage-to-death path, the lives and revival path, and the god and Xom saves; medium on the bones quota (the caller that loads ghosts on level creation was not found by grep). Camera scope: not applicable.

## 1. Mechanism

- A hit enters `ouch` (ouch.cc 1325). If a revival is pending the hit is ignored (1333). Spirit shield (1401-1412) takes a share of the damage from MP: `mp = div_rand_round(dam * MP, HP + MP)`, raised to at least `dam + 1 - HP` so the shield can never be the thing that kills, and capped at the MP you have. The rest is the damage to HP.
- God save (1423-1427). If the hit is lethal (`dam >= HP`), `god_protects_from_harm` (religion.cc 4157) may save you. Two rolls: (a) with the protect-from-harm or lifesaving passive, chance `(100 + min(piety breakpoint 5, piety)) / 1000` (4159-4161); (b) with the lifesaving passive and no cooldown (`gift_timeout == 0`, 4166), chance `piety / 160` (4167). A lifesaving save starts a cooldown of `20 + random2avg(10, 2)` on the gift timer, capped at 200 (4169; `_inc_gift_timeout` 1046-1052). Saved: wake up, no HP change, return.
- If not saved, HP drops and, if HP is 0 or less, `player_die` runs (1498-1499).
- In `player_die` (1502): a Xom-acting death may be escaped (1505-1530). Then Xom may save your life (`xom_saves_your_life`, 1542). That save is one in twenty (xom.cc 5475), needs Xom worship and a tension and mood check (5483), and returns HP to `1 + random2(HP max / 4)` (5497).
- Lives (1597-1619). If you have lives left and the death is real, one life is spent (1602), `pending_revival` is set (1603), a corpse is placed at your position (1619, via `_place_player_corpse` 1121-1139 with a dummy monster and `ALWAYS_CORPSE_KEY`, 1130, 1139), and the game continues. If no lives are left, the game ends here (after the lives block, not read further).
- Lives come from one place: the MUT_MULTILIVED mutation gives one life (ng-setup.cc 588-589). Otherwise lives start at 0 (player.cc 5721 reset).
- Revival (main loop, main.cc 1097-1100; nearby-danger.cc 441-510). `revive()` clears most durations, the caught and constricted states, and beholder and fearmonger effects (446-490), sets HP and MP to full (495-496), clears `pending_revival` (498), and fails only if max HP is 0 (503). Then `bring_to_safety` (390) samples random floor cells and keeps the one with the lowest monster threat, stopping early at zero threat (403-404; the donor has an abyss exception at 392-395).
- Inventory. The lives path (1597-1620) and revive (441-510) do not touch the inventory in the read code. The donor's permadeath is the other tier (no lives).
- Permadeath and the bones ghost. When the game ends, the dead character becomes a saved ghost for other games (end.cc 303; files.cc 3940-3954). Eligibility: not a tutorial, and in the dungeon branch only below depth 2 (ghost.cc 1230-1234). A ghost copies the dead character's combat numbers, with caps: HP at most 400 (ghost.cc 35, 435), evasion at most 50 (ghost.h 28, 436), and the weapon's damage (426-440). Per level there are at most 27 ghost files (files.cc 150, 3954). Loading places a ghost as a monster, up to a max count per call (files.cc 3165-3172).
- Animate Dead (necromancy on corpses). Casting it dismisses the zombies you made (spl-other.cc 95, 109-110), then sets a window of `20 + random2(1 + pow)` turns and stores the power (114-115). While the window is open, a monster that dies in your line of sight may rise as a friendly zombie made from its corpse (mon-death.cc 2047), with chance `(150 + pow/2) / 200` (1965-1970). The window is the cap: when it ends, nothing rises.
- Corpses rot (corpse.cc 20-91). Each corpse's freshness drops by `elapsed / 20` (corpse.h 9; 63, 40). At zero, a corpse of a species with a skeleton becomes a skeleton (50, 87), and any other corpse is destroyed (47).

Tick: revival and the lives path run once, at the death. Corpse rot runs from elapsed time (rot_corpses). Animate Dead's window is set with the duration call (spl-other.cc 114); the time unit of that duration was not read.

## 2. Key functions

- `ouch`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/ouch.cc` 1325-1500. Damage, spirit shield, god save, death call.
- `player_die`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/ouch.cc` 1502-1625. Xom escape, Xom save, lives, corpse.
- `god_protects_from_harm`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/religion.cc` 4157-4170.
- `xom_saves_your_life`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/xom.cc` 5465-5500.
- `revive`, `bring_to_safety`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/nearby-danger.cc` 390-510.
- `ghost_demon::init_player_ghost`, `ghost_eligible`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/ghost.cc` 426-440, 1230-1235.
- `save_ghosts`, `load_ghosts`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/files.cc` 3135-3175, 3928-3960.
- `cast_animate_dead`, `_dismiss_dead`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/spl-other.cc` 86-116.
- `_animate_dead_reap`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/mon-death.cc` 1965-1975, 2040-2050.
- `rot_corpses`, `_maybe_rot_corpse`: `/mnt/frankendom-donors/crawl-crawl/crawl-ref/source/corpse.cc` 35-65.

## 3. Numbers vs mechanism

| Formula or rule | Number range (donor value) | file:line |
|---|---|---|
| Spirit shield MP share | mp = round(dam x MP / (HP + MP)), at least dam + 1 - HP, at most MP | ouch.cc 1401-1412 |
| Protect-from-harm chance | (100 + min(piety breakpoint 5, piety)) / 1000: 10 percent at zero piety, rising with piety (breakpoint value not read) | religion.cc 4159-4161 |
| Lifesaving chance | piety / 160 (no cooldown) | religion.cc 4166-4167 |
| Lifesaving cooldown | 20 + random2avg(10, 2) added to gift timer; timer capped at 200 | religion.cc 4169; 1046-1052 |
| Xom save | 1 in 20, tension >= random2(5), Xom in a good mood; revive at 1 to HP max/4 | xom.cc 5475, 5483, 5497 |
| Lives | 0 by default; 1 with the MUT_MULTILIVED mutation | ng-setup.cc 588-589; player.cc 5721 |
| Revival HP and MP | full (set to 9999, clamped) | nearby-danger.cc 495-496 |
| Bring to safety | up to 100000 samples, stop at zero threat | nearby-danger.cc 403-404 |
| Ghost HP cap | 400 | ghost.cc 35, 435 |
| Ghost evasion cap | 50 | ghost.h 28, 436 |
| Ghost files per level | 27 | files.cc 150, 3954 |
| Animate Dead window | 20 + random2(1 + pow) turns | spl-other.cc 114 |
| Animate Dead reap chance | (150 + pow/2) / 200, capped at 1 | mon-death.cc 1970 |
| Corpse rot per tick | elapsed / 20 freshness units | corpse.h 9; corpse.cc 63, 40 |

## 4. TypeScript sketch

simplified: the sketch follows the donor order: spirit shield first, then god save, then Xom, then the lives rule, then revival and the safe-cell search, then the permadeath ghost, then Animate Dead's window and reap. It drops the Xom-acting escape (the donor's `player_die` branch for Xom's own kills), the damage and wake-up side effects, the cleanup of durations and forms, `_death_is_worth_saving`, the abyss exception, and the ghost's weapon damage. The donor's `bring_to_safety` counts only valid cells toward its tries (`tries += 1000`); the sketch counts all samples. The donor's rounding uses `div_rand_round`; the sketch takes a rounding function as input. The donor's random integer draws are shown as `rnd` calls.

```ts
// Licence: GPL-2.0 (donor Dungeon Crawl Stone Soup, LICENSE "Version 2, June 1991"). Clean-room sketch written from the described mechanism; not a translation of the donor lines.
// clean-room

// ---- 1. A lethal hit: spirit shield split, then god save, then Xom, then lives ----
export interface Pools { hp: number; hpMax: number; mp: number; }

// Spirit shield: MP takes a share of the hit in proportion to the two pools, but never so much that the hit kills.
export function spiritShieldSplit(dam: number, p: Pools, roundFair: (x: number) => number): number {
  const share = roundFair((dam * p.mp) / Math.max(p.hp + p.mp, 1));
  const mpTaken = Math.min(Math.max(share, dam + 1 - p.hp), p.mp);
  return dam - mpTaken; // damage left for HP
}

export interface GodSave { piety: number; pietyBreakpoint5: number; protectPassive: boolean; lifesavingPassive: boolean; giftTimeout: number; }

// Chance to survive a fatal hit by god protection. Protection uses piety over 1000; lifesaving uses piety over 160 and needs no cooldown.
export function godSaveChance(g: GodSave): { protect: number; lifesave: number } {
  const protect = g.protectPassive || g.lifesavingPassive
    ? (100 + Math.min(g.pietyBreakpoint5, g.piety)) / 1000 : 0;
  const lifesave = g.lifesavingPassive && g.giftTimeout === 0 ? Math.min(1, g.piety / 160) : 0;
  return { protect: Math.min(1, protect), lifesave };
}

// Cooldown after a lifesaving save: adds to the timer, capped at 200.
export function addGiftTimeout(timeout: number, val: number): number {
  return Math.min(200, timeout + val);
}

// Xom: a worshipper of Xom has a one-in-twenty chance, gated by tension and mood. Returns HP left, or null.
export function xomSave(
  worshipsXom: boolean, rnd: () => number, tension: number, xomIsNice: boolean, hpMax: number,
): number | null {
  if (!worshipsXom) return null;
  if (rnd() >= 1 / 20) return null;
  if (tension < Math.floor(rnd() * 5) || !xomIsNice) return null;
  return 1 + Math.floor(rnd() * Math.floor(hpMax / 4));
}

// A spent life sets a pending revival and leaves a corpse at the spot. No lives means the run ends.
export function onLethalHit(lives: number, realDeath: boolean): { lives: number; revive: boolean; corpse: boolean } {
  if (lives > 0 && realDeath) return { lives: lives - 1, revive: true, corpse: true };
  return { lives, revive: false, corpse: false };
}

// ---- 2. Revival: full HP and MP, then a low-threat floor cell ----
export interface Cell { x: number; y: number; floor: boolean; threat: number; }
export function bringToSafety(sample: () => Cell, tries = 100000): Cell | null {
  let best: Cell | null = null;
  for (let t = 0; t < tries && (best === null || best.threat > 0); t++) {
    const c = sample();
    if (!c.floor) continue;
    if (best === null || c.threat < best.threat) best = c;
  }
  return best;
}

// ---- 3. Permadeath: a bones ghost for other games, with capped stats ----
export const MAX_GHOST_HP = 400;
export const MAX_GHOST_EVASION = 50;
export const GHOST_LIMIT = 27; // ghost files per level

export interface GhostRecord { name: string; hpMax: number; evasion: number; }
export function makeGhost(name: string, hpMax: number, evasion: number): GhostRecord {
  return { name, hpMax: Math.min(hpMax, MAX_GHOST_HP), evasion: Math.min(evasion, MAX_GHOST_EVASION) };
}
export function ghostEligible(depth: number, inDungeon: boolean, tutorial: boolean): boolean {
  return !tutorial && (!inDungeon || depth > 2);
}
export function canSaveGhost(filesOnLevel: number): boolean {
  return filesOnLevel < GHOST_LIMIT;
}

// ---- 4. Animate dead: a timed window; monsters that die in view may rise as friendly zombies ----
export function animateWindowTurns(pow: number, rnd: (n: number) => number): number {
  return 20 + rnd(1 + pow);
}
export function reapChance(pow: number): number {
  return Math.min(1, (150 + pow / 2) / 200);
}
// Recasting first dismisses the zombies this caster made.
export function recast(zombieIds: number[]): { dismissed: number[] } {
  return { dismissed: zombieIds.slice() };
}
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/DR001-crawl-death.ts): exit 0, no output.

## 5. Lands in

- TARGET `src/fight/death.ts` (the death step: lethal-hit resolution, god-style save with cooldown, lives and revival, bring-to-safety). Parity-checklist row 17 (death/respawn). The Animate Dead reap is a necromancy spell effect, not a death rule; it lands in the spell module, but its window and cap are cited here under row 17 only as the corpse-to-ally shape.
- Server tick: the donor's corpse rot runs from elapsed time (corpse.cc 58-65), which is the shape for Frankendom's corpse window: one per-tick step with dt, no timer per corpse. Parity row 23 does not apply (no zone spawn in this topic).

Best transferable idea: A lethal hit is settled once on the server: a piety-scaled save with a cooldown, then a spent life that revives at full HP on a low-threat cell and leaves the corpse behind, then a capped ghost for permadeath.
Decision (proposed): adapt — take the piety-scaled save with cooldown and the spent-life revive as server rolls with a logged seed; lives are data; the bones ghost in other players' games is a PvP-world call for Strategy, not adopted by default.
Acceptance: A server test with the save roll forced: a lifesave-passive character survives once and the cooldown blocks a second save; a character with one life revives at full HP on a zero-threat cell, the corpse stays at the death spot, and the inventory is unchanged.

Reuse tag: rewrite-from-idea (GPL-2.0; clean-room only, shape only)
Brief rule served: 1 (one ledger: the death outcome is decided once, server-side); rules 7-9 n/a

## 6. Gaps and risks

- GPL-2.0: clean-room only. The sketch is written from the mechanism, not from the donor lines.
- No corpse run. The donor has no walk-back-to-corpse rule: a spent life leaves the corpse where you died, and the inventory stays with you (1597-1620; nearby-danger.cc 441-510 touch no inventory code). Frankendom's corpse window and take-one loot are therefore not a donor pattern; they must come from the other donors (see the ModernUO and EQEmu notes).
- Lives are a species or mutation tier (MUT_MULTILIVED, ng-setup.cc 588). Frankendom's death tiers should be data (one life for some heroes), not a mutation.
- God save and Xom save are random. Frankendom's server-verified rulings need the same roll on the server, with a seed logged in the fight record. Otherwise a client can claim a save it did not get.
- Gift timer is shared by the god save and the god gifts (1181 and 4169 both use `_inc_gift_timeout`). Frankendom should keep one cooldown per character, not one per source.
- Spirit shield's MP share is a two-pool split (ouch.cc 1401-1412). It transfers as a damage-absorb rule only if Frankendom has a mana or stamina pool; the death-save rule itself does not depend on it.
- Bones: a dead character becomes a ghost in other games, capped at HP 400 and evasion 50 (ghost.cc 35, 435-436; ghost.h 28). Frankendom's single-engine, server-verified rulings make cross-save ghosts a design decision, not a default. Flag for Strategy: this is a PvP-world shape, not a death rule.
- Donor gap: the ghost-loading caller on level creation was not found by grep (files.cc 3135 is only called by wiz-mon.cc 1013). The quota is therefore read from the save side only (files.cc 3954).
- Donor gap: `_death_is_worth_saving` (xom.cc) was not read; the Xom save's full gate is therefore partly unread.
- Donor gap: `place_corpse_or_gold` (mon-death.cc 474) was not read; the corpse's contents on a spent life are not verified beyond the dummy-monster call.
