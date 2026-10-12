# rathena-rathena (death-respawn-penalty, cell 2)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/pc.cpp` (`pc_dead` 9771-10147; `pc_lostexp` 8541-8561; `pc_respawn` / `pc_respawn_timer` 9653-9676; `pc_revive_item` 10165-10199), config `conf/battle/exp.conf` and `conf/battle/player.conf`, per-map flags `src/map/npc.cpp` 5467-5490, `src/map/map.cpp` 4852-4870, `doc/mapflags.txt` 135-145 and 318-330 | Licence: GPL-3.0 (`LICENSE`: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; clean-room, shape only) | C++ | symbol `pc_dead`

Checked: Read in full: `pc_dead` 9771-9860 and 9860-9960, 9998-10147 (the penalty block, the nightmare drop and the PvP and respawn tail); `pc_lostexp` 8541-8561; `pc_respawn` and `pc_respawn_timer` 9653-9676; `pc_revive` 10149-10163. Read in part: `pc_dead` 9960-9997 (karma and bone drop), `pc_revive_item` 10165-10199. Read the config comments and values (`exp.conf` 74-98, `player.conf` 216-222), the mapflag doc, and the parser and storage for `pvp_nightmaredrop`. Not read: the callers of `pc_dead` (the damage path), `pc_dropitem` and `pc_candrop` bodies, `MAX_DROP_PER_MAP`'s value, `clif.cpp` 11843 (the client respawn request, read only as a call site), the level-gap `PenaltyDatabase` (`pc.cpp` 522-621; it governs kill XP, not death). Confidence: high on the order inside the penalty block; high that the nightmare drop rolls once per `random` entry and once per matching slot for a named item (read both loops in full); medium on the item-drop amount (`pc_dropitem(sd,i,1)` passes 1; its signature was not read).

## 1. Mechanism

`pc_dead` is one long sequence. The parts that make a death cost something, in the order the code runs them:

1. Super Novice exception: at 99% or more of next-level base exp the player is fully healed and does not die (9777-9790).
2. Links cleared: devotion, stellar marks, united souls, servant sign, shadow form (read, in `pc_dead` before `pc_setdead` at 9878; the loops are not all quoted). Pet intimacy drops unless the map has `noexppenalty` (9841).
3. Death bookkeeping: `pc_setdead` (9878), die counter +1 (9882), killer id stored (9883). Loose AP on death if `loose_ap_on_death` (player.conf 329; applied at 9885).
4. Killer side: `pk_mode` manner loss for the killer (9946-9951). The karma system is inside `#if 0` (9955-) and is disabled.
5. Skull drop when `bone_drop` is 2, or 1 on a PvP map (9981).
6. Exp and zeny tax block (9999-10057). Gate: `death_penalty_type` is non-zero, the class is not novice, the status does not block it (`cant.deathpenalty`), the map does not have `noexppenalty`, and it is not GvG2 (10000-10002). Note: the gate has no killer check, so it applies to every death.
   - Rates: VIP players use `vip_exp_penalty_base` / `vip_exp_penalty_job` (10008-10011); others use `death_penalty_base` / `death_penalty_job` (10013-10014). Rates are per 10000 (exp.conf 82: "Each 100 is 1% of their exp").
   - Base tax: skipped when the player is at max base level, unless `death_penalty_maxlv` bit 1 is set (10018). Type 1 = rate x next-level exp (10020); type 2 = rate x total base exp (10021).
   - PK doubling: if `pk_mode` is on and the killer is a player, the base tax is doubled (10024-10025). The job tax is doubled the same way (10038).
   - Cap: the base tax is capped at current base exp (10026). The job tax is capped at current job exp (10040).
   - Job tax: same shape, cast to `uint32` (10034-10035).
   - Insurance: if either tax is due, the code searches for the New Insurance item. If one is present and one unit is deleted (10047-10048), no exp is lost. Otherwise `pc_lostexp` subtracts both amounts, each clamped to current exp (10049; 8546).
   - Zeny tax: rate x zeny (10053), gated only by the map flag `nozenypenalty` (10052). Default is off (exp.conf 90).
