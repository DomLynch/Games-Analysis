# 2004Scape-Server (death-respawn-penalty, cell 2)

Donor: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/player/scripts/death.rs2` (with `skill_combat/scripts/pvp/pk_skull.rs2`, `pvp_melee.rs2`, `src/engine/entity/HeroPoints.ts`, `src/engine/script/handlers/PlayerOps.ts` and `InvOps.ts`, `src/engine/entity/Obj.ts`, `src/engine/World.ts`) | Licence: MIT License, "Copyright (c) 2023-2025 Lost City" (LICENSE file, read; permissive, code may be adapted with the notice) | TypeScript engine plus RS2-style script files | procs `player_death`, `player_death_lose_items`, `pvp_death_lose_items`, `move_priciest_item_on_hero_to_death`; engine class `HeroPoints`

Checked: Read in full: `death.rs2` (1-186), `pvp_melee.rs2` (1-40), `duel_arena_finish.rs2` (1-30), `HeroPoints.ts` (1-48), `Obj.ts` (1-62), the `FINDHERO` and `BOTH_HEROPOINTS` handlers in `PlayerOps.ts` (1084-1125), the `BOTH_DROPSLOT` and `INV_DROPALL` handlers in `InvOps.ts` (670-790), `World.addObj` (1480-1530), `pvp_combat.rs2` 183-200, constants `pvp.constant` and `lootdrop.constant`. `pk_skull.rs2`: lines 1-28 read in full; 29-56 read only as grep excerpts (the expiry and logout procs). The three `clear()` sites in `PlayerOps.ts` (461-462, 501, 558) were read as six-line contexts, not in full. Callers of `both_heropoints`: `pvp_melee.rs2:36` read; `pvp_ranged.rs2:43` and `pvp_magic.rs2:189` seen by grep only (not read). The `death_jingle` and `session_log` calls, `stat_reset_all`, `prayer_deactivate_all`, `follower_death`, `in_duel_arena`, the `obj_add` receiver (the `OBJ_ADD` handler past line 30), the `CoordGrid` packing that decodes `0_50_50_21_18`, the pickup handler, and `Player.resetEntity` past line 445 were not read. The duel branch was traced in the fix pass (see section 6): `@player_death_duel` is a label jump, so the keep/drop routine at `death.rs2:24-31` is not reached on a duel death; not run-tested. Camera: not a camera cell (camera_scope n/a). Confidence: high on the item-drop routing, the hero table and the skull rule; medium on the duel control flow; medium on the respawn coordinate (decoded by the usual RS2 packing, not checked against `CoordGrid`).

Best transferable idea: Credit a kill to the player with the most recorded damage in a fixed-size server table, and let that same table decide whether the death is PvP, so many-on-one credit and death tier come from one ledger.
Decision (proposed): adapt — keep the damage-credit table and its PvP tier, but cap it at MAX_ATTACKERS = 3 and evict the lowest row instead of dropping a new attacker, and expire credit by idle time instead of clearing it on a full heal; reject the donor's clear-on-heal.
Acceptance: Server test: three players hit a mob; a fourth attacker whose hit beats the lowest row replaces that row, the kill goes to the top row, a heal to full does not clear the table, and the table clears after 10 idle ticks.

## 1. Mechanism

- Entry: the death queue `[queue,player_death]` (`death.rs2:10`). First a duel check (11-13): if a duel partner exists and the arena test passes, it jumps to `player_death_duel` (`duel_arena_finish.rs2:1-19`), which marks the duel lost, runs the death proc, queues `duel_finish`, and moves the winner's duel winnings (13). The `@player_death_duel` jump replaces the queue body, so the lines after it (message, keep/drop routine, teleport) do not run for a duel death (as read; not run-tested).
- The death proc (`death.rs2:1-8`): set the death flag (2), wait 1 tick (3), stop action and close interfaces (4-5), play the death animation (6), wait 3 ticks (7), clear the flag (8). The melee check refuses a new attack while the flag is set (`pvp_melee.rs2:5-8`). So the dying player is locked for about four ticks.
- Then the message and the combat clear (14-21), save the wielded weapon (23), and choose the rule: if `findhero` is true, run `pvp_death_lose_items` (24-26); otherwise `player_death_lose_items` (27-31). The choice is made by the hero table, not by the zone (see section 3).
- After the drop routine (32-44): teleport to a fixed coordinate (32), rebuild appearance (33), deactivate all prayers (34), follower death (35, not read), stop action, `stat_reset_all` (39, not read), `healenergy(10000)` (40; the energy variable was not checked), clear the pk skull (41), clear poison (42), update all and refresh tabs (43-44). The drops happen first, at the death tile, and the teleport is after.
- Keep rule, shared by both routes (`player_death_lose_items` 47-63 and `pvp_death_lose_items` 93-110): clear the keep list (54, 101). If not skulled, move the three priciest candidates to the keep list (56-60, 103-107). If the protect-items prayer is on, move one more (61-63, 108-110). The candidate scan covers inventory and worn items (`move_priciest_item_on_hero_to_death`, 152-177), skips items with `destroy_death` (155, 168), ranks by `oc_cost` (156-158, 169-172), and returns when nothing is left (179-181). So the rule is: keep 3 when unskulled, 0 when skulled, plus 1 with the prayer, chosen by price, and never more than what exists.
- PvE drop (`player_death_lose_items` 84-91): cape messages only (65-85). Then `inv_dropall` for inventory and worn (87-88) to the death tile with `lootdrop_duration` (200 ticks), a bones pile (89), and the keep list is moved back (90-91). Drops are public (see below). Untradables are deleted, not dropped, in this handler (`InvOps.ts:771-774`).
- PvP drop (`pvp_death_lose_items` 93-141): one random kill message to the killer (94, `pvp_combat.rs2:183-200`). Then per slot: a god cape is deleted (116-118), anything else goes through `both_dropslot` (120). Worn items follow the same pattern (126-138). A bones pile is added last (139). `BOTH_DROPSLOT` (`InvOps.ts:676-730`) removes the item from the victim, writes a PvP wealth event for permanent items (709), deletes an untradable after the removal (722-723), and otherwise adds the item to the world with the killer as receiver and the loot duration (726).
- Reveal window: a receiver pile reveals after `Obj.REVEAL` = 100 ticks (`Obj.ts:9`; `World.ts:1506-1512`) and is removed when its lifecycle ends at the loot duration (200 ticks, `Obj.ts:36`). While `reveal > -1`, `isValid(hash64)` is false for anyone but the receiver (`Obj.ts:53-55`). So a PvP drop belongs to the killer for 100 ticks, then to everyone until 200 ticks. A PvE drop has no receiver and is public from the start (`InvOps.ts:777`).
- Skull (the PvP flag): `set_pk_vars` runs at the start of every melee attack (`pvp_melee.rs2:15`), before the hit roll (`pvp_melee.rs2:29`), so a miss skulls too. It calls `deserves_pk_skull` (`pk_skull.rs2:2-9`): false in the duel arena (3-5) and false on retaliation (6-8): if the defender's prey list holds the attacker, or the attacker's predator list holds the defender. Then the skull is set for `pk_skull_duration` = 2000 ticks (`pvp.constant:1`, `pk_skull.rs2:13`), with expiry at `map_clock + duration` (31). Memory: prey keeps 2 (16-17), predators keep 3 (20-22).
- Hero table (the damage credit): every successful melee hit calls `both_heropoints($damage)` (`pvp_melee.rs2:36`). `$damage` is `min(randominc(maxhit), .stat(hitpoints))` (34), so credit never exceeds what the target had left. A protect prayer on the target cuts the max hit to 60% (31-32). The opcode adds the points to the target's table (`PlayerOps.ts:1118`). `HeroPoints` holds 16 rows (`Player.ts:392`). Adding: ignore points below 1 (`HeroPoints.ts:20-22`); add to an existing row (24-27); otherwise take the first empty row (31-34). If no row is empty, the attacker is dropped with no error (31-34 has no else). `findHero` sorts a copy by points, highest first (42-44), and returns the first hash (46).
- `findhero`: returns true only if the top hero has a live player object (`PlayerOps.ts:1089-1101`; a missing player pushes 0). That is the PvP switch in `death.rs2:24`.
- Clearing: the table is cleared when hitpoints reach base through a boost (`PlayerOps.ts:461-462`), a boost (501) or a heal (558). `Player.resetEntity` clears it too (`Player.ts:445`, not read in full).
- Tick: the world tick is 600 ms (`World.ts:120`); the next tick is `Date.now() + TICKRATE` (`World.ts:362`). Every timer above is in ticks (`lootdrop_duration`, `pk_skull_duration`, `Obj.REVEAL`).

## 2. Key functions

- `player_death` queue and proc, PvE and PvP drop: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/player/scripts/death.rs2` 1-186.
- Skull: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/skill_combat/scripts/pvp/pk_skull.rs2` 2-56; set on attack in `pvp_melee.rs2` 15.
- Hero table: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/HeroPoints.ts` 8-47; opcode `PlayerOps.ts` 1089-1118; clears at `PlayerOps.ts` 461-462, 501, 558.
- Drop opcodes: `/mnt/frankendom-donors/2004Scape-Server/src/engine/script/handlers/InvOps.ts` 676-790.
- Reveal: `/mnt/frankendom-donors/2004Scape-Server/src/engine/entity/Obj.ts` 1-62; `World.ts` 1484-1516.
- Duel: `/mnt/frankendom-donors/2004Scape-Server/data/src/scripts/minigames/game_duelarena/scripts/duel_arena_finish.rs2` 1-30.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Keep the N most valuable, fewer when flagged | Keep 3 unskulled (`death.rs2:57-59`), 0 skulled (56), +1 protect prayer (61-63) |
| Candidates include worn items; destroy-flag excludes | `destroy_death` param (`death.rs2:155`, `data/src/scripts/areas/area_mage_arena/configs/mage_arena.obj:31`; also `quests/quest_desertrescue/configs/desertrescue.obj:61`) |
| Skull (flag) expires after a fixed time | 2000 ticks = 1200 s at 600 ms (`pvp.constant:1`, `World.ts:120`) |
| Retaliation exemption | prey list 2, predator list 3 (`pk_skull.rs2:16-22`) |
| Receiver-only window, then public | reveal 100 ticks (`Obj.ts:9`); lifecycle 200 ticks (`lootdrop.constant:1`) |
| Damage credit table | 16 rows (`Player.ts:392`); cap check at `HeroPoints.ts:31-34` |
| Damage cap at remaining HP | `min(randominc(maxhit), .stat(hitpoints))` (`pvp_melee.rs2:34`) |
| Protect prayer melee cut | max hit x 6/10 (`pvp_melee.rs2:32`) |
| Death lock | 1 + 3 ticks (`death.rs2:3, 7`) |
| Respawn | packed coordinate `0_50_50_21_18` (`death.rs2:32`), one point |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's credit rule (points per attacker, top row wins, the skull is set on the attempt, not the hit) and the retaliation memory sizes (2 prey, 3 predators). It changes three things on purpose: the table is capped at `MAX_ATTACKERS = 3` and evicts the lowest row rather than dropping a new attacker; the credit expires after idle ticks instead of clearing on a full heal; and the PvP tier is any recorded player damage, not whether the top hero has a live player object. It omits the drop routine (already in the other note), the duel branch, the wealth events, the protect prayer's melee cut, the duel-arena check beyond a flag, the `Player.resetEntity` clear, and the pickup side of the receiver window. Typechecked on the VPS (`npx -p typescript tsc --noEmit --strict --target es2020`).

