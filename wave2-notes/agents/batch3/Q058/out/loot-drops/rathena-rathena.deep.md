# rathena-rathena (loot-drops, cell 3)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` (with `conf/battle/drops.conf`, `conf/battle/monster.conf`, `conf/battle/player.conf`) | Licence: GNU GPL version 3 (`LICENSE`: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; mob.cpp line 1: "Licensed under GNU GPL") | C++ | symbols `mob_dead` (loot owners and the drop loop) and `mob_getdroprate` (per-entry rate)

Checked: `mob_dead` starts at mob.cpp 2934. Read: the damage-log loop and the owner list (2978-3062), the MVP helper (2895-2928, read to 2928), and the monster drop list loop with its per-entry roll (3316-3360). `mob_item_drop` 2582-2616 read in full. `mob_getdroprate` 2818-2890 read in full. The hint "INFERRED" was not a file; I searched for drop and loot code by grep and found this path. Not read: the rest of `mob_dead` (exp and party split, 3062-3315 and 3360-3550), the map-wide drop block (3388-3418, which calls `mob_getdroprate` with factor 10, seen by grep only), the party share (`party_share_loot`), the floor-drop branch after 2615, and how `dmglog` is first filled. `drop_modifier` is used only under `RENEWAL_DROP` (2874-2876); the renewal `apply_rate` was not read. Callers of `mob_getdroprate`: 3332 (read), 3388 and 3409 (grep only), 3308-3310 (fixed drops that use `mobdrop->rate` directly, not read in full). Callers of `mob_dead` were not checked (the owner rules are stated for the death path in this function only). Confidence: high on the rate formula, the roll and the owner list; medium on the full ownership path to the floor.

Best transferable idea: Give loot priority to the top three damage dealers, with the first attacker getting a fixed share of the total damage as a bonus, and roll each drop as a permyriad chance whose modifiers can raise the rate up to a cap that never lowers a base rate already above it.
Decision (proposed): adapt - take the owner list (first, second, third by damage, with a first-attacker bonus of 30 percent of total damage) and the permyriad roll with the cap rule into `src/fight/loot.ts`; leave out the size, luck and class/race modifiers until a ruling asks for them, because they are server-tuning knobs, not fight design.
Acceptance: In a three-player fight against one boss, the server's loot owner list is the top three by damage (with the first attacker's bonus), the owner receives loot priority for the drop, and a drop with a base rate of 9500 out of 10000 is not clipped to the 9000 cap, while a drop with a base rate of 5000 is clipped to 9000 after bonuses.

## 1. Mechanism

- Two steps, both run in `mob_dead` when a monster dies. Step A decides who has loot priority. Step B rolls each drop.
- Step A, loot owners (mob.cpp 2978-3062):
  (a) Walk the monster's damage log in order (2988). Add every entry to `total_damage`, including entries from players who have left (2991).
  (b) Build `lootdmg`, one entry per eligible player, in the order the players first appear in the log. Eligibility is checked per entry: the player must be online, on this map and alive (2996-3007, read in part). Slave damage (pet or homunculus) is merged into the owner's entry (3038-3047).
  (c) The first entry gets a bonus of `total_damage * first_attack_loot_bonus / 100` (3051-3052), with `first_attack_loot_bonus` = 30 by default (drops.conf 22).
  (d) Sort by damage, highest first (3055-3057). The top three are `first_sd`, `second_sd`, `third_sd` (3058-3062).
  (e) For MVP-type bosses only (2900-2901), the MVP helper (2895-2928) can return `first_sd` instead of the damage MVP when `mvp_to_loot_priority` is on (2904-2905; default no, drops.conf 27).
- Step B, the drop loop (3323-3355). For each entry of the monster's drop list, in order:
  (a) `drop_rate = mob_getdroprate(src, md->db, entry->rate, drop_modifier, md)` (3332).
  (b) Roll `rnd() % 10000` and skip the entry when the roll is at or above the rate (3335-3336). So a rate of 5000 drops on rolls 0-4999.
  (c) Create the item (3343). Announce if it is rare enough (3346-3351, off by default). Hand it to `mob_item_drop` with the base rate for autoloot (3354).
- `mob_getdroprate` (2818-2890), in this order:
  (a) Start at the base rate (2820). Size: only when `mob_size_influence` is on (monster.conf 286; default no), a medium monster with rate 2 or more halves it and a big monster doubles it (2822-2827).
  (b) Luck, only when there is a source (2830): a fixed add `luk * drops_by_luk / 100 * factor` (2832) and a percentage add `(0.5 + rate * luk * drops_by_luk2 / 10000) * factor` (2833-2834). Both default to 0 (drops.conf 148, 153).
  (c) Player-only block (2836-2871): the bonus and the cap apply only when the source is a player. The bonus starts at 100 (2838). PK-mode +25 for a 20-level gap (2841-2842, only when pk_mode is on). Class and race adds (2846-2847). Item boost and the second period boost (2849-2852). VIP adds `vip_drop_increase` (2856-2858; default 50, player.conf 236) and sets the VIP cap; otherwise the normal cap (2859-2861). The rate becomes `0.5 + rate * bonus / 100` (2865). Cap: if the rate is above the cap and the base rate was below the cap, clamp to the cap (2868-2870). The cap is 9000 for both normal and VIP (drops.conf 209-210).
  (d) Renewal only: `apply_rate(rate, drop_modifier)` (2874-2876).
  (e) Clamp to `10000 * factor` (2879). Minimum 1 unless `drop_rate0item` is on (2882-2887; default no, drops.conf 137).