7. Take-one nightmare drop (10059-10112). If the map has `pvp_nightmaredrop` entries, the block runs whether or not the map is PvP and whether or not `pk_mode` is on (comment at 10059). For each entry (the list is per map; capped at `MAX_DROP_PER_MAP`, map.cpp 4856):
   - `random` (branch starts 10066): build the list of eligible slots (not `pc_candrop`-blocked, matching the inventory / equip / all filter, 10074). If the list is non-empty, roll once against the rate (10086). On success pick one slot at random, unequip if needed, and drop one unit to the ground (10091).
   - a named item id (branch starts 10095): scan the slots in order; for each slot that matches (id, filter, `pc_candrop`), roll again (10099); the first success drops one unit and stops the scan.
   So each entry drops at most one unit per death. The named branch rolls once per matching slot (defect, see section 6).
8. PvP points (only when `pk_mode` is off and the map is PvP and not `nocalcrank`, 10114-10117): victim -5, killer +1 (10115). If the victim's points go below 0 (10122), a respawn timer is set for 1000 ms (10123).
9. GvG2 map: respawn after 1000 ms (10128-10129). Battleground with a cemetery: respawn after 1000 ms (10137).
10. Otherwise there is no automatic respawn: the player stays a ghost until the client asks to respawn (`pc_respawn` is called from clif.cpp 11843; the request handler was not read).

Respawn and revive:
- `pc_respawn` (9653) stands the player up and warps to the save point (CLR_OUTSIGHT). `pc_respawn_timer` (9667) resets `pvp_point` to 0 (9671) and calls `pc_respawn`.
- `pc_revive_item` (10165): refused while dead and a respawn timer is pending (10168), and under Hell Power (10171). Token of Siegfried (`IG_TOKEN_OF_SIEGFRIED`, 10174) revives at 100% HP and SP (10175). Otherwise the status Light of Regene (SC_LIGHT_OF_REGENE) revives at its own HP value and 0 SP (10179 and the default at 10175).

Numbers (defaults): `death_penalty_type` 1 (exp.conf 80); `death_penalty_base` 100 = 1% of next-level base exp (83); `death_penalty_job` 100 = 1% of next-level job exp (86); `zeny_penalty` 0 (90); `death_penalty_maxlv` 0, so max-level players never lose exp (96); VIP base and job 100 each and VIP zeny 0 (player.conf 216, 217, 222).

Tick and timing: the respawn is a one-shot timer (`add_timer`, 1000 ms). Nothing ticks the penalty; the penalty is computed once at death.

## 2. Key functions

