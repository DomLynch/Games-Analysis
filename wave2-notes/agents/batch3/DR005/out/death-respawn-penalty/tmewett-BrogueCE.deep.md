# tmewett-BrogueCE (death-respawn-penalty, cell 3)

Donor: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` (`resurrectAlly`, 2889-2937), with `src/brogue/RogueMain.c` (`removeDeadMonstersFromList`, 981-1012; `gameOver`, 1063-1148), `src/brogue/Architect.c` (`spawnDungeonFeature`, 3370-3372), `src/brogue/Globals.c` (feature rows 538, 798-799), `src/variants/GlobalsBrogue.c` (blueprint 227-231), `src/brogue/Rogue.h` (flags 2163-2167) | Licence: GNU AFFERO GENERAL PUBLIC LICENSE Version 3 (LICENSE.txt header, read; copyleft, clean-room, shape only) | C | symbols `resurrectAlly`, `removeDeadMonstersFromList`, `gameOver`

Checked: Read in full: `resurrectAlly` (Monsters.c 2889-2937), `removeDeadMonstersFromList` and `removeDeadMonsters` (RogueMain.c 981-1012), `gameOver` body to 1100 and the tail 1134-1148, `spawnDungeonFeature` head (Architect.c 3360-3378), the altar and feature rows (Globals.c 538, 796-799), the blueprint (GlobalsBrogue.c 225-232), the flag comments (Rogue.h 2160-2170). Read in part: Monsters.c 150-160 and 560-571 (the two places that set and clear `MB_WEAPON_AUTO_ID`; the function names were not read); Combat.c 1180-1192 and 1700-1710. Grep only (not read): the other 11 `gameOver` call sites found by grep (Items.c:4423, Combat.c:1585, Time.c:187, 329, 526, 1024, 2280, 2332, 2343, IO.c:2642, Monsters.c:2772); `getQualifyingPathLocNear`, `heal`, `killCreature`; the monster catalog rows (`monsterCatalog`); the floor-trigger machine code that fires `DF_MACHINE_FLOOR_TRIGGER_REPEATING`; the Rapid and Bullet variants' depth ranges (their line 231 has the same altar feature). Not read: what `totalPowerCount` counts; `companionFeatRequiredXP` use (Rogue.h:2422). Camera: not a camera cell (camera_scope n/a). Confidence: high on the held-pool rule, the strongest-first raise and the one-use altar; medium on the altar's trigger wiring (inferred from the feature names and blueprint line 231); high that a player's death is final in normal play (the only return to play is the D_IMMORTAL debug branch, 1134-1142).

Best transferable idea: Hold a dead companion in a pool instead of freeing it, and let a zone shrine raise the strongest held companion at full health, so a companion's death costs a wait, not the companion.
Decision (proposed): adapt — keep the held pool and the strongest-first raise at full heal; make the shrine's charges zone data and show a message when nothing is held (the donor is silent); reject the donor's permadeath for the player, since Frankendom respawns at a point (row 17).
Acceptance: A companion dies in a world-zone fight: it leaves the field and is held for its owner. The owner steps on the shrine trigger: the strongest held companion returns at full HP beside the shrine and the shrine loses one charge. With no charges left, the shrine refuses and says so. A monster summoned by an ally that dies is freed and never listed as held.

## 1. Mechanism

- Death sweep: `removeDeadMonsters` runs over the live list and the dormant list (RogueMain.c:1009-1012). Each creature flagged as died is removed from its list (989). If it is the player's ally (`leader == &player`, 990), it does not carry the no-resurrect flag (991), it is not inanimate unless it is an enter-summons kind (992-993), it carries the auto-ID flag (994), and it did not die by administrative removal (995), then its died flag is cleared and it is prepended to `purgatory` (998-999). Anything else is freed.
- The purgatory is a separate creature list (`GlobalsBase.c:48`). It is only freed at shutdown (`RogueMain.c:1039`). Nothing expires it.
- Raise trigger: `spawnDungeonFeature` checks the feature flag first. If `DFF_RESURRECT_ALLY` is set, it calls `resurrectAlly` at the feature's cell, and if that returns false it returns false and places nothing (Architect.c:3370-3372). So a shrine feature with no held companion does nothing and prints no message: the message is printed only after this check (Architect.c:3375-3377).
- `resurrectAlly` (Monsters.c 2889-2937): walk the purgatory and keep the creature with the highest `totalPowerCount`; on a tie, the higher `monsterID` (2895-2901). If none, return false (2935). Otherwise remove it from purgatory (2908), prepend it to the live list (2909), put it on a free cell near the feature location (2911), set the HAS_MONSTER cell flag (2914), clear the dying, administrative and died flags (2917), clear burning unless fiery and clear discord (2918-2923), and heal it to 100% (2924). An enter-summons kind (phylactery, phoenix egg) has its catalogue record reset (2927-2931). Return true.
- The shrine: the altar tile (Globals.c:538) promotes through `DF_ALTAR_RESURRECT`. That feature (Globals.c:798) turns the tile into `RESURRECTION_ALTAR_INERT` with `DFF_RESURRECT_ALLY` and prints "An old friend emerges from a bloom of sacred light!". So each altar raises at most once, then stays inert. The altar is wired to a repeating floor trigger (Globals.c:799; GlobalsBrogue.c:231). The trigger code was not read.
- Blueprint: "Resurrection altar" is a reward room at depth 13 to the amulet level, room size 10-30 (GlobalsBrogue.c:227-228). The altar is placed far from the origin, wired to the trigger, with statues in the walls (229-231).
- Player death: `gameOver` marks the player dying and sets `gameInProgress = false` (1063-1079), prints "You die..." (1098), and saves the high score once (1148). The only return to play is the debug `D_IMMORTAL` branch (1134-1142). So a player's death is the end of the run. Melee death calls it at Combat.c:1188-1189.
- No XP or durability is lost on death: `grep -i durabilit` finds nothing; the only XP field is `companionFeatRequiredXP` (Rogue.h:2422), which is not traced into the death path.
- Tick: no tick loop was read. The purgatory and the raise run synchronously inside the death sweep and the feature spawn.

## 2. Key functions

- `resurrectAlly`: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Monsters.c` 2889-2937.
- Purgatory sweep: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/RogueMain.c` 981-1012.
- Feature gate: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Architect.c` 3370-3372.
- Altar and feature rows: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Globals.c` 538, 798-799; blueprint `/mnt/frankendom-donors/tmewett-BrogueCE/src/variants/GlobalsBrogue.c` 227-231.
- Eligibility flags: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/Rogue.h` 2163 (auto-ID), 2165 (administrative), 2167 (no-resurrect).
- Death: `/mnt/frankendom-donors/tmewett-BrogueCE/src/brogue/RogueMain.c` 1063-1148.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Hold the dead instead of freeing, if eligible | Eligibility: player leader, not no-resurrect, not inanimate (unless enter-summons), auto-ID flag, not administrative (`RogueMain.c:990-995`) |
| Raise the strongest held first | Key: `totalPowerCount`, tie by `monsterID` (`Monsters.c:2898-2900`) |
| Revive at full health | `heal(monToRaise, 100, true)` (`Monsters.c:2924`) |
| One use per shrine | Tile promotes to an inert tile after one raise (`Globals.c:798`) |
| No raise, no effect | Feature returns false, nothing printed (`Architect.c:3370-3372`) |
| Pool never expires | None: freed only at shutdown (`RogueMain.c:1039`) |
| Reward room gate | Depth 13 to amulet level; room size 10-30 (`GlobalsBrogue.c:228`) |
| Player death | Final: `gameOver` ends the run (`RogueMain.c:1079`, `1148`) |

