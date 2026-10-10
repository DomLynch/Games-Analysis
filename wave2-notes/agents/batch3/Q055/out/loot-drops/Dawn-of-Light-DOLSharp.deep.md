# Dawn-of-Light-DOLSharp (loot-drops, cell 8)

Donor: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/LootGeneratorScroll.cs` | Licence: GNU GPL version 2 (LICENSE file, "Version 2, June 1991"); per-file header line 7 says "of the License, or (at your option) any later version", so GPL-2.0-or-later | C# | symbol `LootGeneratorScroll.GenerateLoot`

Checked: Read LootGeneratorScroll.cs 1-117 in full. Util.cs 167-203 (Random(max) at 167-170, Chance at 200-203). LootMgr.cs 86-135 (generator loading: DB row, class name lookup at 101, Activator at 116) and 431-445 (GetLoot calls each generator, merges with AddAll), 455-500 (GetLootGenerators, partly). LootList.cs 20-110 (AddFixed at 57-61: always drops; GetLoot at 96). ArtifactMgr.cs 135-172 (GetArtifacts() returns all; GetArtifacts(zone) matches artifact.Zone exactly). ServerProperties.cs 1938-1939 (default 25, category pve). Callers: GenerateLoot is called only through LootMgr.GetLoot (440 and 442). The class name appears nowhere else in the donor, so the scroll generator is attached by a database row that names the class (LootMgr.cs 86-116). Not read: GameNPC.DropLoot, which the file header says builds the real scroll; the DB rows that decide which mobs or regions get this generator; the Artifact class. Confidence: high on the scroll function (every branch read); moderate on the attachment (I read the loader, not the data). The file header is GPL, so this is clean-room, shape only.

## 1. Mechanism

- Entry (49): the drop only applies when the mob and the killer are both in the Trials of Atlantis expansion. Otherwise the list is empty.
- Outer gate (51): `mob.Level >= 45` and `Util.Chance(SCROLL_DROP_RATE)`. The rate is a server property with default 25 (ServerProperties.cs 1938-1939), so about 25 in 100 kills at level 45+.
- Pool choice (55-83):
  1. Dungeon widen roll (55): if the mob is in a dungeon, `Util.Chance((int)(SCROLL_DROP_RATE * 1.5))`, which is 37 at the default. On success the pool is every artifact (57).
  2. Otherwise (or when the widen roll fails) the zone pool: a switch on `mob.CurrentZone.Description` (61). Each zone name maps to one artifact zone, and `ArtifactMgr.GetArtifacts(zone)` returns that zone's artifacts. Examples: the "Oceanus" group ends at 68; "Stygian Delta" starts the Stygia case at 70 ("Land of Atum" shares it); the Volcanus pool is at 80. A zone name not in the switch leaves the pool empty.
- Empty pool (85): no drop. Otherwise the artifact is `artifacts[Util.Random(Count - 1)]` (87), a uniform index from 0 to Count-1.
- Page (93-103): level above 55 gives page 3; 51 to 55 gives page 2; 45 to 50 gives page 1.
- Result (106-110): one placeholder ItemTemplate with Model 488, Level 35 and name `scroll|<artifactId>|<page>`, added with `AddFixed(loot, 1)`, which always drops.
- Dispatch: `LootMgr.GetLoot` (431) runs every generator attached to the mob and merges the lists (434-442). An exclusive-priority generator can cut the list short (GetLootGenerators, 461 onward, partly read). The real scroll is built later by GameNPC.DropLoot (per the file comment; not read).

Order of operations is strict: expansion, level, outer roll, dungeon roll (only in a dungeon), zone or all pool, empty check, uniform pick, page, placeholder. Each roll uses the shared Util RNG.

## 2. Key functions

- `LootGeneratorScroll.GenerateLoot`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/LootGeneratorScroll.cs` 44 to the end of the method (the file is 117 lines; the exact closing line was not receipted).
- `Util.Chance`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/Util.cs` 200-203 (`chancePercent >= Random(1, 100)`); `Util.Random(max)` 167-170 (inclusive 0..max).
- `LootMgr.GetLoot`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/LootMgr.cs` 431-445 (calls each generator; merges with AddAll).
- `ArtifactMgr.GetArtifacts(zone)`: `/mnt/frankendom-donors/Dawn-of-Light-DOLSharp/GameServer/gameutils/Atlantis/ArtifactMgr.cs` 156-170 (exact zone match at 166).

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Level gate, then a percent gate on the drop | Level 45 (theirs, LootGeneratorScroll.cs 51); rate 25 (theirs, ServerProperties.cs 1938) |
| Second roll that widens the pool in a special area | Multiplier 1.5 applied to the rate and truncated (theirs, 55) |
| Pool keyed by where the mob stands, then a uniform pick | Zone-name switch (theirs, 61-81); artifact zone strings (theirs, ArtifactMgr 166) |
| Level-tiered variant | Breaks at 51 and above 55 (theirs, 93-103) |
| Fixed placeholder added at 100% | Item level 35, model 488 (theirs, 106-108) |

