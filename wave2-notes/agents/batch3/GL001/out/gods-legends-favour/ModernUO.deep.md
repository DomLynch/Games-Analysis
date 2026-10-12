# ModernUO (gods-legends-favour, cell 23)

Donor: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/` (Engines/Virtues/VirtueSystem.cs, Valor.cs, Sacrifice.cs; Engines/CannedEvil/ChampionSpawn.cs, ChampionSpawnInfo.cs, ChampionTitleSystem.cs, ChampionTitleContext.cs, ChampionTitle.cs; Mobiles/Special/BaseChampion.cs; Engines/Factions/Core/Faction.cs, FactionState.cs, PlayerState.cs, Definitions/RankDefinition.cs, Instances/Factions/Minax.cs, Engines/Factions/Mobiles/FactionWarHorse.cs; Gumps/ResurrectGump.cs; Spells/Eighth/SummonDaemon.cs, FireElemental.cs; Mobiles/PlayerMobile.cs 1262-1280) | Licence: GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007 (`/mnt/frankendom-donors/ModernUO/LICENSE` lines 3-4). GPL-3.0 is copyleft: clean-room, shape only | C# | symbols `VirtueSystem.Award`, `VirtueSystem.GetLevel`, `ValorVirtue.Valor`, `ChampionSpawn.OnSlice`, `ChampionSpawn.AdvanceLevel`, `ChampionTitleContext.CheckAtrophy`, `Faction` kill award (around line 1185), `FactionState.CheckAtrophy`, `PlayerState.UpdateRank`

Checked: Read end to end: Engines/Virtues/Valor.cs (138 lines); ChampionTitleSystem.cs (178 lines); ChampionTitle.cs (42 lines). Read in the ranges that matter: VirtueSystem.cs 130-155, 182-190, 228-330, 336-392; Sacrifice.cs 12-50, 150-165; ChampionSpawn.cs 183, 255-312, 336-340 (Start, not read in full), 512-674 (slice), 674-766 (advance and spawn), 766-911 (respawn, sublevels, spawn), 560-625 (kill reward), 764; ChampionSpawnInfo.cs 1-60; ChampionTitleContext.cs 1-30, 330-380; BaseChampion.cs 29-37, 70-135; Faction.cs 1150-1225; FactionState.cs 214-260; PlayerState.cs 104-130, 197-272, 338; Minax.cs 55-70; FactionWarHorse.cs 70-84; ResurrectGump.cs 15-75, 177-262 (partial); SummonDaemon.cs 30-40; FireElemental.cs 30-36; PlayerMobile.cs 1262-1280. Not read: Honor.cs, HonorContext.cs, Compassion.cs, Justice.cs (the other virtues), AnimalForm, the champion altar and idol bodies, the faction stones and towns, the default `_maxLevel` for each champion, the body of `Start()`, the callers of `ChampionSpawn.Spawn()` other than Respawn, the Core.ML drop tables. The `CLAUDE.md` and `AGENTS.md` files in the donor root are project instructions for its maintainers; they were not followed, and nothing in them was used as a source for this note. Confidence: high on the Valor economy, the champion ladder, the title decay, the faction kill points and atrophy, and the resurrect credits (each read end to end); medium on the summon-slot and war-horse gates (one or two call sites read). camera_scope: n/a.

## 1. Mechanism

ModernUO has no gods. Its favour analogue is the eight virtues, held as points per player (Humility, Sacrifice, Compassion, Spirituality, Valor, Honor, Justice, Honesty; VirtueSystem.cs 19-29). Five things act on them and on the zone-level champion ladder they feed:

**Points in.** `VirtueSystem.Award` (VirtueSystem.cs 228-251) clips the amount to the cap (21000 by default, 20000 for Honor, 22000 for Sacrifice; 182-188), returns false at the cap (236), and reports `gainedPath` when the level changes (250). The level is read from points: under 4000 is none; at or above the cap is 3; otherwise `(v + 9999) / 10000` (138-148). That formula puts 10000 in level 1 and 10001 in level 2, so the bands start at 4000, 10001 and 20001 (the +9999 is an off-by-one band edge; the code does what it says).

**Champion kill (the zone ladder pays out).** When a champion-spawn creature dies, the killer (or the master of a pet) gets `mobSubLevel * 40` Valor, where `mobSubLevel = tier + 1` and tier is the index of the creature's type in the spawn's tier table (ChampionSpawn.cs 594). The same kill adds `mobSubLevel` title points to that champion family (610). `RegisterDamageTo` (not read in full) credits the damage dealers.

**Champion death.** Only on Felucca (BaseChampion.cs 72-74 returns at once on any other map), each eligible looter gets a flat 800 Valor (106), and six power scrolls go out round-robin over the shuffled looters (126-135 area). An artifact roll happens first: under 0.05 a unique, under 0.15 a shared, under 0.30 a decorative, otherwise none (BaseChampion.cs 29-37).

**Spending Valor (the challenge).** At a champion idol, a player with enough Valor spends it and advances the zone's ladder (`ValorVirtue.Valor`, Valor.cs 45-106). The cost branch runs only while the spawn is active (Valor.cs 59); the 11000 start below runs only when it is not. The needed and spent amounts depend on the ladder's tier: tier 0 needs and spends 2500 (71); tier 1 spends 5000 (76-77); tier 2 needs 10000 and spends 7500 (81-82); tier 3 needs 20000 and spends 10000 (87-88). Each challenge calls `AdvanceLevel` and sets `HasBeenAdvanced`, so one challenge per region (98-99). A Knight-level player can instead start an inactive spawn for 11000 (107-113). Donor defect: when the champion has already spawned, the code sends the 'already spawned' message (61-64) but does not return, so it falls through to the cost switch and can still spend Valor and advance the ladder. Frankendom keeps the idea and returns at that point.

**Points out.** Valor atrophies by 250 at most once per 7 days since the last step (Valor.cs 11-12, 29, 31-43). The check runs on login (PlayerMobile.cs 1275) and on a five-minute timer over the players in the cache (VirtueSystem.cs 377). A longer gap is not caught up: one step of 250 per check. Sacrifice atrophies by 500 per 7 days (Sacrifice.cs 11-13); on the same step its resurrect credits reset to the sacrifice level (48). Title points decay by 90 per day after the last decay (ChampionTitleContext.cs 12-13, 362-363), on a five-minute timer (ChampionTitleSystem.cs 158).

**The champion ladder (the spawn director).** `ChampionSpawn.OnSlice` (512-674) counts deaths of its creatures into `_kills` (the increment is at 572). `MaxKills` is 256 for levels 0-3, 128 for 4-7, 64 for 8-11, 32 for 12-15 and 16 at 16 and above (304-308). The level advances when `floor(kills / MaxKills * 100) >= 99` (657, then `AdvanceLevel` at 659); the skull display shows `p / 20` (663). `AdvanceLevel` (674-696) raises the level, or at the top level calls `SpawnChampion` (693; the method is at 697-766). `Respawn` (766-818) refills `_creatures` to `MaxSpawn = 250 - GetSubLevel() * 40` (764, 773), each new creature drawn from the tier that matches the current level (`GetSubLevel`, 849-853: levels up to 4 are tier 0, up to 8 tier 1, up to 12 tier 2, above that tier 3; 845-847). The spawn expires after 30 minutes by default (183).

**Factions (the realm standing).** A kill of an enemy-faction player moves points (Faction.cs 1161-1215), but the whole transfer (1214-1215) and the active flags sit inside the check `victimState.CanGiveSilverTo(killer)` (1192), a farm guard that this note's sketch does not carry. A victim at -6 or below gives nothing (1161, so power is taken instead). Otherwise `award = max(victimPoints / 10, 1)`, capped at 40 (1185-1190). The victim loses `award` and the killer gains it (1214-1215). Each faction runs atrophy every 47 hours (FactionState.cs 227): a member who was not active loses `ceil(points / 10)` (249-250), and the flag `IsActive` is set on the victim (only if the victim's kill points are above zero, 1196), and on the killer one time in three, inside that same farm-guard check (Faction.cs 1198-1202). Rank is a per-mille percentile of the member's position (PlayerState.cs 255), 1000 when alone (247). The rank table (Minax.cs 59-68) runs from 991 ("Avenger of Mondain") to 0 ("Defiler"); each rank also sets how many faction wearables are allowed.

**Resurrection and death.** `ResurrectGump` (Gumps/ResurrectGump.cs). If the death was a sacrifice and credits are left, one credit is spent (239), so a resurrection can be free. A healer's Compassion level sets the resurrected HP to 20, 40 or 80 percent of max (228 for Seeker; Follower and Knight follow). Stat and skill loss only runs when `Core.AOS` is false (31) and the player has at least five short-term murders (19): a fraction of 85 to 95 percent of the raw stat, and a skill is cut only if it stays at 35.0 or more (37, 64).

**Summons.** A summon spell refuses when `Followers + cost > FollowersMax` (SummonDaemon.cs 34; FireElemental.cs 33 uses cost 4). Elementals and daemons cost different slot counts.

**War horse (mount).** A faction war horse mounts only the owner's faction (FactionWarHorse.cs 78-79) and only at rank 2 or above (82).

## 2. Key functions

- `VirtueSystem.Award`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Virtues/VirtueSystem.cs` 228-251.
- `VirtueSystem.GetLevel`: VirtueSystem.cs 133-152.
- `ValorVirtue.CheckAtrophy`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Virtues/Valor.cs` 31-43.
- `ValorVirtue.Valor` (the challenge): Valor.cs 45-122.
- `ChampionSpawn.OnSlice` / `AdvanceLevel` / `Respawn`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/CannedEvil/ChampionSpawn.cs` 512-696 (slice 512-674, advance 674-696), 766-818 (respawn).
- `ChampionTitleContext.Award` and `CheckAtrophy`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/CannedEvil/ChampionTitleContext.cs` 342-364.
- Faction kill award: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Factions/Core/Faction.cs` 1161-1215.
- `FactionState.CheckAtrophy`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Factions/Core/FactionState.cs` 227-252.
- `PlayerState.UpdateRank`: `/mnt/frankendom-donors/ModernUO/Projects/UOContent/Engines/Factions/Core/PlayerState.cs` 234-270.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Points with a cap and a level band | Cap 21000 (20000 Honor, 22000 Sacrifice); bands from 4000 (VirtueSystem 138-188) |
| Spend points to advance a shared threat ladder | Costs 2500, 5000, 10000 (7500 spent), 20000 (10000 spent) by tier (Valor 71-88) |
| Weekly atrophy, one step, no catch-up | 250 Valor, 500 Sacrifice, 7 days (Valor 11-12; Sacrifice 11-13) |
| Ladder by kills with a progress threshold | 256 / 128 / 64 / 32 / 16 kills per level; advance at 99 percent (ChampionSpawn 304-308, 657) |
| Population cap falling with the tier | 250 minus 40 per tier (ChampionSpawn 764) |
| Shared kill points, victim's tenth, capped | Award = max(victim/10, 1), cap 40; victim at -6 or below gives none (Faction 1161-1190) |
| Inactive members leak points | Ceil(points/10) every 47 hours (FactionState 227-250) |
| Percentile rank with named tiers | 1000 alone; ranks 991 down to 0 (PlayerState 255; Minax 59-68) |

### GL table (gods-legends-favour)

| # | Name | Effect | Formula | Number ranges | Gain / loss events | Decay | file:line |
|---|---|---|---|---|---|---|---|
| 1 | Favour per god (virtues) | Points per virtue, eight of them; levels by band | `(v + 9999) / 10000`, none under 4000, 3 at cap | cap 21000 (20000 Honor, 22000 Sacrifice) | Gain: champion kill (tier+1)x40 Valor; champion death 800 Valor; Loss: challenge spend; Atrophy | Valor -250 per 7 days; Sacrifice -500 per 7 days; titles -90 per day | VirtueSystem.cs 138-188, 228-251; ChampionSpawn.cs 594; BaseChampion.cs 106; Valor.cs 11-43; Sacrifice.cs 11-13 |
| 2 | Blessings and curses (timed rows) | No timed blessings or curses found in this pass. Murder-based stat loss after resurrection (pre-AOS only) | Fraction 0.85 to 0.95 of raw stat | 5+ short-term murders | Death with murders | None | ResurrectGump.cs 19, 31, 37 |
| 3 | Patron choice and switching | No gods. Faction membership has a Leaving timestamp (not read further) | none | none | Leaving | not read | PlayerState.cs 274-278 |
| 4 | Divine domains and aspects | Champion families by name (Abyss, Arachnid, ColdBlood, ForestLord, VerminHorde, UnholyTerror, SleepingDragon, Glade, Corrupt); each has a title track and tier creature lists | Tiered spawn lists per family | 4 tiers per family | Kills in that family | Title track decays | ChampionSpawnInfo.cs 6-21, 43-60 |
| 5 | Boons at favour thresholds | Virtue levels gate abilities (Seeker, Follower, Knight); healer HP by Compassion level | Level from points; HP 20/40/80 percent | levels 0-3 | Crossing a band | Band falls on atrophy | VirtueSystem.cs 50-54; ResurrectGump.cs 228 |
| 6 | Legend signature powers | Each champion family has a champion (for example Semidar, Mephitis, Rikktor). Unique, shared and decorative loot; six power scrolls per death | Artifact roll 0.05 / 0.15 / 0.30 | 5%, 10%, 15% | Champion death | None | BaseChampion.cs 29-37, 106-126; ChampionSpawn.cs 512-520 |
| 7 | Shapeshifting | Animal form exists (PlayerMobile hooks it at 1276-1277); not read | not read | not read | not read | not read | PlayerMobile.cs 1276 |
| 8 | Avatars and summoned aspects | Summons take slots: cost against followers and cap | Refuse if followers + cost > cap; cost 5 (4 SE) for daemon, 4 for fire elemental | cap FollowersMax (not read) | Summon cast | Released on death (not read) | SummonDaemon.cs 34; FireElemental.cs 33 |
| 9 | Fate, luck, oaths | Honor and Honesty exist (not read). No luck stat found | not read | not read | not read | not read | Engines/Virtues/Honor.cs (not read) |
| 10 | Underworld and death | Credits from Sacrifice (free resurrect, max 3); healer HP; stat and skill loss only when AOS is off | Credits = level, weekly; spend one per resurrection | 0-3 credits; 85-95% stat fraction | Sacrifice death; murder count | Credits reset on the weekly step | ResurrectGump.cs 19-64, 228, 239; Sacrifice.cs 48, 159-161 |
| 11 | Divine mounts | Faction war horse, owner's faction only, rank 2 or above, stamina steps 6400 | Gate by faction and rank | rank 2 | Rank | None | FactionWarHorse.cs 52, 78-82 |
| 12 | Relics | Champion artifacts: unique 5 percent, shared 10 percent, decorative 15 percent; awarded on champion death | Roll under 0.05, 0.15, 0.30 | 5 / 10 / 15 percent | Champion death | None; ownership transfer not read | BaseChampion.cs 29-37; ChampionSpawn.cs 512-520 |
| 13 | Temples and shrines | Champion altar and idol: the place (spawn area), the service (the spawn ladder), the offering (Valor challenge at the idol) | Ladder as row 1 | spawn area as data | Challenge | Expire after 30 minutes | ChampionSpawn.cs 183, 697-766; Valor.cs 45-106 |
| 14 | Pantheon factions and realm pride | Faction points move on kills; rank by per-mille percentile; ten rank rows per faction (five distinct names in Minax) | Award = victim/10, min 1, cap 40; inactive atrophy ceil(p/10) every 47 h | ranks 991..0 per mille | Kill (transfer); silver and power branches not read | Inactive atrophy every 47 h | Faction.cs 1161-1215; FactionState.cs 227-250; PlayerState.cs 255; Minax.cs 59-68 |

Best transferable idea: a favour currency that is spent to advance a shared threat ladder, decays one step per week (not per elapsed week), and is refused a second time in the same region.

Decision (proposed): adapt — keep the points-with-cap and level band, the spendable challenge that advances a zone ladder once per region, the one-step weekly decay, and the faction kill transfer (victim's tenth, cap 40). Drop the silver and power branches (Frankendom has no shop or power trade), keep the percentile rank with named tiers as data rows, and use the weekly step as a single event with no catch-up (the donor behaviour, stated as a rule). Why for Frankendom: a favour a player can spend on a zone is the link between the favour ledger and the zone population, and it needs no new system.

Acceptance: A player with 2500 Valor at tier 0 challenges the idol: Valor falls to 0 and the zone's champion ladder advances one level; a second challenge in the same region is refused ("already challenged"); a player offline for 30 days loses 250 Valor once on login, not 1000.

## 4. TypeScript sketch

simplified: the sketch follows the donor order for the virtue ledger (award with cap, level band, weekly one-step atrophy), the Valor challenge (costs by tier, spend then advance, once per region), the champion ladder (kill count, 99 percent advance, top-level spawn, spawn cap by tier), the champion kill reward, the faction kill award and inactive atrophy, the percentile rank, and the sacrifice credits. It omits Honor, Compassion, Justice, Humility, Spirituality and Honesty; the title system and its labels; the silver and power-transfer branches of the faction kill; the champion artifact and loot rolls; the AOS stat loss; the AnimalForm; and the war horse and summon-slot checks beyond the one function. It resets sacrifice credits on the weekly step without the donor's check that Sacrifice points are above zero (Sacrifice.cs 34: the donor only runs the step when points, not level, are above zero; so a player under 4000 points, level 0, gets credits reset to 0).

```ts
// Licence: GNU GPL version 3 (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export {};

