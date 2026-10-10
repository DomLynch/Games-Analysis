# rathena-rathena (parties-guilds-chat, cell 2)

Donor: `/mnt/frankendom-donors/rathena-rathena/src/map/party.cpp` (`party_exp_share`) with `src/map/mob.cpp` (kill loop) and `src/char/int_party.cpp` (level band) | Licence: GPL-3.0 (`LICENSE`: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; party.cpp line 1: "Licensed under GNU GPL") | C++ | symbol `party_exp_share`

Checked: `party_exp_share` (party.cpp 1238-1295) read in full. Kill loop in mob.cpp read for the total damage (2984-2991), the exp_calc_type 2 branch (3073-3077), the damage share (3113-3122), the base exp scaling (3158), the pool (3186-3198), the direct pay (3220) and the call to `party_exp_share` (3229). Char-side band check read in full: `int_party_check_lv` (44-67), `int_party_calc_state` (69 onward, read in part), `party_check_exp_share` (340-341), `party_check_family_share` (300-337), `mapif_parse_PartyChangeOption` (612-630). Confidence high on the order of steps and the numbers. Not read: the map-side handler that receives the option change (`mapif_party_optionchanged` and the map copy of `party.exp`, only seen as a call), `pc_isidle_party` beyond its macro (pc.hpp 1152), the renewal level-penalty helper (only its call at party.cpp 1279), and whether any other caller of `party_exp_share` exists (grep found only mob.cpp 3229). Topic check: party formation, invites, and guild ranks exist in rAthena (`party.cpp`, `guild.cpp`, `channel.cpp`) but were not read for this note; this note covers party XP sharing only.

Best transferable idea: Share a kill's XP through one pool per party, weighted by each attacker's damage fraction, and switch the share off by a visible rule when the party's level spread breaks.
Decision (proposed): adapt - take the damage-fraction pool and the level-band gate, but split only among living party members in the zone (not any member on the map), show the band break to the players, and drop the family exemption and the exp_calc_type forks.
Acceptance: a server test with a party at levels 20, 22 and 35 and band 10 shows "XP share off: level spread 15 > 10" and each attacker is paid alone; with levels 20, 22 and 24 the pooled XP from two attackers is split evenly among the three living members in the zone, and each member's XP entry is one ledger line.

## 1. Mechanism

Two parts: a level gate that switches the party share on and off (char server), and a split on each mob kill (map server).

**Level gate (char server).** A party may share exp only while `max_lv - min_lv` over its ONLINE members is at most `party_share_level`, unless the family exemption applies (int_party.cpp 340-341). The band is recomputed on membership and level events (`int_party_check_lv` at 44-67, `int_party_calc_state` at 69 onward, read in part): min and max start at `UINT_MAX` and 0 (47-48), offline members are skipped (53), and if the share is on and the check fails the flag is cleared and the map servers are told (61-64; the second recompute does the same at 110-111). A player who tries to switch the share ON with a broken band is refused: `mapif_parse_PartyChangeOption` sets flag 0x01 and clears `exp` (623-625).
Family exemption (300-337): if a family member is set and found, every other member with a level must be online, on the family member's map, and at level 70 or more; then the band is ignored. This is a parent-child rule and is not transferable (section 6).

**Kill split (map server).** Runs once, when a mob dies (mob.cpp 3229 is the only call found by grep):
1. Total damage is the sum of the damage log (mob.cpp 2990-2991). If `exp_calc_type` is 2 and there is more than one attacker, the first attacker's entry is doubled and added to the total again (3073-3076). Default `exp_calc_type` is 0 (conf/battle/exp.conf:37).
2. Each attacker's share `per` is its damage over the total (3119); when `exp_calc_type` is 1 or the total is zero the denominator is the mob's max HP instead (3113). `per` is capped at 1 (3122).
3. The attacker's base exp is the mob's base exp scaled by `per` (3158), then by the `bonus` variable built earlier in the function (3084, read in part) and the map's base-exp rate (3159-3160). Job exp is handled the same way.
4. If the attacker's party has the share on (`pt[pnum].p->party.exp`, 3186), its base exp, job exp and zeny go into one pool per party (3192-3198 set `flag = 0`). Otherwise the attacker is paid directly (3220).
5. After all attackers, `party_exp_share` runs for each pooled party (3229).

