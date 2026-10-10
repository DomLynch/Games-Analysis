# diasurgical-DevilutionX (parties-guilds-chat, cell 18)

Donor: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` (with `Source/monster.cpp`, `Source/sync.cpp`, `Source/msg.cpp`) | Licence: Sustainable Use License 1.0 (repo `LICENSE.md`; non-OSI, non-commercial use only; the source files carry no per-file licence) | C++ | symbol `AddPlrMonstExper`

Checked: Symbol `AddPlrMonstExper` is defined at player.cpp 2469 and closes at 2483 (read in full). `_addExperience` (2430-2455) read in full. `Monster::tag` (monster.cpp 4971-4974) read. `AddPlrMonstExper` has one caller, `MonsterDeath` (monster.cpp 3999, grep). Callers of the tag function were read at each call line (monster.cpp 1129, 3983, 4035; msg.cpp 2055; missiles.cpp 330). Other callers of the 3-argument `MonsterDeath` (monster.cpp 1011, 2974, 4037; missiles.cpp 1051) were not read. Sync path: `SyncMonster` (sync.cpp 157-208) read; its caller loop (sync.cpp 300-313) read; `SyncMonsterActive`/`SyncMonsterActive2` (57-102) not read in full. Delta path: `delta_sync_monster` (msg.cpp 2841-2858) and `DeltaLoadMonsters` (856-880) read; the callers of `DeltaLoadMonsters` were not traced. `GetNextExperienceThresholdForLevel` (the XP table) was not read. Confidence: high on the XP split and the tag mask; medium on the sync and delta details. Other candidates read in this donor, not written up (one note per cell): the whisper/recipient mask for chat (control_chat.cpp 22, 41-48) and the per-player `friendlyMode` consent flag (msg.cpp 2490-2495; player.h 313; missiles.cpp 349).

## 1. Mechanism

- A monster keeps a credit list: `whoHit`, a bitmask with one bit per player slot (`MAX_PLRS` is 4, multi.h 26). Any hit sets the attacker's bit: `whoHit |= 1 << tagger.getId()` (monster.cpp 4973).
- When the monster dies, the death routine calls `AddPlrMonstExper(level, exp, whoHit)` (monster.cpp 3999). Player minions give no XP (3998).
- Order of steps inside `AddPlrMonstExper` (player.cpp 2469-2483):
  (a) count the set bits over every player slot (2471-2476). The count does not check whether the player is still in the game, alive, or on the level.
  (b) if the count is above zero, `e = exp / totplrs` (2478-2479): an equal integer share.
  (c) if the local player's bit is set (2480), call `MyPlayer->addExperience(e, lvl)` (2481). Only the local player is credited. Every client computes its own share from its own copy of the mask.
- `addExperience(e, monsterLevel)` (player.h 839-842) passes `levelDelta = monsterLevel - characterLevel` to `_addExperience` (player.cpp 2430). Inside it, in this order:
  (d) gate: return if the player is not the local player or has no life (2432), or is at max level (2435-2437).
  (e) level-gap scale: `clampedExp = experience * (1 + levelDelta / 10.0)`, clamped to zero or more (2440). Each level the monster is above you adds 10 percent; each level below takes 10 percent, to a floor of zero.
  (f) multiplayer cap (2443-2446): `min(clampedExp, nextThreshold / 20, 200 * characterLevel)`.
  (g) add `min(clampedExp, maxExperience - current)` (2454).
- Keeping the mask the same on every client:
  - Live sync: `SyncMonster` ORs the incoming mask into the local monster (sync.cpp 207). Before that line there are early returns for a dead monster (160-162), a priority gate on distance to the local player (167-175), and a charge/petrified check (180-181). A sync that fails a gate does not merge its mask.
  - Remote damage: `OnMonstDamage` (msg.cpp 2047-2055) tags the monster for the player who sent the damage message.
  - Per-level delta store: `delta_sync_monster` (msg.cpp 2841-2857) writes the incoming mask into the stored level delta by assignment (2857). When the level is loaded again, `DeltaLoadMonsters` assigns the stored value to the monster (875).
- Other numbers: base exp is `data().exp`. On nightmare it is `2 * (exp + 1000)`, on hell `4 * (exp + 1000)`, and uniques double it (monster.h 357-372). Monster level is `data().level`; uniques use 2x their unique-table level when that is non-zero, otherwise `data().level + 5`; nightmare adds 15 and hell adds 30 (monster.h 396-412).
- Timing: there is no loop of its own. The award runs inside the 3-argument death call, which is reached from the kill paths listed under Checked (monster AI and missile code); the award happens when that call runs on that client.

## 2. Key functions

- `AddPlrMonstExper`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` 2469-2483. Equal split over the mask, then credit the local player only.
- `_addExperience` (block inside `Player`): `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/player.cpp` 2430-2455. Gate, level-gap scale, multiplayer cap, add.
- `Monster::tag`: `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 4971-4974. Sets one bit per attacker.
- `MonsterDeath` (3-argument `Monster &, Direction, bool sendmsg`, XP call; a 1-argument overload is at 1498): `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/monster.cpp` 3996-3999.
- `SyncMonster` (mask merge): `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/sync.cpp` 157-208; OR at 207, gates at 160-181.
- `delta_sync_monster` (stored copy): `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/msg.cpp` 2841-2858; assignment at 2857.
- `OnMonstDamage` (remote tag): `/mnt/frankendom-donors/diasurgical-DevilutionX/Source/msg.cpp` 2047-2056.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Credit list = one bit per attacker, set on every hit | Bit = `1 << slot` (monster.cpp 4973); 4 slots (multi.h 26) |
| Equal split of the base reward over the credit list | Divisor = count of set bits, no damage weighting (player.cpp 2471-2479) |
| Only the local tagged player is paid; each client computes its own | Gate `(pmask & (1 << MyPlayerId))` (player.cpp 2480) |
| Level-gap scale: 10 percent per level, floor zero | `1 + levelDelta / 10.0` (player.cpp 2440) |
| Multiplayer power-level cap | `nextThreshold / 20` and `200 * level` (player.cpp 2446) |
| Monster base reward and level | Difficulty formulas and offsets (monster.h 357-412, above) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor's order for one client's view: count the tagged slots, take the integer share, return if the local slot is not tagged, return if the local player is dead (the donor's gate, which drops the share), then scale by the level gap, apply the multiplayer cap, and add. It omits the max-level cap, the level-up loop, the threshold table (passed in as a number, not read), the sync gates and the stored delta copy, and it uses a plain alive flag where the donor calls `hasNoLife`. It keeps the donor's behaviour that a dead tagger's share is lost; section 6 says why Frankendom must not keep that.

```ts
// Licence: Sustainable Use License 1.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
const MAX_SLOTS = 4;