const DAY_MS = 24 * 60 * 60 * 1000;
const VIRTUE_CAP = 21000;          // default cap (donor VirtueSystem.GetMaxAmount)
const VALOR_LOSS = 250;            // points per atrophy step (donor Valor.cs LossAmount)
const VALOR_DELAY_MS = 7 * DAY_MS; // one atrophy step per delay (donor LossDelay)
const CREDIT_CAP = 3;              // sacrifice resurrect credits cap (donor Sacrifice.cs)

interface Virtue {
  value: number;    // 0..cap
  lastLoss: number; // ms timestamp of last atrophy step
  credits: number;  // sacrifice resurrect credits
}

// Level bands from points. Under 4000 is none. The +9999 makes exactly 10000 fall in level 1.
export function level(value: number, cap = VIRTUE_CAP): number {
  if (value < 4000) return 0;
  if (value >= cap) return 3;
  return Math.floor((value + 9999) / 10000);
}

// Award: clipped to the cap; returns whether a new level was reached (the "gained a path" message).
export function award(v: Virtue, amount: number, cap = VIRTUE_CAP): { gained: boolean; newPath: boolean } {
  if (v.value >= cap) return { gained: false, newPath: false };
  const add = Math.min(amount, cap - v.value);
  const before = level(v.value, cap);
  v.value += add;
  return { gained: true, newPath: level(v.value, cap) !== before };
}