## 4. TypeScript sketch

simplified: the sketch keeps the held pool, the eligibility rule (ally-summoned monsters, flagged no-resurrect at Monsters.c:738, and administrative removals are freed), the strongest-first pick (power, then kind), the full heal, and the rule that an empty pick leaves the shrine waiting. It changes one thing on purpose: the shrine's charges are a count (donor: one use per altar, adapted to zone data). It omits the placement on a free cell near the shrine (`getQualifyingPathLocNear`), the burning and discord clears, the enter-summons reset, the inert tile and its message, the trigger wiring, the blueprint depth gate, and the player-death path. Typechecked on the VPS (`npx -p typescript tsc --noEmit --strict --target es2020`).

```ts
// Licence: AGPL-3.0 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

export interface Companion {
  id: string;
  power: number;          // donor: totalPowerCount
  kind: number;           // donor: monsterID, used as the tie-break
  ownerId: string;
  summoned: boolean;      // donor: MB_DOES_NOT_RESURRECT, set when an ally summons it (Monsters.c:738); split clones lose the auto-ID flag instead (Monsters.c:569)
  adminRemoved: boolean;  // donor: MB_ADMINISTRATIVE_DEATH, never revived
  hp: number;
  maxHp: number;
}

// Dead companions wait here instead of being freed. Donor: creatureList `purgatory`.
export class Purgatory {
  private dead: Companion[] = [];

  // Donor removeDeadMonstersFromList: an eligible ally goes to purgatory; anything else is freed.
  onDeath(c: Companion): 'held' | 'freed' {
    if (c.summoned || c.adminRemoved) return 'freed';
    this.dead.push(c);
    return 'held';
  }

  heldFor(ownerId: string): number {
    return this.dead.filter((c) => c.ownerId === ownerId).length;
  }

  // Donor resurrectAlly: strongest first (power, then kind), removed from the pool, healed to full.
  // Returns null when nothing is held; the caller keeps the shrine waiting.
  raiseStrongest(): Companion | null {
    if (this.dead.length === 0) return null;
    let best = 0;
    for (let i = 1; i < this.dead.length; i++) {
      const a = this.dead[i];
      const b = this.dead[best];
      if (a.power > b.power || (a.power === b.power && a.kind > b.kind)) best = i;
    }
    const [c] = this.dead.splice(best, 1);
    c.hp = c.maxHp; // donor heal(monst, 100, true)
    return c;
  }
}

// Donor: one use per altar (the feature promotes the altar to an inert tile).
// adapt: charges are zone data; the donor's value is 1.
export interface Shrine { charges: number; }

export function trigger(shrine: Shrine, pool: Purgatory): Companion | null {
  if (shrine.charges <= 0) return null;
  const c = pool.raiseStrongest();
  if (c === null) return null; // the donor aborts the feature and the altar keeps waiting
  shrine.charges -= 1;
  return c;
}
```