- `pc_dead`: `/mnt/frankendom-donors/rathena-rathena/src/map/pc.cpp` 9771-10147. The whole death sequence.
- Exp and zeny tax block: `/mnt/frankendom-donors/rathena-rathena/src/map/pc.cpp` 9999-10057.
- Take-one nightmare drop: `/mnt/frankendom-donors/rathena-rathena/src/map/pc.cpp` 10059-10112 (random branch from 10066; named branch from 10095).
- `pc_lostexp`: `/mnt/frankendom-donors/rathena-rathena/src/map/pc.cpp` 8541-8561.
- `pc_respawn` / `pc_respawn_timer`: `/mnt/frankendom-donors/rathena-rathena/src/map/pc.cpp` 9653-9676.
- `pc_revive_item`: `/mnt/frankendom-donors/rathena-rathena/src/map/pc.cpp` 10165-10199 (partly read).
- Per-map drop entry store and parse: `/mnt/frankendom-donors/rathena-rathena/src/map/map.cpp` 4852-4870; `/mnt/frankendom-donors/rathena-rathena/src/map/npc.cpp` 5467-5490.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Penalty = rate x a reference amount, rate in 1/10000 | Rate 100 = 1% (exp.conf 82-83); reference = next-level exp (type 1) or total exp (type 2) (10020-10021) |
| Cap a loss at what the player has | `u64min` on base (10026), on job (10040), and in `pc_lostexp` (8546) |
| Double the penalty when a player is the killer in pk mode | x2 (10025, 10038) |
| A consumable skips the whole penalty | New Insurance: one unit deleted, no exp lost (10047-10049) |
| Take-one: one roll per configured entry, at most one item | Rate per 10000 (10086, 10099); `random` vs named id; filter inventory / equip / all |
| Respawn in one second for special maps | 1000 ms (10123, 10129, 10137) |
| Max-level exemption | `death_penalty_maxlv` bits (10018) |
| Zone switches | Map flags `noexppenalty`, `nozenypenalty`, `nopenalty` (doc/mapflags.txt 135-139); `pvp_nightmaredrop` entry per map (doc 318-327) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for the take-one drop (each entry rolls once and removes at most one item) and for the exp tax (no-penalty and max-level exits, then the PK doubling, then the cap, then the insurance skip). It differs from the donor in four places, all deliberate: (a) the named-item roll is once per entry, not once per matching slot (donor defect, fixed); (b) the zeny tax is gated on the killer being a player, as the donor's own config comment says (donor gate has no killer check; fix); (c) max-level exemption is one flag for base and job (the donor has two bits, `death_penalty_maxlv` 1 and 2); (d) the item-eligibility check (`pc_candrop`) and the ground drop are reduced to a pool filter and a removal. It omits the link clearing, pet intimacy, skull drop, karma, PvP points, GvG and battleground respawns, revive items, and the job tax's uint32 cast (the sketch uses numbers throughout).

