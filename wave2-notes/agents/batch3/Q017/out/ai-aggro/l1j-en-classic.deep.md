# l1j-en-classic (ai-aggro, cell 2)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1HateList.java` (with `Instance/L1NpcInstance.java`, `Instance/L1MonsterInstance.java`, `L1Attack.java`) | Licence: GPL-2.0-or-later (`COPYING` is GPL version 2; each source header says "version 2, or (at your option) any later version") | Java | symbols `L1HateList`, `L1NpcInstance.setHate`, `L1NpcInstance.checkTarget`, `L1MonsterInstance.searchTarget`, `L1NpcInstance.serchLink`

Checked: Read in full: `L1HateList.java` (173 lines). Read in the ranges that matter: `L1NpcInstance.java` 236-312, 339-368, 370-395, 746-767, 820-830, 1300-1335, 1505-1531, 2066-2076; `L1MonsterInstance.java` 100-230 and 240-305; `L1Attack.java` 1442-1463. Callers were checked with `grep -rn` over `src` for `setHate`, `getMaxHateCharacter`, `checkTarget`, `searchTarget`, `removeInvalidCharacter`, `getTotalHate`, `getPartyHate`. Not read: the chase and movement code that runs after a target is set (the rest of `AIProcess` after line 303, and the move functions), the ordering returned by `L1World.getVisiblePlayer`, and the loot ledger that `_dropHateList` feeds. Confidence: high for the hate table and target choice; moderate for the AI loop timing, which I read only at its start and sleep lines.

## 1. Mechanism

Each NPC keeps one hate table: a map from attacker to accumulated hate (`L1NpcInstance` 824). Whenever hate changes, the target is set to the entry with the most hate, and `checkTarget` may move it on. Hate comes from damage, and from aggro-on-sight and pack links, which seed an entry with 0.

Hit path (monster). `L1Attack.commitNpc` calls `_targetNpc.receiveDamage(_pc, _damage)` (`L1Attack.java` 1459). `L1MonsterInstance.receiveDamage` (282-304): if the monster is alive and not sunk or flying (283-287) and `damage >= 0` (288), it calls `setHate(attacker, damage)` (292). Then `onNpcAI()` starts the AI if it is idle (299). If the attacker is a player, `serchLink` runs for the monster's family (303). The same `setHate` path is used for magic-point damage (`ReceiveManaDamage`, 262-266).

`setHate` (`L1NpcInstance` 355-368), in order:
(a) ignore a null attacker or the monster itself (356);
(b) if this is the first non-zero hit on this NPC (357), add `getMaxHp() / 10` to the hate and mark the first attack done (359-360). The flag is set here and not cleared anywhere in `src` (grep). It applies once per NPC object. Zero-hate seeds do not use it (357 requires `hate != 0`);
(c) add the hate to `_hateList` (363) and also to `_dropHateList` (364, loot ledger, not read);
(d) set `_target` to the max-hate character (365);
(e) run `checkTarget` (366).

`L1HateList.add` (45-54) adds the hate to any existing entry, and creates one otherwise. `getMaxHateCharacter` (76-87) scans the map and keeps the first entry that is strictly larger than the best so far. The scan starts at `Integer.MIN_VALUE` (78) and compares with `<` (81). Ties therefore go to whichever entry the `HashMap` iterates first, which is not insertion order and is not a defined order.

`checkTarget` (342-353) runs every AI pass and after each `setHate`. The target is invalid if it is null, on another map, at 0 HP or below, dead, or (invisible, and not `is_agrocoi`, and not in the hate list) (343-344). If the target is invalid, `targetClear` runs (345-347). `targetClear` removes the target from the hate list (`L1NpcInstance` 746-752, line 750), so each recursion removes one entry, and the recursion ends. If the list is not empty, the target is set to the max-hate character and `checkTarget` runs again (348-351). The invisibility clause only matters when the target is missing from the hate list. As written, that is rare, because a target is normally in the list (reading only; not run).

AI loop (`NpcAIThreadImpl.run`, `L1NpcInstance` 253-274). While the NPC is alive, has HP, is not hidden, and has AI running (256-257): while paralysed or asleep, sleep 200 ms (259-265); run `AIProcess()` (267); then sleep `getSleepTime()` (270-274). `AIProcess` (293-) sets the sleep to 300 ms (294), runs `checkTarget` (296), and if there is no target and no master, runs `searchTarget` (297-299). If there is still no target, it looks at ground items; a ground-item target that is no longer on the ground is dropped and sets a 1000 ms sleep (319-321). Time is wall-clock sleep: each NPC's loop is a runnable on a shared pool (`start`, 244-250, `GeneralThreadPool`); this is not a fixed-step simulation.

