# beyond-all-reason-Beyond-All-Reason (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/pve_supply_drops.lua` (with `luarules/Utilities/damgam_lib/nearby_capture.lua`) | Licence: GNU GPL v2 or later (gadget header line 29: `license = "GNU GPL, v2 or later",`; repo LICENSE.md says the game code is GPL v2 or later) | Lua (Recoil/Spring synced gadget) | symbol `SpawnLootbox`, `gadget:GameFrame`, `NearbyCapture`

Checked: Read in full: `pve_supply_drops.lua` (294 lines) and `nearby_capture.lua` (58 lines). Unit defs read for make and cost values only: `units/other/lootboxes/lootboxbronze.lua`, `lootboxsilver.lua`, `lootboxgold.lua`, `lootboxplatinum.lua`. Opened and set aside: `effects/lootboxes/lootbox-trail.lua` (the list hint; a particle trail, not loot), `effects/lootboxes.lua` (beacon glow visuals), `luarules/gadgets/scav_lootbox_collector.lua` (partly read, lines 28-70 and 100-160; scav transports carry boxes to friendly ground, a separate system), `luarules/gadgets/game_awards.lua` (lines 20-40 only, an economy-classification comment). Not read: `lootboxes/lootboxv2.cob` (the box script), `damgam_lib/position_checks.lua` (FlatAreaCheck, OccupancyCheck, VisibilityCheckEnemy), `GG.addUnitToCaptureDecay`, and how the engine turns the make values into resources. Confidence: high on the tier roll, the spawn credit and the capture order (all read); medium on the payoff, which is only the unit's make values as written in the unit def. The capture library's first line says `-- To be done`, so treat it as unfinished donor code.

Best transferable idea: Roll a drop's tier from a server count of live drops one tier down, with a cap and a factor, so rarity is tuning data rather than a fixed table.
Decision (proposed): adapt - keep the cascade that reads live drop counts per tier (cap and factor as zone data), but reject the capture meter for kill loot because kills are server-verified and capture is not a kill.
Acceptance: A server test seeds 10,000 rolls with 0 live drops and asserts only tier 1 comes out; with 1 live gold drop and 2 player sides it asserts tier 4 comes out on about 20% of rolls (1 x 0.4 / 2).

## 1. Mechanism

- The drop work runs in `gadget:GameFrame` only on frames where `n % 30 == 0 and n > 2` (line 170). Each such frame runs three steps, in this order: (a) a pending-credit roll adds 0.1 to `LootboxesToSpawn` with chance 1 in `SpawnChance + 1` (171-172); (b) every alive box gets one `NearbyCapture` step with radius 1024 (178-181); (c) if pending credit is at least 1 and spawning is enabled (183), up to 20 random grid cells are tried (185), and the first cell that passes the flat-area, occupancy and enemy-visibility checks (190-205, library not read) gets `SpawnLootbox` and the loop breaks (206).
- Tier roll, `SpawnLootbox` (141-167): a cascade of three promotion tests, then a fallback. It tests tier 4 first, with chance `min(0.8, aliveT3 * 0.4 / (#teams - 1))` (142). If that fails it tests tier 3 from the alive tier-2 count (144), then tier 2 from the alive tier-1 count (146). Otherwise tier 1 (148-149). So a higher tier becomes more likely as more of the tier one step below is alive on the map. The counts are all live boxes in the tier tables, owned or not, because they change only on create and destroy (see 214-251 and 253-287). Each tier has a name list with a scav variant (65-73). After the roll the box and a gold drop pod are created (151-166).
- Two callers reach `SpawnLootbox`: the GameFrame spawn step (206) and the scav beacon branch in `UnitDestroyed` (280-282, a 33% roll on `math.random() <= 0.33`, otherwise pending credit +0.33 at 284).
- Created box, `gadget:UnitCreated` (214-251): a box is set neutral and always visible (217), pending credit drops by 1 (219), and the tier tables get the box with its capture difficulty: tier 1 = 2 (230), tier 2 = 4, tier 3 = 8 (238), tier 4 = 16 (242).
- Destroyed box, `gadget:UnitDestroyed` (253-287): pending credit rises by 0.5 (255) and the box leaves the tier tables.
- Capture, `NearbyCapture` (nearby_capture.lua 5-54), called once per alive box per 30-frame step (180). Every unit within the cylinder that is not the box and not being built: an allied unit subtracts `(metalCost / 1000) * 0.01 / difficulty` (22-24), an enemy adds it (25-26), gaia adds nothing. If the meter goes below 0 it is set to 0 (35-36) and handed to the decay call (38). If it reaches 1 or more, the box goes to the team of the nearest enemy within `range * 2` (40-43) and the meter is set to 0.75 (44). If no enemy is in range, nothing changes (the flip branch at 41-47 has no else). Otherwise the meter is set to the new value (49).

## 2. Key functions