```ts
// Licence: GPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type RNG = () => number; // returns a value in [0, 1)

interface Item { id: number; equipped: boolean; }
type Where = "inventory" | "equip" | "all";
interface DropEntry { itemId: number | "random"; where: Where; ratePer10k: number; }

// Take-one: each entry rolls ONCE and removes at most ONE eligible item.
// Fix: the donor rolls once per matching slot for a named item (a 50% entry on two matching slots drops 75%).
function takeOneOnDeath(inv: Item[], entries: DropEntry[], rng: RNG): Item[] {
  const dropped: Item[] = [];
  for (const e of entries) {
    const pool = inv.filter((it) => matches(it, e));
    if (pool.length === 0) continue;
    if (rng() * 10000 >= e.ratePer10k) continue;      // one roll for this entry
    const pick = pool[Math.floor(rng() * pool.length)];
    inv.splice(inv.indexOf(pick), 1);                 // the item leaves inventory and becomes a world drop
    dropped.push(pick);
  }
  return dropped;
}

function matches(it: Item, e: DropEntry): boolean {
  const whereOk = e.where === "all" || (e.where === "equip" ? it.equipped : !it.equipped);
  const idOk = e.itemId === "random" || it.id === e.itemId;
  return whereOk && idOk;
}

interface ExpState { baseExp: number; jobExp: number; nextBaseExp: number; nextJobExp: number; }
interface ExpRules { type: 1 | 2; basePer10k: number; jobPer10k: number; }
interface DeathCtx { killerIsPlayer: boolean; pkMode: boolean; isMaxLevel: boolean; hasNoExpPenalty: boolean; }

// Exp tax: percent of next-level exp (type 1) or of total exp (type 2). Doubled when a player killed in pk mode.
// Capped at current exp. A spent insurance item skips the whole tax.
function expTax(s: ExpState, r: ExpRules, ctx: DeathCtx, hasInsurance: boolean): { lostBase: number; lostJob: number; insuranceUsed: boolean } {
  if (ctx.hasNoExpPenalty || ctx.isMaxLevel) return { lostBase: 0, lostJob: 0, insuranceUsed: false };
  const mult = ctx.pkMode && ctx.killerIsPlayer ? 2 : 1;
  const baseRaw = (r.type === 1 ? s.nextBaseExp : s.baseExp) * (r.basePer10k / 10000) * mult;
  const jobRaw = (r.type === 1 ? s.nextJobExp : s.jobExp) * (r.jobPer10k / 10000) * mult;
  const lostBase = Math.min(s.baseExp, Math.floor(baseRaw));
  const lostJob = Math.min(s.jobExp, Math.floor(jobRaw));
  if (lostBase === 0 && lostJob === 0) return { lostBase: 0, lostJob: 0, insuranceUsed: false };
  if (hasInsurance) return { lostBase: 0, lostJob: 0, insuranceUsed: true };
  return { lostBase, lostJob, insuranceUsed: false };
}

// Zeny tax: fix — applied only when a player killed (the donor's own config comment says so; the donor gate has no killer check).
function zenyTax(zeny: number, ratePer10k: number, ctx: DeathCtx): number {
  if (!ctx.killerIsPlayer || ctx.hasNoExpPenalty || ratePer10k <= 0) return 0;
  return Math.floor(zeny * (ratePer10k / 10000));
}

// Smoke check: a 50% entry on two matching slots, 2000 rolls, should land near 50%, not 75%.
const rng: RNG = () => Math.random();
let hits = 0;
for (let i = 0; i < 2000; i++) {
  const inv: Item[] = [{ id: 7, equipped: false }, { id: 7, equipped: false }];
  if (takeOneOnDeath(inv, [{ itemId: 7, where: "inventory", ratePer10k: 5000 }], rng).length > 0) hits++;
}
void hits;
void expTax;
void zenyTax;
export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (copy at /tmp/rathena-take-one.ts): exit 0.

## 5. Lands in

- TARGET `src/fight/death.ts` (new module: the death step, take-one drop, exp tax, insurance skip). Parity-checklist row 17 (death/respawn). The per-zone drop entry is zone data; the penalty formula is engine code.
- Take-one drop touches loot ownership: the donor drops the item on the ground with no protection read. Row 18 (loot roll and XP award) owns the ground drop; cite it only when the ground item is built.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
- Brief rule served: 17 (death/respawn); one ledger (the removal and the XP change are one write); server-verified (the donor's penalty runs in the map server, not the client).

Best transferable idea: a death costs at most one item (each configured entry rolls once and removes at most one eligible item), and an XP tax that is a percent of next-level XP, capped at current XP, is skipped when a consumable insurance item is spent.
Decision (proposed): adapt — keep the take-one entries and the insurance skip, with the roll fixed to once per entry, the rates as zone data, and the zeny tax left out until Dom rules on currency.
Acceptance: in a PvP zone with one take-one entry at 50% on a non-stackable item held in two inventory slots, 2000 simulated deaths lose that item in about 50% of deaths (not 75%), never more than one item per entry per death, and no penalty runs in the Pit.

## 6. Gaps and risks

- One ledger: the removal, the ground item, and any XP change must be one write. The donor drops the item to the ground (`pc_dropitem`, 10091; body not read), so the item still exists; anyone can pick it up unless protected. Frankendom needs an owner and a timer on that item (not in the donor, read).
- Server-verified: the donor's penalty runs in the map server, good. The client receives the result; the donor's exact message path was not read.
- Zones as data: this is the closest donor pattern. Map flags (`noexppenalty`, `nozenypenalty`) and the `pvp_nightmaredrop` row (`<id>,<type>,<rate>`, doc 318-327) are per-map. The battle config keys (`death_penalty_*`) are global, so they should be zone data in Frankendom.
- Pit as client: the Pit is GvG2-like (the donor exempts GvG2 maps from the tax at 10002). Mirror that: the Pit runs no penalty.
- Many-on-one: `pc_dead` takes one killer (`src`). With MAX_ATTACKERS = 3, the donor's kill attribution (last hit, not read) decides which killer gets PK doubling and PvP points. Frankendom must define the killer for a multi-attacker death.
- Stacks: `pc_dropitem(sd,i,1)` drops one unit of a stack. Take-one on a stack removes one potion, not the stack. Confirm that is the intent.
- The level-gap XP penalty (`PenaltyDatabase`, `pc.cpp` 522-621; used by `mob.cpp` 3212 and `party.cpp` 1279) is a kill-XP rule, not a death rule. It belongs to the progression topic.
- Defects, each with a fix:
  - Named-item take-one rolls once per matching slot (10099). Two slots at 50% give 75%. fix: roll once per entry, then pick among eligible slots, as the random branch does (10086).
  - Zeny tax is not gated on a killer (9999-10001 and 10052), but the config comment says "When a player dies (to another player)" (exp.conf 88). fix: gate on a player killer, or change the comment. The sketch gates it; Dom decides (ruling 2).
  - Job-exp tax is cast to `uint32` (10034-10035) while the base tax uses `t_exp` (a 64-bit type). fix: keep 64-bit; I did not check the job exp table maximum, so whether it can truncate is not verified.
- Not read: `pc_candrop`'s rules; the revive items' effects beyond the summary; what happens after `pc_dead` returns (the caller's clif and status work).

As-data shape:
- Penalty rates are battle config keys (`conf/battle/exp.conf`: `death_penalty_type`, `death_penalty_base`, `death_penalty_job`, `zeny_penalty`, `death_penalty_maxlv`; `conf/battle/player.conf`: `vip_exp_penalty_base`, `vip_exp_penalty_job`, `vip_zeny_penalty`). Not per zone in the donor.
- Per-map data is set from NPC script headers or map flags (doc/mapflags.txt): `pvp_nightmaredrop <id>,<type>,<rate>` where `<id>` is an item id or `random`, `<type>` is `inventory`, `equip` or `all`, `<rate>` is per 10000; flags `noexppenalty`, `nozenypenalty`, `nopenalty`.
- Row fields (name: type) if this becomes a zone row: `zone_id: string`; `no_exp_penalty: boolean`; `no_zeny_penalty: boolean`; `take_one: {item: number | "random", where: "inventory" | "equip" | "all", rate_per_10k: number}[]` (cap at the donor's per-map limit, not read). Engine rules (not in the row): the percent-of-next-level formula, the PK doubling, the cap, the insurance skip.
- A new X is one row: yes for a new zone's take-one entry or a no-penalty flag; no for a new penalty formula (code in `pc_dead`).

Provenance: repo `rathena-rathena`; files above; licence GPL-3.0 (LICENSE), so shape only.

What they patched later: no history available (no `.git` directory in the donor). In-code markers: `// changed penalty options, added death by player if pk_mode [Valaris]` (9998); `// Moved this outside so it works when PVP isn't enabled and during pk mode [Ancyker]` (10059), which moved the nightmare drop out of the PvP-only path; `#if 0` / `// PK/Karma system code (not enabled yet) [celest]` (9955-9956), the karma code left disabled; `// Activate Steel body if a super novice dies at 99+% exp [celest]` (9777).

Rulings for Dom:
1. Should a death in an open PvP zone allow one take-one drop, at what rate, and never in the Pit? Recommendation: yes in PvP zones only, one entry, rate as zone data, never in the Pit.
2. Should a death cost XP at all, and should zeny ever be taxed? Recommendation: no XP tax in this slice (progression pacing is a separate topic); no zeny tax until currency rules exist.
3. If an XP tax is kept, should an insurance item skip it? Recommendation: yes, and the insurance item is one item row in the catalogue.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 17 (death/respawn); take-one; one ledger; zones as data.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: CLEAN
- No material errors. Note: MAX_DROP_PER_MAP is 48 (map.hpp:79), stated in the note as not read.