## 5. Lands in

- TARGET `src/fight/death.ts` (engine death step, server-side): the held pool for companions that die in a world zone, the raise at a zone shrine, and the shrine's charges. Parity-checklist row 17 (death/respawn). Pit-only fights are row 22 and do not use the pool (see ruling 3).
- Reuse tag: rewrite-from-idea (AGPL-3.0; clean-room, shape only)
- Brief rule served: 1 (one engine: the pool and the raise are server rules, not client state); 17 (death/respawn). Rules 7-9 n/a.

Data shape (PASS2 item 1):
- Donor data: the blueprint table in `variants/GlobalsBrogue.c` (name, depth range, room size, flags such as `BP_REWARD`, then feature rows `{DF, tile, layer, count, ...}`); the dungeon feature table in `Globals.c` (tile, layer, flags such as `DFF_RESURRECT_ALLY`, message, light); the monster catalogue (not read; eligibility is not a catalogue field).
- Row fields for a shrine: one blueprint row plus one dungeon-feature row. Yes: a new shrine type is one blueprint row and one feature row (`DFF_RESURRECT_ALLY` is a flag on the row).
- A revivable companion is one row: no. Eligibility is a bookkeeping bit set in code (`Monsters.c:158`, cleared at `Monsters.c:569`). Our sketch makes it a `summoned` and `adminRemoved` pair on the companion row, so a new revivable companion is one row: yes.
- A shrine with more than one charge is one row: no. One use is the inert tile in `Globals.c:798`. Our sketch makes it `charges` in zone data.