- Tick: none. This runs once per monster death.

## 2. Key functions

- `mob_dead`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 2934 (signature). The owner list is 2978-3062, the drop loop is 3316-3360.
- `mob_getdroprate`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 2818-2890. The whole rate pipeline.
- `mob_item_drop`: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 2582-2616. Picks the autoloot owner from first, second, then third (2589-2591), tests autoloot against the rate (2592-2595), and appends the item to the drop list (2615).
- The MVP helper: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 2895-2928 (only the part shown in the receipts was read).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Owner list of the top three by damage, merged per player | Three slots first, second, third (theirs, mob.cpp 2589-2591, 3058-3062). Slaves merged into the owner (3045). |
| First-attacker bonus as a share of total damage | 30 percent (theirs, drops.conf 22; applied at mob.cpp 3052) |
| Permyriad roll, miss when roll >= rate | Scale 10000 (theirs, mob.cpp 3335). Default rate clamp 10000 (2879). |
| Cap that only applies when the base is below it | Cap 9000 for normal and VIP (theirs, drops.conf 209-210; mob.cpp 2868-2870) |
| Bonus percentage stacks additively, then multiplies the rate | Start 100, VIP +50 (theirs, player.conf 236; mob.cpp 2838, 2858, 2865) |
| Minimum rate 1 (never zero unless the switch is on) | 1 (theirs, mob.cpp 2886; drop_rate0item default no, drops.conf 137) |

## 4. TypeScript sketch

simplified: the sketch follows the donor order: owners first (aggregate in log order, first-attacker bonus, sort, top three), then per-drop rate (bonus percentage, then the cap rule, then the 1 to 10000 clamp), then the roll (a drop happens when the roll is below the rate). Unlike the donor, it always applies the bonus and the cap; the donor applies them only when the source is a player (2836), so the caller must pass bonusPct 0 and cap 10000 for a non-player source. Ties in the sort are ordered by JS's stable sort; the donor's std::sort gives no tie order. It omits: the eligibility checks on online, same map and alive (taken as a flag on each entry), slave and homunculus merging (the input is already per owner), the PK-mode and class/race and item-boost and period-boost adds (only a flat bonus percentage is passed in), the luck terms, the size modifier, the renewal `apply_rate`, the factor argument for map-wide drops, the rare-drop announcement, the autoloot test, party share, and the floor drop. It does not reorder anything it keeps.

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface DamageEntry { playerId: string; dmg: number; eligible: boolean; }
interface Owner { playerId: string; damage: number; }

// Loot owners: aggregate per player in log order, bonus the first entry, sort, keep the top three.
function lootOwners(log: DamageEntry[], firstBonusPct: number): Owner[] {
  let total = 0;
  for (const e of log) total += e.dmg;              // every entry counts, eligible or not
  const owners: Owner[] = [];
  for (const e of log) {
    if (!e.eligible) continue;
    const found = owners.find((o) => o.playerId === e.playerId);
    if (found) found.damage += e.dmg;
    else owners.push({ playerId: e.playerId, damage: e.dmg });
  }
  if (owners.length > 0) owners[0].damage += Math.floor((total * firstBonusPct) / 100);
  owners.sort((a, b) => b.damage - a.damage);
  return owners.slice(0, 3);
}

// Permyriad rate: base, then a flat bonus percentage, then the cap rule, then the 1..10000 clamp.
function dropRate(base: number, bonusPct: number, cap: number): number {
  let rate = Math.floor(0.5 + (base * (100 + bonusPct)) / 100);
  if (rate > cap && base < cap) rate = cap;         // cap only clips a base that started below it
  return Math.min(Math.max(rate, 1), 10000);
}

// One roll out of 10000. A drop happens when the roll is below the rate.
function rollDrop(rate: number, roll: number): boolean {
  return roll < rate;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module, proposed): the owner list (top three by damage, first-attacker bonus) and the permyriad drop roll with the cap rule. Runs once on the server at the death of a monster, on the same tick as the kill.
- Parity-checklist row 18 (loot roll and XP award). The owner list is the data that row 18 uses to decide who gets loot priority.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: server-verified kills (owners come from the server's damage log); one ledger (the owner list is one record per fight); MAX_ATTACKERS = 3 (the donor also keeps exactly three owner slots)

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism. No line of the donor is translated.
- The donor's owner list has exactly three slots, which matches Frankendom's MAX_ATTACKERS = 3. Check the match in the ruling; do not assume it makes three the correct number for loot.
- The first-attacker bonus is a flat 30 percent of total damage (drops.conf 22). That bonus is large relative to a short fight: a single early hit can give the first attacker most of the loot priority. Frankendom must test it against many-vs-one fights before adopting the number.
- The donor's eligibility checks (online, same map, alive) run at the death moment on the server. Frankendom's kill must still be server-verified, and a dead or left player must be checked the same way.
- The stacking (size, luck, class and race, item boost, VIP, PK) is a long list of server-tuning knobs. Frankendom should keep one bonus percentage per zone (zone data) and not copy the list.
- The cap rule (mob.cpp 2868) clips only when the base is below the cap. A designer might assume the cap always clips; state the rule in the zone data documentation.
- Not read: the party share and the floor-drop path after `mob_item_drop` (2615 onward), the map-wide drops (3388-3418), the fixed drops (3308-3310), and the `dmglog` fill order (so "log order" is the order the donor's log holds, not confirmed as first-hit order).
- Pit as client: the owner list and the roll are server-side. The Pit may show who has loot priority.