// Atrophy: at most one step of 250 per 7 days since the last step. No catch-up for longer gaps.
export function atrophyValor(v: Virtue, now: number): void {
  if (v.value <= 0 || v.lastLoss + VALOR_DELAY_MS >= now) return;
  v.value = Math.max(0, v.value - VALOR_LOSS);
  v.lastLoss = now;
}

// Valor challenge: spend points to advance a champion ladder. Costs by ladder tier (0..3).
export function valorChallenge(v: Virtue, tier: number): { needed: number; spent: number } {
  const table = [
    { needed: 2500, spent: 2500 },
    { needed: 5000, spent: 5000 },
    { needed: 10000, spent: 7500 },
    { needed: 20000, spent: 10000 },
  ];
  return table[Math.min(tier, 3)];
}

// Champion ladder: kills per level, advance at 99 percent, spawn cap by tier.
export interface Ladder { level: number; maxLevel: number; kills: number; advanced: boolean; }

export function maxKills(level: number): number {
  if (level >= 16) return 16;
  if (level >= 12) return 32;
  if (level >= 8) return 64;
  if (level >= 4) return 128;
  return 256;
}

export function tierOf(level: number): number {
  return level <= 4 ? 0 : level <= 8 ? 1 : level <= 12 ? 2 : 3;
}