Provenance per claim: repo tmewett-BrogueCE (no `.git` read; no changelog read); licence AGPL-3.0 (LICENSE.txt header, read); file and line for each claim are in the receipts file.

What they patched later: no history available (no `.git`, no changelog read). Comments that record decisions:
- `Rogue.h:2163`: the auto-ID flag is also the purgatory gate (`RogueMain.c:994`), so the flag has two meanings. It is set only for non-inanimate or enter-summons monsters (`Monsters.c:157-158`), the same predicate as 992-993, so it is partly redundant with that test.
- `Rogue.h:2167`: "resurrection altars don't revive monsters summoned by allies": a deliberate exclusion for summons. It is enforced at `Monsters.c:737-739`: when a summoner is an ally, the new monster gets `MB_DOES_NOT_RESURRECT`, which `RogueMain.c:991` tests. This is the real summons rule. Split clones are a different case: they lose the auto-ID flag (`Monsters.c:569`) and so fail the gate at 994.
- `Monsters.c:2892-2894`: a comment says the tie-break prefers deeper and legendary allies, which the code implements.

## 6. Gaps and risks

- AGPL-3.0: clean-room only. The sketch is from the described mechanism.
- The player has no respawn: `gameOver` ends the run (`RogueMain.c:1079`, `1148`). Frankendom respawns at a point (row 17); the permadeath end is rejected.
- The pool never expires (no timeout in `RogueMain.c:1039`, only freed at shutdown). Frankendom needs a rule: expire on leaving the zone, or after a time, as zone data (ruling 1).
- The eligibility flag has two meanings (auto-ID counts and purgatory gate). Frankendom: one explicit `revivable` boolean on the companion row.
- The silent abort: a shrine with nothing held does nothing and prints nothing (`Architect.c:3370-3372` returns before the message at 3375-3377). fix: show "no companion is held" when the pick returns null.
- The raise is free (no ledger entry in the donor). Frankendom's one-ledger rule: a raise either costs a ledger item or is logged as a zero-cost transfer. Ruling 2.
- Placement: the raised companion goes to the nearest free cell (`getQualifyingPathLocNear`, not read). Frankendom must pick a free tile on the server and never stack two units.
- Companion power is `totalPowerCount` (what it counts was not read). Frankendom: power must be a catalogue number, not a derived count, before it is used as a ranking key.
- Ally XP (`companionFeatRequiredXP`, Rogue.h:2422) is not traced into the death path; whether a held companion keeps its XP is not known.
- Trigger wiring: the altar fires from a repeating floor trigger (`Globals.c:799`). The trigger code was not read. The server must verify the owner stands on the shrine, not a client event.

## Rulings for Dom

1. Held companions: should a companion held after a death expire (on leaving the zone, or after a set time), or stay until the run ends (donor)? Recommendation: expire on leaving the zone, so the pool is per zone.
2. Raise cost: should a shrine raise be free (donor) or cost a ledger item? Recommendation: free, with one charge per shrine (zone data), and each raise written to the ledger as a zero-cost event.
3. Pit fights: should a companion that dies in the Pit (row 22, Pit-only) enter the pool? Recommendation: no; the Pit is a fixed arena and resets.

Reuse tag and weight: Core slice does not need this in the first duel loop; it feeds the companion and pet rows (PM pets-mounts) and row 17 death in world zones after the Core slice.

## Checker findings (Sonnet 5.5 medium, 2026-10-12)
- Verdict: MINOR.
- Sketch comment said summoned copies lack the auto-ID flag; the real summons exclusion is MB_DOES_NOT_RESURRECT set at Monsters.c:738 when an ally summons (only split clones lose auto-ID, Monsters.c:569). The note never cited 738.
- Missed: the auto-ID flag is set only for non-inanimate or enter-summons monsters (Monsters.c:157-158), the same predicate as RogueMain.c 992-993, so it is partly redundant.

Fixed 2026-10-12: sketch comment (also in work/tmewett-BrogueCE-purgatory.ts, comment only), Acceptance and sketch note wording, and the Rogue.h:2163 / 2167 decision lines now cite Monsters.c:737-739 and 157-158.