```ts
// Licence: MIT (donor, Lost City 2023-2025). clean-room sketch written from the described mechanism, not a copy of the donor lines.
// clean-room
export {};

export const MAX_ATTACKERS = 3;       // Frankendom ruling; donor table has 16 slots
export const CREDIT_IDLE_TICKS = 10;  // fix: credit expires after idle time, not on full heal (ruling 2)

interface Attacker { id: string; points: number; }

// Damage credit: who hit this entity, with points. Only player attackers are recorded.
export class DamageTable {
  private rows: Attacker[] = [];
  private lastHitTick = Number.NEGATIVE_INFINITY;

  constructor(private readonly cap: number = MAX_ATTACKERS) {}

  // Donor (HeroPoints.addHero) silently drops a new attacker when every slot is full.
  // fix: when full, the lowest-points row is evicted if the new hit is bigger.
  add(id: string, damage: number, tick: number): void {
    if (damage < 1) return;
    this.lastHitTick = tick;
    const existing = this.rows.find((r) => r.id === id);
    if (existing) { existing.points += damage; return; }
    if (this.rows.length < this.cap) { this.rows.push({ id, points: damage }); return; }
    let low = 0;
    for (let i = 1; i < this.rows.length; i++) {
      if (this.rows[i].points < this.rows[low].points) low = i;
    }
    if (this.rows[low].points < damage) this.rows[low] = { id, points: damage };
  }

  // Top attacker by points. Returns the record even if that player is offline. The donor's
  // findhero pushes 0 (PvE path) when the top hero has no live Player object, so the tier flips.
  top(): Attacker | null {
    let best: Attacker | null = null;
    for (const r of this.rows) {
      if (best === null || r.points > best.points) best = r;
    }
    return best;
  }

  // Replaces the donor's clear-on-full-heal. Credit lasts CREDIT_IDLE_TICKS after the last hit.
  expire(tick: number): void {
    if (tick - this.lastHitTick >= CREDIT_IDLE_TICKS) this.rows = [];
  }

  size(): number { return this.rows.length; }
}

export type DeathTier = 'pve' | 'pvp';

// Donor: tier is PvP when findhero succeeds (top hero online). fix: any recorded player attacker makes it PvP.
export function deathTier(table: DamageTable): DeathTier {
  return table.size() > 0 ? 'pvp' : 'pve';
}

// Skull memory: prey = last 2 players this one attacked; predators = last 3 who attacked this one.
export interface PkMemory { prey: string[]; predators: string[]; }

// Donor deserves_pk_skull: no skull in the duel arena, or on retaliation (either side's memory names the other).
export function skullAllowed(attackerId: string, attacker: PkMemory, defenderId: string, defender: PkMemory, inArena: boolean): boolean {
  if (inArena) return false;
  if (defender.prey.includes(attackerId) || attacker.predators.includes(defenderId)) return false;
  return true;
}

// Donor set_pk_vars runs on the attack attempt, before the hit roll (pvp_melee.rs2 line 15, roll at 29).
export function recordAttempt(attackerId: string, attacker: PkMemory, defenderId: string, defender: PkMemory): void {
  attacker.prey = [defenderId, ...attacker.prey].slice(0, 2);
  defender.predators = [attackerId, ...defender.predators].slice(0, 3);
}
```