**Pool split (`party_exp_share`, party.cpp 1238).** Count `c` = party members who have a session, are on the mob's map, are alive, and (only if `idle_no_share` is set) are not idle (1251-1256). If `c < 1` return (1257). Divide base, job and zeny by `c` (1260-1262). If `party_even_share_bonus` is set and `c > 1`, multiply the divided amounts by `100 + bonus * (c - 1)` percent (1264-1265). Give each counted member the exp with `pc_gainexp` (1287 under `RENEWAL_EXP`, 1289 otherwise), and zeny to each (1292-1293). Under `RENEWAL_EXP` each member's share first gets a per-member level-penalty rate (1276-1281).

## 2. Key functions

- `party_exp_share`: `/mnt/frankendom-donors/rathena-rathena/src/map/party.cpp` 1238-1295. The pool split, the even-share bonus and the per-member grant.
- Kill loop, totals and share: `/mnt/frankendom-donors/rathena-rathena/src/map/mob.cpp` 2984-2991 (total), 3073-3077 (first-attacker branch), 3113-3122 (per), 3158 (base exp scaled by per), 3186-3198 (pool), 3220 (direct pay), 3229 (call).
- `int_party_check_lv`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_party.cpp` 44-67. Band over online members; clears the share when broken.
- `party_check_exp_share`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_party.cpp` 340-341. The band or the family exemption.
- `party_check_family_share`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_party.cpp` 300-337.
- `mapif_parse_PartyChangeOption`: `/mnt/frankendom-donors/rathena-rathena/src/char/int_party.cpp` 612-630. Refuses to switch the share on with a broken band.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Damage share: attacker damage over total damage, capped at 1 | Denominator mode 0 (theirs, conf/battle/exp.conf:37); mode 1 uses max HP (theirs, mob.cpp 3113); mode 2 doubles the first attacker's entry (theirs, mob.cpp 3073-3076) |
| Pool per party, then split evenly over the eligible members | Eligible = same map, alive, optionally not idle (theirs, party.cpp 1253). Divide by `c` (1260-1262) |
| Even-share bonus: multiply by `100 + B * (c - 1)` percent | `party_even_share_bonus` default 0 (theirs, conf/battle/party.conf:54); the donor's own comment gives the example: 10 for a party of 5 means 140% in total (party.conf:52) |
| Level gate on max minus min over online members | `party_share_level` default 10 (theirs, inter.cpp:55); shipped config 15 (theirs, conf/inter_athena.conf:13) |
| Family exemption | Party size 2-3, family member, level 70 (theirs, int_party.cpp 331) |
| Idle exclusion, off by default | `idle_no_share: no` (theirs, conf/battle/party.conf:49) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order: per-attacker share from damage, party pool for parties with the share on, direct pay for everyone else, then an even split over living party members on the mob's map with the even-share bonus. It moves the level gate into a separate function (`bandAllowsShare`) that the server would call on membership and level changes; it takes the family exemption as a boolean input. It omits the `RENEWAL_EXP` level penalty, zeny sharing, pet and homunculus paths, the first-attacker branch (`exp_calc_type` 2), the per-extra-attacker exp bonus, the mob-size influence, the `MAX_EXP` caps, idle exclusion, rebirth and MVP handling, and the flag refusal in the char server. It uses `Math.floor` at each division where the donor uses integer division, which is close but not identical.

```ts
// Licence: GPL-3.0 (donor, LICENSE). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
interface PartyMember {
  id: number;
  level: number;
  online: boolean;
  alive: boolean;
  map: string;
}

interface Party {
  members: PartyMember[];
  expShare: boolean;   // the flag the server turns off when the level band breaks
}

interface Attacker {
  id: number;
  partyId: number | null;
  dmg: number;         // damage this attacker dealt to the mob
}

