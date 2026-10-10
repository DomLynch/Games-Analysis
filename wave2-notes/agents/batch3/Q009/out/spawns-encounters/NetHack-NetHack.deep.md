# NetHack-NetHack (spawns-encounters, cell 3)

Donor: `/mnt/frankendom-donors/NetHack-NetHack/src/allmain.c` (`maybe_generate_rnd_mon`, 157-164; call at 240) with `src/makemon.c` (`makemon` 1147-1232, `m_initgrp` 79-140, `makemon_rnd_goodpos` 1076-1130, `rndmonst_adj` 1659-1732) | Licence: NetHack General Public License (`dat/license`, para 2b: a modified or derivative work "must be licensed at no charge to all third parties on terms identical to those contained in this License Agreement") | C | symbols `maybe_generate_rnd_mon`, `makemon`, `rndmonst_adj`, `m_initgrp`

Checked: The hint file `src/vault.c` is not the random spawn director. It holds the vault guard timer (326-345 and 400-432): after 30 turns in a vault a guard is made, then again every 15 turns; that is a second, real encounter timer (`VAULT_GUARD_TIME` 30, `include/hack.h` 69), not used as the main note. The director was found by grep for `rn2(70)`-style rolls and `makemon((struct permonst *) 0`. Read in full: `allmain.c` 151-164 and 225-245 (the per-turn roll and its place in the move loop), `makemon.c` 79-140 (group helper), 1076-1130 (random location), 1147-1232 (entry and species draw), 1430-1438 (group choice), 1593-1648 (uncommon, alignment and temperature shifts), 1652-1732 (`rndmonst`), `include/monst.h` 273-279, `include/monflag.h` 198-202, `include/global.h` 419, `dungeon.c` 2036-2050 (level difficulty), `mklev.c` 899, `sp_lev.c` 3816-3826 (the nomongen option), `dat/license`. Not read: the rest of `makemon` after 1232 (monster set-up), `enexto_gpflags`, `goodpos`, `peace_minded`, the stair fallback beyond line 1122, the level-fill code in `mklev.c`, the quest rule (1666-1667, seen only), the species difficulty data (`monst.c`). Confidence: high on the per-turn roll, the difficulty window, the weights, the spot rule and the group arithmetic; medium on group placement, because `enexto_gpflags` was not read. Camera: not applicable.

Best transferable idea: a per-tick roll decides whether a monster spawns; the species is drawn by weighted sampling inside a difficulty window set by zone depth and the player's level; the spot is out of the player's view; and group size is damped at low player level.

Decision (proposed): adapt. Frankendom needs out-of-view placement, a level-scaled difficulty window and damped groups, and this donor has all three; but its roll is one global number and its groups have no cap, so the roll and the weight table become zone data and a `maxGroup` cap of MAX_ATTACKERS = 3 is added.

Acceptance: Server test: with a fixed seed and a zone roll of 1 in 70, 70,000 ticks give 1,000 spawns within 10%; no spawn lands in the player's view while a free out-of-view tile exists; no group is larger than 3 at any player level.

## 1. Mechanism