## 5. Lands in

- TARGET `src/fight/death.ts` (engine death step, server-side): the damage credit table (killer = top row), the death tier (PvP when any player damage is recorded), and the skull-on-attempt rule. Parity-checklist row 17 (death/respawn). The killer credit also feeds row 18 (loot roll and XP award); row 17 is the one named here.
- Reuse tag: rewrite-from-idea (MIT, adaptable with the notice; the sketch is clean-room)
- Brief rule served: 1 (one engine: credit and tier come from one server table, not a client view); 17 (death/respawn). Rules 7-9 n/a.

Data shape (PASS2 item 1):
- Donor data: obj rows in `data/src/scripts/**/configs/*.obj` (for example `data/src/scripts/areas/area_mage_arena/configs/mage_arena.obj`, params at lines 31, 65, 99; also `quests/quest_desertrescue/configs/desertrescue.obj:61`); constants in `skill_combat/configs/pvp.constant` (line 1) and `drop tables/configs/lootdrop.constant` (line 1). The obj row fields the script reads: `cost` (`oc_cost`), `category` (`armour_godcape`), params `destroy_death` and `lose_cape_message`, and the item's `tradeable` flag (its source file not read). Hero rows are not data: `HeroPoints` is a code class.
- Row fields for a new death-relevant item: `cost:int`, `tradeable:bool`, `category:enum`, `destroy_death:bool`, `lose_cape_message:string`.
- A new "destroy on death" item is one row: yes (the `destroy_death` param on the obj row).
- A new keep count for a zone is one row: no. Keep 3 is three literal calls in `death.rs2:57-59`. Our sketch makes it a `DeathRule` row (`keepUnflagged`).
- A new respawn point for a zone is one row: no. It is a literal packed coordinate in `death.rs2:32`.
- A new skull duration is one constant row: yes (`pvp.constant`), but it is global, not per zone.