// Level band over ONLINE members only, then the share is allowed if the band fits.
// The donor also accepts a family exemption; this sketch takes it as an input.
function bandAllowsShare(p: Party, shareLevel: number, familyExempt: boolean): boolean {
  if (p.members.length < 2) return true;
  let min = Infinity;
  let max = 0;
  for (const m of p.members) {
    if (!m.online) continue;
    min = Math.min(min, m.level);
    max = Math.max(max, m.level);
  }
  return max - min <= shareLevel || familyExempt;
}

// One mob kill. Each attacker's share is its damage over the total damage (capped at 1).
// Shares from a party with exp share on are pooled; everyone else is paid directly.
// The pool is then split evenly among the party's living members on the mob's map,
// whether or not they hit the mob, with an optional bonus per extra member.
function splitKillExp(
  mobExp: number,
  mobMap: string,
  attackers: Attacker[],
  parties: Map<number, Party>,
  evenShareBonusPct: number,
): Map<number, number> {
  const paid = new Map<number, number>();
  const pool = new Map<number, number>();
  let total = 0;
  for (const a of attackers) total += a.dmg;
  if (total === 0) return paid;

  for (const a of attackers) {
    const share = Math.min(1, a.dmg / total) * mobExp;
    const party = a.partyId === null ? undefined : parties.get(a.partyId);
    if (party && party.expShare) {
      pool.set(a.partyId as number, (pool.get(a.partyId as number) ?? 0) + share);
    } else {
      paid.set(a.id, (paid.get(a.id) ?? 0) + Math.floor(share));
    }
  }

  for (const [partyId, amount] of pool) {
    const party = parties.get(partyId);
    if (!party) continue;
    const eligible = party.members.filter((m) => m.alive && m.map === mobMap);
    const c = eligible.length;
    if (c < 1) continue;
    let each = Math.floor(amount / c);
    if (evenShareBonusPct > 0 && c > 1) {
      each = Math.floor((each * (100 + evenShareBonusPct * (c - 1))) / 100);
    }
    for (const m of eligible) paid.set(m.id, (paid.get(m.id) ?? 0) + each);
  }
  return paid;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/reward.ts` (new; the XP award for a server-verified kill, in the engine). Not checked against the Frankendom repo (not read).
- Parity row: 18 (loot roll and XP award). The party XP pool is a sub-line of the XP award; the server kill path is the same post-K item 3 line for the server tick (fixed step, input intake, per-tick NPC budget). This split runs once per kill, not per tick.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room, shape only)
- Brief rule served: one engine (the split runs in the engine, not the Pit or zone client); server-verified kills (the split runs after the server verifies the death); one ledger (each member's XP is one ledger entry).

## 6. Gaps and risks

- GPL-3.0: clean-room only. The sketch is written from the mechanism.
- The divisor counts living party members on the mob's map who never hit the mob (party.cpp 1253, 1260). In a busy zone that pays bystanders. MAX_ATTACKERS = 3 caps who can hit, but the donor's rule decides who shares. Frankendom must choose: attackers only, party members in the fight, or party members in the zone. Copying the donor's rule is not the answer.
- Range: party.cpp 1253 checks only the map id, not distance. Frankendom's zones are data, so a fight radius would be a new rule, not a copy.
- The level gate switches the share off silently at the char server (int_party.cpp 61-64, 110-111). Frankendom must show the state change to the player, with the reason.
- Family exemption (int_party.cpp 300-337): a parent-child rule for party size 2-3 at level 70. Reject for Frankendom.
- `exp_calc_type` 2 doubles the first attacker's entry (mob.cpp 3073-3076), which changes every share. If Frankendom wants it, it must be a data field with a default, not a silent mode.
- The split runs on the map server from the damage log, which is rAthena's authority for kills. Frankendom's rule is that kills are server-verified and the client never computes XP; the donor's placement fits that, but it does not state the rule, so it has to be enforced in our code.
- `party_share_level` is a config value (inter.cpp:55 default 10; inter_athena.conf:13 ships 15). Frankendom should make it zone data with a default, since a level band that fits one zone may not fit another.
- Idle exclusion is off by default (conf/battle/party.conf:49); `pc_isidle_party` is a macro (pc.hpp 1152) and was not read further.
- The renewal level-penalty helper (`pc_level_penalty_mod`, party.cpp 1279) was not read; the note describes only its place in the split.