Aggro on sight (`L1MonsterInstance.searchTarget`, 114-204). Exit if the NPC has no aggro flag at all (120-122). Loop over `getVisiblePlayer` in the order the world returns (ordering not read) and skip dead, GM, invisible-GM, ghost and private-shop players (127-130). On maps 88, 98, 92, 91 and 95, the first visible player who is not invisible (or who the monster can see through) is targeted at once (132-138). Karma filters (149-152, 154-157) apply next. A non-aggro monster targets a player whose lawful value is below -1000 (159-166). For the rest, a player with skill effect 67 is not taken by the plain agro flag; only "agro social" monsters target on that check (169-173). The plain agro flag targets a player without that effect (174-177). The appearance-group checks (178-197) can target a visible player whatever the effect. On a match, `_hateList.add(targetPlayer, 0)` and `_target = targetPlayer` (200-203). Hate 0 means the first real hit later gets the first-attack bonus.

Pack link (`serchLink`, `L1NpcInstance` 373-395; `setLink`, `L1MonsterInstance` 207-212). When a player hits a monster, `serchLink` walks the NPCs the player currently sees. For each one with `agrofamily > 0`: if `agrofamily == 1`, it is linked only when its family equals the hit monster's family (379-381); otherwise (2 or more) it is linked (383-385). Separately, any NPC in the same non-zero mob group as the hit monster is linked (389-391). `setLink` seeds the linked monster with hate 0 and runs `checkTarget`, but only when its hate list is empty (208-210). So a pack member who is already fighting keeps its target.

Dead and gone entries. `L1HateList.removeInvalidCharacter` (89-100) would purge dead, unknown or not-visible entries, but `grep -rn` found no caller in `src`. Entries for players who left stay in the table until one of them becomes the top target and `checkTarget` drops it. The totals and party helpers (`getTotalHate`, `getTotalLawfulHate`, `getPartyHate`, `getPartyLawfulHate`, 102-156) also have no caller in `src` (grep).

## 2. Key functions

- `L1HateList.add` and `getMaxHateCharacter`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1HateList.java` 45-54 and 76-87. Accumulate, then pick the strict max.
- `L1NpcInstance.setHate`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1NpcInstance.java` 355-368. First-attack bonus, then add, then re-target.
- `L1NpcInstance.checkTarget`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1NpcInstance.java` 342-353, with `targetClear` at 746-752. Validate, drop, re-pick.
- `L1NpcInstance.AIProcess` and the thread run loop: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1NpcInstance.java` 242-291 and 293-299.
- `L1MonsterInstance.receiveDamage`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1MonsterInstance.java` 282-304.
- `L1MonsterInstance.searchTarget`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1MonsterInstance.java` 114-204.
- `L1NpcInstance.serchLink` and `L1MonsterInstance.setLink`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1NpcInstance.java` 373-395; `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1MonsterInstance.java` 207-212.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hate table: accumulate per attacker, target = strict max | None (the sum and the max are the rule) |
| First hit adds a share of max HP, once per NPC | Divisor 10, i.e. `maxHp / 10` (theirs, `L1NpcInstance.java` 359; the flag is at 357) |
| Seed hate 0 on sight or on a pack link, without spending the first-hit bonus | 0 (theirs, `L1MonsterInstance.java` 201; `L1NpcInstance.java` 357 requires `hate != 0`) |
| Validate the top; drop the invalid one and re-pick | Invalid = null, other map, HP <= 0, dead, or invisible (theirs, 343-344) |
| Pack link by family: 1 = same family only, more than 1 = any; same non-zero group always | Family and group ids come from templates; the rule is theirs (`L1NpcInstance.java` 379, 389) |
| Auto-aggro on certain maps | Map ids 88, 98, 92, 91, 95 (theirs, `L1MonsterInstance.java` 132-133) |
| Lawful threshold for non-aggro monsters | -1000 (theirs, `L1MonsterInstance.java` 161) |
| AI loop cadence | 300 ms default (theirs, `L1NpcInstance.java` 294); 200 ms while paralysed or asleep (261); 1000 ms after a stale ground-item target (321) |

## 4. TypeScript sketch

simplified: the sketch keeps the accumulate, the first-hit bonus (once, skipped for zero seeds), the top-of-table pick with validate-drop-repick, and the pack link rule with the "only if the hate list is empty" check. It differs from the donor in four places: ties go to the lower id (the donor's tie-break is `HashMap` iteration order, which is not defined); `pickTarget` removes an invalid top as it finds it, where the donor removes it through `targetClear`; the pack list is an input (the donor walks the attacker's visible NPCs); and it omits the aggro-on-sight rules, the map and karma filters, the loot ledger, the invisibility clause, the AI thread and its sleeps, and the item path. The sketch does not add a cap on the table size, because the donor has none.

```ts
// Licence: GPL-2.0-or-later (donor header: "version 2, or (at your option) any later version"). Clean-room: shape only.

export interface HateTable {
  hate: Map<string, number>;   // attacker id -> accumulated hate
  firstHitDone: boolean;       // the first-hit bonus is taken once per NPC
}