- Where it runs: once per game turn in the move loop (`allmain.c` 227-245). Monsters first get their movement allotment (234-235); then `maybe_generate_rnd_mon()` runs (240); then the player's movement allotment (242). The donor's comment (237-239) says the new monster "effectively loses its first turn" because it arrives after movement is allotted.
- The roll (157-164): `!rn2(X)` with X = 70 by default (160), 50 when the depth is greater than the stronghold level (161), and 25 once the player's demigod flag `u.uevent.udemigod` is set (160). One roll per turn; a hit calls `makemon` with no species and no position (163).
- Gate (`makemon.c` 1168-1169): a random spawn is refused unless the level has the random-generation flag. The flag is set on for generated levels (`mklev.c` 899) and off for special levels whose file says `nomongen` (`sp_lev.c` 3822-3823).
- Spot first (1171-1178, 1076-1113): the position is chosen before the species. Up to 50 tries draw x in `[2, COLNO-2]` and y in `[0, ROWNO-1]` (1087-1088, 1091) and reject any tile the player can see (1089) while in play. If none is found, the donor scans the map from a random offset: the first pass skips visible tiles (1109-1110) and drops its scary-tile check (1104). When that pass finds nothing, a stair leading inside this dungeon is tried with a 1 in 2 chance per stair (1114-1122; the rest not read). Only then does the second pass run, which allows visible tiles (`bl` 1, from 1100).
- Species (1218-1230 and 1221-1224): `rndmonst()` draws a species for that spot. The draw is repeated, up to 51 draws in all, until the species can stand on the spot. If a draw returns nothing, `makemon` returns with no monster (1221-1224).
- `rndmonst_adj` (1659-1732): the zone level is `level_difficulty()` (1669), which is the depth in the normal case (`dungeon.c` 2047). The window is min = level / 6 (1670; `monst.h` 274) and max = (level + player level) / 2 (1671; `monst.h` 273). Species below the min or above the max are skipped (1682-1683; `monst.h` 278-279). Uncommon species are skipped (1688-1689): not generated, unique, extinct (1595-1597), or species marked hell-only are uncommon outside hell (1601-1602).
- Weight (1706-1707): frequency `geno & G_FREQ`, a 3-bit field from 0 to 7 (`monflag.h` 202), plus `align_shift` (the donor's comment at 1608 gives 0 to 5; the formula at 1621-1636 uses the dungeon alignment and `ALIGNWEIGHT` 4, `global.h` 419), plus 3 when the species' temperature preference matches the level (1643-1646, 1707).
- Selection (1716-1717): weighted reservoir sampling. Each candidate replaces the current pick with probability weight over running total. If nothing qualifies, `rndmonst` returns nothing (1724-1730).
- Groups (1430-1438): only for random spawns (`anymon`) and not with `MM_NOGRP`. A species with the small-group flag forms a small group with probability 1/2 (1431). A species with the large-group flag forms a large group with probability 2/3, else a small one (1433-1437). `m_initgrp` (79-140): the extra count is `rnd(n)` with n = 3 small or 10 large (85); divided by 4 when the player is below level 3, by 2 below level 5 (106); at least 1 (113-114). Peaceful species form no group (125-126). Each extra is placed at the nearest free spot to the last one placed (`enexto_gpflags` writes into `mm`, 122-132, so the group chains outward from the leader) and made with `MM_NOGRP` (133), so groups do not nest. The leader plus the extras make the group.
- Tick: this is a fixed roll per game turn, not a wall-clock timer. The ordinary path has no timers and no respawn: each turn is one chance.

## 2. Key functions

- `maybe_generate_rnd_mon`: `/mnt/frankendom-donors/NetHack-NetHack/src/allmain.c` 157-164. The per-turn roll and its rate.
- Call site in the move loop: same file, 225-245 (roll at 240).
- `makemon`: `/mnt/frankendom-donors/NetHack-NetHack/src/makemon.c` 1147-1232 (gate, random spot, species draw), and 1430-1438 (groups).
- `makemon_rnd_goodpos`: same file, 1076-1130. The random spot.
- `m_initgrp`: same file, 79-140. Group extras, damping, placement.
- `rndmonst` and `rndmonst_adj`: same file, 1652-1732. Window, uncommon filter, weights, reservoir sampling.
- `align_shift` and `temperature_shift`: same file, 1611-1648. The weight shifts.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constants and where they are |
|---|---|
| Per-turn roll: 1 in 70 default | allmain.c 160 (engine constant; a zone field in Frankendom terms) |
| Per-turn roll: 1 in 50 deeper than the stronghold | allmain.c 161 (engine constant; zone field) |
| Per-turn roll: 1 in 25 after the demigod flag is set | allmain.c 160 (engine constant; zone field) |
| Difficulty window min = zone depth / 6 | monst.h 274 (engine rule) |
| Difficulty window max = (zone depth + player level) / 2 | monst.h 273 (engine rule; uses the player's level) |
| Creation weight = frequency 0 to 7 | monflag.h 202 (species data) |
| Alignment weight 0 to 5 per species | makemon.c 1608 comment and 1621-1636; `ALIGNWEIGHT` 4 at global.h 419 |
| Temperature match adds 3 | makemon.c 1643-1646, 1707 (engine constant) |
| Spot tries: 50 random, out of view | makemon.c 1091, 1089 (engine constant) |
| Species re-draws: up to 50 | makemon.c 1226 (engine constant) |
| Small group: 1 in 2 for small-flag species | makemon.c 1431 (species flag and engine constant) |
| Large group: 2 in 3 for large-flag species | makemon.c 1434 (engine constant) |
| Group extras: draw 1 to 3 or 1 to 10, damped by 4 under level 3 and by 2 under level 5, at least 1 | makemon.c 85, 106, 113-114 (engine constants) |
| Vault guard: first at 30 turns, then every 15 | vault.c 340-341; hack.h 69 (engine constants; not the main note) |

## 4. TypeScript sketch

simplified: keeps the donor's order: roll, spot (50 random tries that skip the player's view, then a scan), species drawn by weighted reservoir sampling inside a window set by zone depth and player level, up to 51 species draws against the spot, the leader, then damped group extras. Omitted: the quest rule, the peaceful check (the sketch has no peaceful species), the stair fallback, the pre-placed monster check, the scary-tile check, the boulder and level-fill code, and the alignment formula (the sketch takes `alignShift` as species data). The scan fallback is simplified: the donor's offset arithmetic and its two-pass rule are shortened to the same two passes over the grid. Frankendom additions: `maxGroup` caps the leader plus extras at MAX_ATTACKERS = 3 (the donor has no cap), and the roll and the table are zone data. The random generator is an own xorshift32, so a test can replay a zone and tick.

```ts
// Licence: NetHack General Public License (donor dat/license, para 2b). Derivatives must be licensed at no charge on identical terms, so treated as copyleft. Clean-room sketch written from the described mechanism, not a translation of the donor lines.
interface Species {
  id: string;
  difficulty: number;        // species difficulty (data, count)
  freq: number;              // creation frequency, 0 to 7
  small: boolean;            // appears in small groups (donor G_SGROUP)
  large: boolean;            // appears in large groups (donor G_LGROUP)
  alignShift: number;        // 0 to 5, set from the zone's alignment (donor align_shift)
  temperatureMatch: boolean; // zone temperature suits this species: +3 weight
  uncommon: boolean;         // unique, not generated, extinct, or excluded
}

interface Zone {
  depth: number;      // zone difficulty (count); the donor's level_difficulty()
  rollOneIn: number;  // per-tick roll: 70 default, 50 deeper than the stronghold, 25 once the demigod flag is set
  species: Species[];
  maxGroup: number;   // Frankendom addition: cap on leader plus group (MAX_ATTACKERS = 3)
}

interface Host {
  width: number;
  height: number;
  inView(x: number, y: number): boolean;            // the player can see this tile
  free(x: number, y: number): boolean;              // a monster may stand here
  canStand(sp: Species, x: number, y: number): boolean;
  adjacentFree(x: number, y: number): { x: number; y: number } | null;
  place(sp: Species, x: number, y: number): void;
}

// Own small xorshift32 generator; the server seeds it per zone and tick so a test can replay spawns.
class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = (seed >>> 0) || 1;
  }
  next(): number {
    let x = this.s;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.s = x >>> 0;
    return this.s / 4294967296;
  }
  int(lo: number, hi: number): number {
    return lo + Math.floor(this.next() * (hi - lo + 1)); // inclusive
  }
}

// Species window from zone depth and player level (donor: min = depth / 6, max = (depth + level) / 2).
function pickSpecies(zone: Zone, playerLevel: number, rng: Rng): Species | null {
  const minDiff = Math.floor(zone.depth / 6);
  const maxDiff = Math.floor((zone.depth + playerLevel) / 2);
  let chosen: Species | null = null;
  let total = 0;
  for (const sp of zone.species) {
    if (sp.difficulty < minDiff || sp.difficulty > maxDiff) continue;
    if (sp.uncommon) continue;
    const weight = sp.freq + sp.alignShift + (sp.temperatureMatch ? 3 : 0);
    if (weight <= 0) continue;
    total += weight;
    // weighted reservoir sampling: this candidate wins with probability weight / total
    if (rng.int(1, total) <= weight) chosen = sp;
  }
  return chosen;
}

// Spot first: 50 random tries that skip tiles in the player's view; then a scan
// whose first pass also skips visible tiles and whose second pass allows them.
function findSpot(host: Host, rng: Rng): { x: number; y: number } | null {
  for (let t = 0; t < 50; t++) {
    const x = rng.int(2, host.width - 2);
    const y = rng.int(0, host.height - 1);
    if (!host.inView(x, y) && host.free(x, y)) return { x, y };
  }
  const x0 = rng.int(0, host.width - 1);
  const y0 = rng.int(0, host.height - 1);
  for (let pass = 0; pass < 2; pass++) {
    for (let dx = 0; dx < host.width; dx++) {
      for (let dy = 0; dy < host.height; dy++) {
        const x = (dx + x0) % host.width;
        const y = (dy + y0) % host.height;
        if (pass === 0 && host.inView(x, y)) continue;
        if (host.free(x, y)) return { x, y };
      }
    }
  }
  return null;
}

// Group extras: draw 1..n (n = 3 small, 10 large), damp at low level, at least one; cap at maxGroup.
function groupExtras(sp: Species, zone: Zone, playerLevel: number, rng: Rng): number {
  let n = 0;
  if (sp.small && rng.int(0, 1) === 1) n = 3;
  else if (sp.large) n = rng.int(0, 2) !== 0 ? 10 : 3;
  if (n === 0) return 0;
  const damp = playerLevel < 3 ? 4 : playerLevel < 5 ? 2 : 1;
  let cnt = Math.floor(rng.int(1, n) / damp);
  if (cnt === 0) cnt = 1;
  return Math.min(cnt, zone.maxGroup - 1);
}

// One tick of the director. Returns what was placed, or null when nothing spawns this tick.
export function tickSpawn(zone: Zone, playerLevel: number, rng: Rng, host: Host): { species: string; size: number } | null {
  if (rng.int(1, zone.rollOneIn) !== 1) return null;

  const spot = findSpot(host, rng);
  if (!spot) return null;

  let sp: Species | null = null;
  for (let t = 0; t < 51; t++) {
    const pick = pickSpecies(zone, playerLevel, rng);
    if (!pick) return null; // nothing fits this window
    if (host.canStand(pick, spot.x, spot.y)) {
      sp = pick;
      break;
    }
  }
  if (!sp) return null;

  host.place(sp, spot.x, spot.y);
  const extra = groupExtras(sp, zone, playerLevel, rng);
  let placed = 1;
  let cur = spot; // the donor chains: each extra starts from the last one placed
  for (let i = 0; i < extra; i++) {
    const p = host.adjacentFree(cur.x, cur.y);
    if (!p) break;
    host.place(sp, p.x, p.y);
    cur = p;
    placed++;
  }
  return { species: sp.id, size: placed };
}

// Usage with a stub host, so the file exercises the types.
const stub: Host = {
  width: 80,
  height: 21,
  inView: (x, y) => x < 10 && y < 5,
  free: () => true,
  canStand: () => true,
  adjacentFree: (x, y) => ({ x: x + 1, y }),
  place: () => undefined,
};
const demoZone: Zone = {
  depth: 6,
  rollOneIn: 70,
  maxGroup: 3,
  species: [
    { id: 'jackal', difficulty: 1, freq: 3, small: true, large: false, alignShift: 0, temperatureMatch: false, uncommon: false },
    { id: 'wolf', difficulty: 5, freq: 2, small: false, large: true, alignShift: 1, temperatureMatch: true, uncommon: false },
  ],
};
const result = tickSpawn(demoZone, 4, new Rng(12345), stub);
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, on `/tmp/NetHack-NetHack-spawn-director.ts` with `export {};` appended: exit 0.

## 5. Lands in

- TARGET `origins/server/world-spawns.ts` (zone population: the per-tick roll, the spot rule, the species window and the group rule, all server-side). Parity-checklist row 23 (zone population: spawn caps and respawn). The server tick sub-line applies: the roll is one fixed step per tick, so the sub-line is "server tick: fixed step, input intake, per-tick NPC budget"; the roll is the per-tick budget of one spawn.
- Reuse tag: adapt (NGPL, treated as copyleft: clean-room; the shape only)
- Brief rule served: zones as data (roll, weights and `maxGroup` are zone fields); one engine (the spawn rule runs in the engine, not the client); MAX_ATTACKERS = 3 (group cap).

## 6. Gaps and risks

- Licence: NGPL para 2b requires derivatives to stay free on identical terms. The sketch is written from the described shape only. Do not port the donor lines.
- No group cap: the donor's group is the leader plus up to `rnd(10)` extras at high player level (makemon.c 85, 106), so a group can be 11 monsters. Frankendom's `maxGroup` (MAX_ATTACKERS = 3) is an addition; the donor does not have it.
- One global roll: the rate is set by the level and the demigod flag (allmain.c 160-161), not by the zone. Frankendom's zones need their own roll field.
- No cap on total monsters: the roll adds monsters every turn with no population check; the only throttle is the rate. Row 23 needs a zone cap on top of the roll.
- Spot fallback leaves the view: if the 50 tries and the first scan fail, the second pass can place in the player's view (makemon.c 1109-1113 with the pass at `bl` 1). Frankendom should reject the spawn or wait a tick, not place in view.
- Player level sets the window: the max is (zone depth + player level) / 2 (monst.h 273), so a high-level player in a shallow zone gets tougher species. This ties spawns to one player's level; with several players in a zone, the rule needs a defined reference level.
- The group damp uses the player level (makemon.c 106). The same caveat: with several players, define which level counts.
- Not read: `enexto_gpflags` (group placement), `goodpos`, the stair fallback beyond 1122, the level-fill code in `mklev.c`, the species difficulty data, the quest rule (1666-1667, seen only). Group placement is therefore medium confidence.
- The vault guard timer (vault.c 340-341) is a separate timed encounter and is not in this note; it may be a second cell-worthy mechanism if Frankendom needs timed arrivals.



## Checker findings (Sonnet 5.5 medium, 2026-10-10)
**Verdict: MINOR.** Independent check against the donor code.

**Errors / corrections:** Per-turn roll 70/50/25 (allmain 160-162), call after movement allotment (240), spot-first with 50 tries and visible rejection (1087-1091), two-pass scan and stair fallback (1100-1128), 51 species draws (1226), window min=lvl/6 max=(lvl+ulevel)/2 (monst.h 273-274), weight G_FREQ+align_shift+3 temperature, reservoir sampling (1716), group 1/2 and 2/3 (1431-1437), rnd(3|10) and /4,/2 damping (85, 106), rndmongen flag (mklev 899, sp_lev 3822), NGPL: verified. Errors: 'Peaceful species form no group (125-126)' is wrong as stated - peace_minded() is rolled per extra inside the loop, so a species with a peaceful chance just yields a smaller group (donor comment 127-130); uncommon() cited 1595-1597 for 'extinct' but G_GONE is 1597 and the in-Hell rule (maligntyp > neutral is uncommon) is omitted; vault guard line leaves out the guard-death damping (vault.c 337-339).

**Missed:** level_difficulty() is the deepest level reached when carrying the Amulet and differs in the endgame; Inhell G_NOHELL skip (1690); first scan pass skipped when Blind or in mklev (1100); quest 6/7 override (1666)