- `SpawnLootbox`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/gadgets/pve_supply_drops.lua` 141-167. Tier cascade (142-149), then creates the box and a gold drop pod (151-166).
- `gadget:GameFrame`: `pve_supply_drops.lua` 169-212. Cadence (170), pending credit roll (171-172), capture step for alive boxes (178-181), spawn attempts (183-206).
- `gadget:UnitCreated`: `pve_supply_drops.lua` 214-251. Neutral and visible (217), pending -1 (219), tier tables and capture difficulty assignments (230, 234, 238, 242).
- `gadget:UnitDestroyed`: `pve_supply_drops.lua` 253-287. Pending +0.5 (255), tier table removal, scav beacon branch (280-284).
- `NearbyCapture`: `/mnt/frankendom-donors/beyond-all-reason-Beyond-All-Reason/luarules/Utilities/damgam_lib/nearby_capture.lua` 5-54. Meter update (22-26), decay call (38), flip (40-44), meter store (49).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Tier cascade: test the top tier first, each test's chance is the count of the tier below times a factor, capped | Cap 0.8 and factor 0.4 (theirs, pve_supply_drops.lua 142); divisor `#teams - 1` (142) |
| Pending spawn credit: a 1 in (N+1) roll every 30 frames adds 0.1; a destroyed box adds 0.5; a created box takes 1 | `SpawnChance = ceil((150 / density) / numTeams)` (120); density multiplier 0.2 for veryrare (112), 0.5 for rare (114), 1 for normal (116) |
| Capture meter: each unit adds metal cost / 1000 x 0.01 / difficulty | Difficulty 2 / 4 / 8 / 16 for tiers 1-4 (230, 234, 238, 242); radius 1024 (180); flip search 2 x radius (40); flip meter 0.75 (44); floor 0 (36) |
| Box payoff, as the unit def writes it | Metal cost 375 / 750 / 1500 / 2500; metal make 20 / 40 / 80 / 140; energy make 400 / 800 / 1600 / 2800 (bronze / silver / gold / platinum, `units/other/lootboxes/*.lua`) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order of the tier cascade (tier 4 first, each step its own random draw, tier 1 as fallback) and the capture order (sum the step, floor at 0, flip at 1 or more, store). It omits the spawn cadence and pending credit, the spot checks, the scav variants and drop-pod, the decay call, the "box being built" gate, the nearest-enemy search (passed in as an argument here), the tier tables themselves (passed in as counts), and the donor's `(#teams - 1)` divisor, which is replaced by a player-side count. The sketch does not model the one-team case, where the donor's divisor `(#teams - 1)` is zero (no guard at line 142).

```ts
// Licence: GNU GPL v2 or later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export type Tier = 1 | 2 | 3 | 4;

export interface DropPool {
  aliveByTier: Record<Tier, number>; // live drops per tier, counted from the server ledger
  teamsMinusOne: number;             // donor divides by (#teams - 1); we pass the player-side count
}

export interface DropRollData {
  promoteCap: number;                // donor 0.8
  promotePerLower: number;           // donor 0.4
  rand: () => number;                // injected so a test can seed it
}

// Donor order: test tier 4 first (chance from live tier-3 drops), then tier 3 (from tier-2), then tier 2 (from tier-1); else tier 1.
export function rollDropTier(pool: DropPool, d: DropRollData): Tier {
  const chance = (aliveBelow: number): number =>
    Math.min(d.promoteCap, (aliveBelow * d.promotePerLower) / pool.teamsMinusOne);
  if (d.rand() < chance(pool.aliveByTier[3])) return 4;
  if (d.rand() < chance(pool.aliveByTier[2])) return 3;
  if (d.rand() < chance(pool.aliveByTier[1])) return 2;
  return 1;
}

export type Relation = 'ally' | 'enemy' | 'gaia';
export interface Nearby { metalCost: number; relation: Relation; }
export interface Capture { progress: number; owner: string; }

// One capture step for one drop; the caller runs it once per 30 frames with the units inside the radius.
export function captureStep(
  c: Capture,
  nearby: Nearby[],
  difficulty: number,
  nearestEnemyTeam: string | null,
): Capture {
  let delta = 0;
  for (const n of nearby) {
    const power = ((n.metalCost / 1000) * 0.01) / difficulty;
    if (n.relation === 'ally') delta -= power;
    else if (n.relation === 'enemy') delta += power;
  }
  if (delta === 0) return c;
  const next = c.progress + delta;
  if (next < 0) return { progress: 0, owner: c.owner };
  if (next >= 1) {
    if (nearestEnemyTeam === null) return c; // donor: no enemy in range, the meter is left as it was
    return { progress: 0.75, owner: nearestEnemyTeam };
  }
  return { progress: next, owner: c.owner };
}
```

## 5. Lands in

- TARGET `src/fight/loot.ts` (new module, server-side): the tier roll for one drop, reading the zone's live drop counts from the one ledger. Parity-checklist row 18 (loot roll and XP award).
- The capture meter is not adopted. If Frankendom ever wants a contested objective, it belongs with zone population (row 23), not with kill loot.
- Spawn cadence and pending credit (GameFrame 170-172, 183-206) are zone population logic, parity row 23 (not adopted in this note).
- Reuse tag: rewrite-from-idea (GPL v2 or later; clean-room only)
- Brief rule served: one ledger (the drop counts are server state, not client state) and zones as data (cap, factor and density are zone fields).

## 6. Gaps and risks

- GPL v2 or later: clean-room only. The sketch is written from the mechanism, not translated.
- Direction of the rule: more live tier-(N-1) drops make tier N more likely. That is the donor's choice and it is not tuned for a duel game. Frankendom would need a sim test before any number ships.
- The donor counts every live box, owned or not, so a team that holds boxes raises the rate for everyone. Frankendom must decide whether unclaimed drops only are counted (the sketch assumes the server passes that count).
- The donor divides by `#teams - 1` with no guard at line 142. With one team the divisor is zero. Frankendom must guard it.
- Capture-by-presence is not kill loot. Kills are server-verified; a meter that flips to the nearest enemy team has no counterpart in the duel step. Do not port it to kill rewards.
- Order of operations matters for one ledger: the donor computes the new meter once, then either floors it at 0, flips it at 1 or more, or stores it. A meter at 1 or more with no enemy in range is left unchanged, not clamped. Frankendom must test that case if it ever ports the meter.
- `lootboxToSpawn` is assigned without `local` in `SpawnLootbox` (143-149). A donor quality note only.
- The payoff is the unit's make values. How the engine turns them into the owner's resources was not read, and the box's COB script was not read. Frankendom's loot payoff would be data fields, not this unit.