export interface Live {        // what the engine knows about a candidate right now
  alive: boolean;
  sameMap: boolean;
}

// Hate from one hit. A zero amount seeds the entry (aggro on sight) without using the first-hit bonus.
export function addHate(t: HateTable, selfId: string, attackerId: string, amount: number, maxHp: number, firstHitDivisor: number): void {
  if (attackerId === selfId || amount < 0) return;
  let add = amount;
  if (!t.firstHitDone && amount !== 0) {
    add += Math.trunc(maxHp / firstHitDivisor);   // donor: maxHp / 10 (integer division)
    t.firstHitDone = true;
  }
  t.hate.set(attackerId, (t.hate.get(attackerId) ?? 0) + add);
}

// Top attacker. Ties go to the lower id, so the choice is the same on every server run.
// Invalid tops are removed as they are found, then the next top is tried.
export function pickTarget(t: HateTable, live: (id: string) => Live | undefined): string | null {
  for (;;) {
    let best: string | null = null;
    let bestHate = -Infinity;
    for (const id of [...t.hate.keys()].sort()) {
      const h = t.hate.get(id) ?? 0;
      if (h > bestHate) { best = id; bestHate = h; }
    }
    if (best === null) return null;
    const s = live(best);
    if (s && s.alive && s.sameMap) return best;
    t.hate.delete(best);
  }
}

export interface Pack { id: string; agroFamily: number; family: number; groupId: number; hateEmpty: boolean; }

// Who gets pulled when one member is hit. agroFamily 1 = same family only; > 1 = any family; same non-zero group always.
export function linkTargets(pack: Pack[], family: number, groupId: number): string[] {
  return pack
    .filter(m => (m.agroFamily > 0 && (m.agroFamily !== 1 || m.family === family)) || (groupId !== 0 && m.groupId === groupId))
    .filter(m => m.hateEmpty)   // donor setLink: only an empty table takes the seed
    .map(m => m.id);
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0.

## 5. Lands in

- TARGET `src/fight/aggro.ts` (proposed new module; the Frankendom repo was not read, so this name is a proposal). Parity-checklist row 4 (fight loop: aggro, chase, leash). The hate table and target choice are many-on-one logic, so they belong in the engine, not in the client.
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only, shape not code)
- Brief rule served: one engine (hate list and target choice live in `src/fight`); MAX_ATTACKERS = 3 (to be added; the donor has no cap)

## 6. Gaps and risks

- The donor's tie-break is `HashMap` iteration order (`L1HateList.java` 76-87). Equal hate picks an arbitrary target that can differ between runs. Frankendom's server must break ties on a stable key.
- No cap on attackers: the table grows with every attacker. MAX_ATTACKERS = 3 is a Frankendom ruling; the engine must enforce it at the point of hate entry, not after.
- Stale entries: `removeInvalidCharacter` has no caller (grep), so players who leave stay in the table until chosen. Frankendom needs a purge on leave or on a timer, tied to one ledger.
- The first-hit bonus (`maxHp / 10`) is set per NPC object and never cleared in `src`. Whether a respawn creates a new object was not read. Frankendom must define "first" per spawn (row 17 respawn) and test it.
- Server-verified kills: the donor's `checkTarget` reads live state (`isDead`, HP) from the same process that applies damage. Frankendom's validity check must read the server's state at the tick, and must not trust a client's report of a target.
- The AI runs one thread per NPC with wall-clock sleeps (`L1NpcInstance` 253-274). Frankendom's server tick is a fixed step with a per-tick NPC budget (row 18 sub-line "server tick: fixed step, input intake, per-tick NPC budget"). Do not copy the per-NPC thread.
- Pack links use the attacker's visible set (`serchLink` 373-395). In Frankendom the pack set is zone data (encounter groups), not what one player can see.
- Aggro on sight was reported (rules at 114-204) but its visible-player order was not read, so "first match" is not a defined nearest-target rule. Do not copy it as one.
- Licence: GPL-2.0-or-later. Clean-room only. The sketch is written from the mechanism, not translated.

Best transferable idea: Keep one hate table per NPC that accumulates damage per attacker, pick the strict maximum with a stable tie-break, and on every pick validate the top and drop it if it is dead, off-map or gone, before taking the next one.
Decision (proposed): adapt — the accumulate, max-pick and validate-drop loop is the right shape for many-on-one aggro under MAX_ATTACKERS = 3; we take the shape, add a deterministic tie-break and a cap at the point of entry, purge stale entries on leave, and do not take the per-NPC thread or the sight-order target.
Acceptance: server test — attacker A hits for 30 first on an NPC with maxHp 200 (hate 50), attacker B hits for 40 (hate 40), so A is the target; when A is dead the next pick is B with no exception; a seed of hate 0 does not consume the first-hit bonus; equal hate picks the lower id on every run.