Worked numbers from the code (computed, not run): at the default rate, a level-46 mob in a non-dungeon zone in the switch drops with 25% chance; in a dungeon, the pool is all artifacts with 25% x 37% = 9.25% chance, else the zone pool. A level-44 mob never drops. A level-52 kill drops page 2; a level-57 kill drops page 3.

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: expansion gate, level and percent gate, dungeon widen roll, zone pool (or the whole pool), empty check, uniform pick, page by level. It omits the placeholder ItemTemplate (model and item level), the AddFixed call and the LootMgr dispatch and merge, the GameNPC.DropLoot step that builds the real scroll (not read), the Refresh hook, and the Util shared RNG (the sketch takes an injected rng). The donor's zone-name switch is replaced by a zone-keyed data record, which is the change we want.

```ts
// Licence: GPL-2.0-or-later (donor). Clean-room sketch written from the described mechanism; not a translation.
interface ScrollDropTable {
  dropRatePct: number;                     // server-wide percent gate (donor default 25)
  minLevel: number;                        // mob level gate
  dungeonMultiplier: number;               // dungeon pool roll uses dropRatePct x this
  zonePools: Record<string, string[]>;     // zone key -> artifact ids (zone data)
  allArtifacts: string[];                  // pool used by the dungeon widen roll
}

interface ScrollDropInput {
  mobLevel: number;
  mobInDungeon: boolean;
  zoneKey: string;
  expansionOk: boolean;                    // mob and killer both in the scroll expansion
}

interface ScrollDrop { artifactId: string; page: 1 | 2 | 3; }

// Percent gate: true in pct out of 100 cases (pct 0 never, pct 100 always).
function percentGate(pct: number, rng: () => number): boolean {
  return Math.floor(rng() * 100) + 1 <= pct;
}

// Uniform integer 0..max inclusive.
function uniformInt(max: number, rng: () => number): number {
  return Math.floor(rng() * (max + 1));
}

function rollScroll(input: ScrollDropInput, t: ScrollDropTable, rng: () => number): ScrollDrop | null {
  if (!input.expansionOk) return null;
  if (input.mobLevel < t.minLevel || !percentGate(t.dropRatePct, rng)) return null;

  // Dungeons: a second, wider roll uses every artifact. Otherwise, or when that roll fails, use the zone pool.
  let pool: string[];
  if (input.mobInDungeon && percentGate(Math.trunc(t.dropRatePct * t.dungeonMultiplier), rng)) {
    pool = t.allArtifacts;
  } else {
    pool = t.zonePools[input.zoneKey] ?? [];
  }
  if (pool.length === 0) return null;

  const artifactId = pool[uniformInt(pool.length - 1, rng)];
  const page: 1 | 2 | 3 = input.mobLevel > 55 ? 3 : input.mobLevel >= 51 ? 2 : 1;
  return { artifactId, page };
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file /tmp/q055-zone-scroll-drop-dol.ts: exit 0 (run in this session). Sketch file: /private/tmp/p2/wave2-haiku/batch3/Q055/work/zone-scroll-drop-dol.ts.

## 5. Lands in

- TARGET `src/fight/loot.ts`: the world-drop roll (zones as data: the zone pool and the drop rate are per zone; the level gate and the page breaks are engine rules). Parity-checklist row 18 (loot roll and XP award). Called once at the server-verified kill.
- Today: the Frankendom repo was not checked in this pass, so no current loot file is named here.
- Best transferable idea: Drop a zone-specific pool on one roll: gate by level, gate by a percent chance, pick the pool from the zone where the kill happened, and make a second, wider roll in dungeons.
- Decision (proposed): adapt - we want the three-gate shape and the zone-keyed pool as zone data, but not the hard-coded zone-name switch, and not the two-step hand-off (placeholder here, real scroll later), because we want one roll and one ledger entry.
- Acceptance: A seeded server test kills a level-46 mob in a zone with a pool and asserts a drop only from that zone's pool at the zone rate (25 by default); a level-44 kill never drops; a zone with no pool never drops; level 52 gives page 2 and level 57 gives page 3; each drop is exactly one ledger entry.
- Reuse tag: clean-room (GPL-2.0-or-later; shape only, no line-by-line translation)
- Brief rule served: zones as data (pool and rate per zone), one ledger (one drop, one entry), server-verified kills (the roll runs on the server at the kill).

## 6. Gaps and risks

- GPL: clean-room only. The sketch is written from the mechanism, and the donor's zone-name switch and placeholder item are not copied.
- The zone key is a display string (`mob.CurrentZone.Description`, 61). Frankendom zones are data with stable ids; key the pool by zone id, not by a name.
- The dungeon widen roll reads the region type (`IsDungeon`, 55). Frankendom needs an explicit zone flag, and the widen roll should be zone data.
- The placeholder-then-DropLoot split (106-110, file header) means the item is decided in two places. We need one roll; do not copy the split.
- The shared Util RNG has no seed in this path. Frankendom needs a seeded stream logged in the fight record (parity row 19) so a drop can be replayed.
- Scope: this generator is only the artifact-scroll drop; the donor's other generators (LootGeneratorRandom and others) were listed by grep but not read, so this note does not cover general loot tables.
- The page thresholds (51 and 56) are fixed in code; zone data should carry them if zones differ in level band.


## Checker findings (Legend pass, Sonnet 5.5 medium, 2026-10-10)
**Verdict: CLEAN.** Independent check against the donor code, stricter pass (8+ claims per note incl. sketch constants and order).

**Errors / corrections:** Every number and branch verified in LootGeneratorScroll.cs: expansion gate 49, level>=45 and Chance(SCROLL_DROP_RATE) 51, dungeon roll (int)(rate*1.5)=37 at 55, zone switch 61-82, empty check 85, Util.Random(Count-1) 87, pages 93-104 (>55:3, >=51:2, else 1), Model 488/Level 35/AddFixed 106-110; ServerProperties default 25 at 1938-1939; Util.Chance 200-203 and Random 167-170; ArtifactMgr zone match 166; LootMgr loader 101/116 and GetLoot 431-445; class name only appears in its own file (grep across all text files); licence v2 and 'any later version' at line 7 OK; worked numbers (25%, 9.25%) correct. Tiny slips: LootList.GetLoot is at 93 not 96; ArtifactMgr.GetArtifacts(zone) spans 156-174 not 156-170; Gaps says thresholds '51 and 56' (equivalent to >55). Sketch order matches donor order (expansion, level+percent, dungeon roll, zone pool, empty, pick, page).

**Missed:** loot.AllowAdd = false (line 91) not mentioned; the exclusive-priority generator behaviour in GetLootGenerators (488-505) is described correctly as 'partly read'. Nothing important missed.