Provenance per claim: repo 2004Scape-Server (no `.git`, no changelog read); licence MIT (LICENSE lines 1-3, read); each claim has its file and line in the receipts file.

What they patched later: no history available (no `.git`, no changelog). Comments are the only record:
- `death.rs2:29` "todo: what npc killed the player": the PvE message does not record the NPC.
- `death.rs2:45` "todo: end poison timer ~player_end_poison": poison is cleared, its timer not ended.
- `pvp_melee.rs2:27-28`: "not sure if xp multipler exists for us or not?!" (a PvP XP multiplier note; the wiki link is cited).
- `pvp_melee.rs2:34` "tick eating existed!": the damage cap at remaining HP follows a wiki update.
- `PlayerOps.ts:1088` and `PlayerOps.ts:1106`: two comments cite Jagex developer posts for the hero rule and the drop rule. I did not open those links.

## 6. Gaps and risks

- The donor credits a kill to the top table row (`findHero`, `HeroPoints.ts:42-46`). Frankendom's many-on-one rule is that kill credit and target selection come from the engine hate list. This table is the same shape: keep it, and make it the one source for credit and tier.
- A silent drop at 16 rows (`HeroPoints.ts:31-34`). With MAX_ATTACKERS = 3, the table must evict the lowest row (sketch), not drop the newcomer.
- The donor clears the table on any full heal (`PlayerOps.ts:461-462`, 501, 558). A fight that ends with a heal loses its kill credit. Frankendom should expire credit by idle time (ruling 2).
- The donor's PvP switch depends on the top hero having a live player object (`PlayerOps.ts:1096-1101`, pushes 0 otherwise). A top attacker who logs out turns a PvP death into a PvE death: the drop changes from a receiver pile to a public pile, and a god cape is dropped rather than deleted (`death.rs2:87-88` against `death.rs2:118`). Frankendom's tier must come from the recorded attacker, not a live player (sketch).
- Keep count is hard-coded (`death.rs2:57-59`), and the respawn point is a literal (`death.rs2:32`). Both must be zone data for the Frankendom zones.
- Every drop goes through one opcode with a wealth event for permanent items (`InvOps.ts:709`, `783`). That is a server-side ledger line per drop. Frankendom's one-ledger rule needs the same: each death transfer writes one ledger entry, and the kill is server-verified before any transfer.
- The skull is set on the attempt, so a miss skulls (`pvp_melee.rs2:15` before `29`). Ruling 3.
- The retaliation memory is fixed (2 prey, 3 predators). The donor does not say what happens with a fourth attacker; the rule is the memory length only. Not tested.
- Duel: `~player_death` at `duel_arena_finish.rs2:4` calls only the lock-and-animation proc (`death.rs2:1-8`), not the drop queue, and `@player_death_duel` (`death.rs2:12`) is a label jump that replaces the queue body. So a duel loss does not run the keep/drop routine (24-31); the stake moves by `both_moveinv` (`duel_arena_finish.rs2:13`). Read from code, not run-tested; Frankendom's duel should do the same on purpose (stake moves, normal death rules off).
- Staff immunity: both lose-items procs return early for `staffmodlevel > 1` on production maps (`death.rs2:48`, `95`); staff never lose items. Frankendom needs an explicit flag, not a role check.
- Donor defect, wealth log before delete: `BOTH_DROPSLOT` writes the PvP wealth event (`InvOps.ts:708-715`) before it checks that `invDel` completed (717-720), so a failed delete is still logged. Fix: log after the removal succeeds.
- Skull across sessions: `set_pk_skull_logout` saves the remaining time and `set_pk_skull_login` caps it at `pk_skull_duration` (`pk_skull.rs2:43-56`); a logout does not clear the skull. Keep this rule (the sketch has no skull timer).
- Time unit: all timers are in ticks at 600 ms (`World.ts:120`). Frankendom's tick rate is a server setting; the ticks must be converted, not copied.