interface Monster { whoHit: number }          // bit i set = player slot i has hit this monster

function tagMonster(m: Monster, attackerSlot: number): void {
  m.whoHit |= 1 << attackerSlot;
}

function mergeTags(local: Monster, incoming: number): void {
  local.whoHit |= incoming;                    // union of credits received from a sync
}

interface Pawn { slot: number; alive: boolean; level: number; xp: number; }

// Equal share among every tagged slot, then one scaled grant to the local slot.
function awardKill(baseExp: number, monsterLevel: number, whoHit: number,
                   local: Pawn, nextThreshold: number): void {
  let tagged = 0;
  for (let i = 0; i < MAX_SLOTS; i++) {
    if ((whoHit >> i) & 1) tagged++;
  }
  if (tagged === 0) return;
  const share = Math.floor(baseExp / tagged);  // integer share, divisor counts all tagged slots
  if (((whoHit >> local.slot) & 1) === 0) return;
  if (!local.alive) return;                    // as in the donor: a dead tagger stays in the divisor, so its share is lost
  const gap = monsterLevel - local.level;
  let xp = Math.max(0, Math.trunc(share * (1 + gap / 10)));   // 10 percent per level of gap, floor 0
  xp = Math.min(xp, Math.floor(nextThreshold / 20), 200 * local.level); // multiplayer cap
  local.xp += xp;
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, file `/tmp/pg009-xp-check.ts` (sketch plus `export {}`), exit 0. The local Mac has no tsc or eslint, so the Edit hook reported those tools as unavailable; the VPS check is the one that ran.

## 5. Lands in

- TARGET `src/fight/xp-award.ts` (new module, proposed; the Frankendom repo was not opened in this pass, so the path is a proposal): the kill-reward step that runs on the server when a kill is verified. Parity row 18 (loot roll and XP award). The sub-line "server tick: fixed step, input intake, per-tick NPC budget" is not needed here: the award is event-driven.
- today: no equivalent read in this pass.
- Reuse tag: rewrite-from-idea (Sustainable Use License 1.0: clean-room, shape only)
- Brief rule served: rulings on server-verified kills and one ledger (the donor's client-side split is the thing not adopted); MAX_ATTACKERS = 3 (the donor has 4 slots, so the cap must be ours)

## 6. Gaps and risks

- Restricted licence: clean-room only. The sketch is written from the mechanism; no donor line was copied.
- Client-side award: each client computes its own share from a replicated mask (player.cpp 2480-2481). Our rulings say kills are server-verified and there is one ledger. The split must run once, on the server, and write to one ledger. A client may display it, never compute it.
- A dead or absent tagger takes a share and the share is lost. The divisor counts every set bit (player.cpp 2471-2476), but the grant needs a living local player (2432). No code path removes a bit directly: the writes to the live field `whoHit` are the init reset (monster.cpp 229), the tag (4973), the live OR (sync.cpp 207) and the reload assignment (msg.cpp 875). That reload assignment can still replace the mask with a smaller stored one, because the stored copy is written by assignment at msg.cpp 2857. Our version should count only living attackers who are in the zone, and a test should pin that.
- The stored copy can drop credit. Live sync ORs (sync.cpp 207), but the per-level delta store assigns (msg.cpp 2857), and a reload assigns that copy back (875). If we keep any per-zone copy of the credit list, it must be a union, not an overwrite.
- The live merge is gated. `SyncMonster` returns before the OR (sync.cpp 173-181) for a monster that is too far from the local player or charging. A credit can therefore arrive late or not at all on that path. The server-verified ledger avoids this, but the note stands for any client copy.
- Credit comes from any hit, including a resisted missile (missiles.cpp 329-330) and a minion's hit (monster.cpp 1126-1129). This list is a credit list, not an aggro list. Keep it separate from the hate list (checklist row 4).
- The split is equal, not weighted by damage. Whether that is right for us is a design decision, not a donor fact.
- The level-gap rule (10 percent per level, floor zero) and the cap (threshold/20 and 200 x level) are numbers we should make data fields with defaults, not constants inside the function. The threshold table was not read.
- The difficulty exp formulas (`2 * (exp + 1000)`, `4 * (exp + 1000)`) are donor-specific. Do not port them.
- Not read: the XP table, the level-up loop, and the other callers of the 3-argument `MonsterDeath` (monster.cpp 1011, 2974, 4037; missiles.cpp 1051).
- Topic fit: this is a party XP split, not chat or party formation. The better chat candidates are control_chat.cpp (whisper mask) and the friendly-mode consent toggle (`OnFriendlyMode`, msg.cpp 2490-2495); neither is written up.
- `AddPlrMonstExper` takes `pmask` as `char` (player.cpp 2469, player.h 959), so the credit mask is 8 bits and silently limits the party size it can credit.

Best transferable idea: a per-target bitmask of everyone who landed a hit, with an equal split of the base reward over the set bits and a level-gap scale, computed once on the server at the kill, is a small, checkable party-XP rule.

Decision (proposed): adapt - keep the credit mask and the equal split, but run it on the server from the fight ledger (living, in-zone attackers only), not per client and not as a donor-style overwrite of stored copies.
Acceptance: a server test with three tagged attackers and base 90 exp gives each living attacker 30 before the level-gap scale; an attacker who dies before the kill gets nothing and does not reduce the others' share; a second client receives the same award number as the first.

Reuse tag: rewrite-from-idea (Sustainable Use License 1.0: clean-room, shape only)
Brief rule served: server-verified kills and one ledger (rulings 3 and 1); MAX_ATTACKERS = 3 is ours, not the donor's 4 slots.

## Checker findings

- Verdict: MINOR
- Corrected: MonsterDeath described as 4-argument; real signature is 3 arguments at monster.cpp 3996 with a 1-argument overload at 1498
- Missed (also added to section 6): topic fit (XP split rather than chat) and unwritten chat candidates; pmask is char (8-bit credit mask)