export function spawnCap(level: number): number { return 250 - tierOf(level) * 40; }

// Kill: a kill counts toward the level. Returns 'advance' when the level is reached, 'spawn' at the top.
export function ladderKill(l: Ladder): 'none' | 'advance' | 'spawn' {
  l.kills += 1;
  const p = Math.trunc((l.kills / maxKills(l.level)) * 100);
  if (p < 99) return 'none';
  if (l.level < l.maxLevel) {
    l.level += 1;
    l.kills = 0;
    return 'advance';
  }
  l.kills = 0;
  l.level = 0;
  return 'spawn';
}

// Valor per champion kill: (tier + 1) x 40. Title points: tier + 1.
export function championKillReward(creatureTier: number): { valor: number; titlePoints: number } {
  const sub = creatureTier + 1;
  return { valor: sub * 40, titlePoints: sub };
}

// Faction kill: award is the victim's points over ten (minimum one, cap 40); victims at -6 or below give nothing.
export function factionKillAward(victimPoints: number): number {
  if (victimPoints <= -6) return 0;
  return Math.min(40, Math.max(Math.trunc(victimPoints / 10), 1));
}

// Faction atrophy for an inactive member: ceil(points / 10) for positive points.
export function factionAtrophy(points: number, active: boolean): number {
  if (active || points <= 0) return 0;
  return Math.trunc((points + 9) / 10);
}