## Rulings for Dom

1. PvP tier: should a death count as PvP if any player damaged the victim in the idle window, even when that player has logged out? Recommendation: yes (the donor says no, and the outcome changes the drop).
2. Credit reset: should a full heal clear kill credit (donor) or should credit expire after idle time? Recommendation: idle time, 10 ticks by default.
3. Skull on a miss: should an attack that misses still skull the attacker (donor: yes)? Recommendation: yes, because the choice to attack is the PK act.

Reuse tag and weight: Core slice uses the credit table for the first duel loop (row 17, `src/fight/death.ts`) and for many-on-one kill credit (row 18 follows).

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR.
- Wrong path: mage_arena.obj is under data/src/scripts/areas/area_mage_arena/configs/ (confirmed); destroy_death also set in desertrescue.obj:61 (confirmed).
- Duel gap mis-framed: ~player_death only locks and animates; @player_death_duel is a label jump, so the drop/keep routine is probably not reached (confirmed from code).
- Missed: staff early return death.rs2:48/95; BOTH_DROPSLOT logs wealth before checking invDel; pk_skull logout/login procs (all confirmed).

Fixed 2026-10-12: paths, duel paragraph (section 1, header Checked line, section 6), added staff immunity, wealth-log-before-delete and skull logout lines. Sketch unchanged (it omits the duel branch).