// Rank as a per-mille percentile of standing (1000 when alone). Ranks are a descending list of required values.
export function factionRankPermille(rankIndex: number, zeroOffset: number, members: number): number {
  if (members === 1) return 1000;
  if (rankIndex === -1 || zeroOffset <= 0) return 0;
  return Math.trunc(((zeroOffset - rankIndex) * 1000) / zeroOffset);
}

export function factionRank(permille: number, required: number[]): number {
  for (let i = 0; i < required.length; i++) if (permille >= required[i]) return i;
  return required.length - 1;
}

// Sacrifice: on the weekly step, credits reset to the level. Spend one per resurrection; a path gain adds one up to three.
export function sacrificeStep(v: Virtue, sacrificeLevel: number): void {
  v.credits = sacrificeLevel;
}
export function spendCredit(v: Virtue): boolean {
  if (v.credits <= 0) return false;
  v.credits -= 1;
  return true;
}
export function gainSacrificePath(v: Virtue): void {
  if (v.credits < CREDIT_CAP) v.credits += 1;
}

// Summon slot check: followers plus the cost must fit the cap.
export function canSummon(followers: number, cost: number, cap: number): boolean {
  return followers + cost <= cap;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/gl001-modernuo-favour-ledger.ts`: exit 0.

## 5. Lands in

- TARGET `origins/favour.ts` (new): the points ledger per player and virtue, the weekly atrophy step, and the spend that advances a zone ladder. Server-written; the client only asks to challenge.
- Parity-checklist row 23 (zone population: spawn caps, respawn, despawn on empty). The champion ladder is a zone director (kills, level, spawn cap by tier); the Valor challenge is the one way a player moves it. The kill award is the sub-finding under row 18 (loot roll and XP award).
- Data fields (from the donor): virtue cap 21000 (engine); level band start 4000 (engine); Valor step 250 per 7 days (engine); Sacrifice step 500 per 7 days (engine); challenge costs by tier 2500/5000/10000(7500)/20000(10000) (zone data, per ladder tier); champion kill base 40 per tier (engine); champion death Valor 800 (zone data per champion); kills per level 256/128/64/32/16 (zone data per ladder); advance threshold 99 percent (engine); spawn cap 250 less 40 per tier (zone data for the base, engine for the step); faction award cap 40 and atrophy every 47 hours (engine); faction rank table (zone data, per faction).
- Reuse tag: rewrite-from-idea (GPL-3.0, copyleft: clean-room only)
- Brief rule served: GL focus items 1, 5, 6, 10, 12, 13, 14; brief rule 8 (target and parity row) satisfied.

## 6. Gaps and risks

- GPL-3.0 copyleft: clean-room only. The sketch is written from the mechanism. No line of the donor is copied.
- Server-verified: the challenge, the kill award and the atrophy must run on the server. The donor runs them in-process; Frankendom must keep the spend and the ladder advance in one server transaction, so a challenge cannot advance twice.
- One ledger: the donor splits virtue points, title points, faction points and ladder kills across four systems. Frankendom should keep the favour and the zone ladder in one ledger row per player, with the zone's ladder as data.
- Atrophy does not catch up. Offline for a month loses one step, not four. This is the donor's rule and it is kind to returning players; it should be stated as a rule, not left to a side effect.
- The level band has an edge: 10000 is level 1, 10001 is level 2 (the +9999). A test must pin the band edges chosen.
- Sacrifice credits reset to the level on the weekly step only when Sacrifice points are above zero (Sacrifice.cs 34; a level-0 player with some points is reset to 0 credits). The sketch does not gate on that; Frankendom must choose.
- The title system (per family, decaying in one day steps) is a second decay clock. Frankendom should not add it unless a legend title is needed.
- The faction kill transfer moves points between two players. Under Frankendom's server rules this is a valid transfer only if both rows are written in one transaction.
- Not read: Honor and Honesty virtues, Compassion and Justice gains, AnimalForm, the champion altar and idol bodies, the default `_maxLevel` per champion, the body of `Start()`, the faction silver and power branches (partly read), the summon-slot cap value.
- Donor defect found: the Valor challenge falls through after the 'champion already spawned' message (Valor.cs 61-64) and can still spend Valor and advance the ladder. The atrophy band edge and the non-catch-up rule are design facts, not bugs.
- Gates the note first missed: champion-death Valor and scrolls are Felucca only; the challenge costs apply only while the spawn is active; the faction kill transfer has the `CanGiveSilverTo` farm guard. Frankendom should keep a farm guard on any kill-point transfer.

Reuse tag: rewrite-from-idea (GPL-3.0, copyleft: clean-room only)
Brief rule served: GL focus items 1, 5, 6, 10, 12, 13, 14; brief rule 8 (target and parity row)


## Checker findings (Sonnet 5.5 medium, 2026-10-12)
Verdict: MINOR
Errors: 1) BaseChampion.cs 72-74: GivePowerScrolls returns at once if Map != Felucca, so the flat 800 Valor and the six scrolls only go out on Felucca; note states them unconditionally (sec 1 'Champion death', GL table rows 1/6, sketch comment). 2) Valor.cs 59: the tier-cost branch only runs if idol.Spawn.Active; the Knight 11000 start (107-113) only when not active. Note presents the challenge/costs without this gate. 3) Sacrifice.cs 34: the weekly credit reset is gated on Sacrifice POINTS > 0 (virtues?.Sacrifice > 0), not 'level above zero' as the note says (sec 4 header, sec 6). A player with <4000 points (level 0) gets credits reset to 0. 4) Faction.cs 1192: the whole kill-point transfer (1214-1215) and the IsActive flags (1198-1202) sit inside if(victimState.CanGiveSilverTo(killer)); IsActive also needs victim KillPoints > 0 (1196). Note states award/IsActive as unconditional on a payout and calls silver/power branches 'dropped', so a farm-guard gate is lost. 5) Header path 'Mobiles/FactionWarHorse.cs' is wrong: real file is Engines/Factions/Mobiles/FactionWarHorse.cs (lines 78-82 cited are right). 6) 'ten rank rows per faction (five distinct names in Minax)': Minax.cs 59-68 has ten rank rows but only six distinct names (Warlord x2, Executioner x3, Defiler x3).
Missed: Valor.cs 61-64: when the champion has already spawned the code sends the message but has no return, so it falls through to the cost switch and can still spend Valor and call AdvanceLevel (donor defect, note says none found). City of defects not noticed: ChampionSpawn.cs 678-694 AdvanceLevel at max level calls SpawnChampion which resets kills and Level to 0 (697-712); sketch's ladderKill reproduces this correctly. Everything else sampled matched: VirtueSystem 138-188/228-252/356-377, Valor 11-43 and costs 71-88, ChampionSpawn 183/304-308/572/594/610/654-663/674-696/764/845-853, FactionState 227-250, PlayerState 245-255, ResurrectGump 19-64/228-239, SummonDaemon 34, FireElemental 33, ChampionTitleContext 12-13/362, title timer 5 min, GPL-3 LICENSE 3-4.

Fixed 2026-10-12 (Sonnet fixer): added the Felucca-only gate on champion-death Valor and scrolls; added the Spawn.Active gate on the challenge costs and the missing-return defect at Valor.cs 61-64; corrected the Sacrifice weekly reset gate to points above zero (not level); added the CanGiveSilverTo farm guard around the faction transfer and IsActive (plus the victim KillPoints above zero condition); corrected the FactionWarHorse path; corrected 'ten named ranks' to ten rows with five distinct names (checker said six; the file shows five). TypeScript sketch not changed (only prose and comments), so no re-typecheck.
