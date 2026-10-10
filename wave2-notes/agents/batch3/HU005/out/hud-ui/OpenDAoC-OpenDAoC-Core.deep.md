# OpenDAoC-OpenDAoC-Core (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/OpenDAoC-OpenDAoC-Core/GameServer/gameobjects/GameLiving.cs` (2609-2763, health percent cache and setter), with `gameobjects/GamePlayer.cs` (2262-2300, 2425-2444, 2473, 8742-8748, 9160-9191), `gameutils/Group.cs` (457-480), `ECS-Services/TimerService.cs` (105-127), `packets/Server/PacketLib168.cs` (1217-1250, 1644-1668, 3895-3930) | Licence: GPL-3.0 (LICENSE file: "GNU GENERAL PUBLIC LICENSE, Version 3, 29 June 2007"; gplheader.txt is the per-file header; clean-room, shape only) | C# | symbol `UpdateCachedHealthPercent`

Checked: the server side of the health, target and group frames, read end to end: the percent cache and its three update paths (GameLiving.cs), the player overrides and the notify flag (GamePlayer.cs), the one-shot status timer (TimerService.cs, Start and Tick only), the group batch (Group.cs), and the packet writers (PacketLib168.cs). Callers checked by grep: all `RefreshCachedHealthPercentGroupWindow` callers, all `UpdateMember` callers, all `HealthPercentGroupWindow` overrides, the `SendCombatAnimation` callers seen in grep output only (GamePlayer.cs 2595 and 8489, the siege catapult and ballista files; none opened). Not read: `GameLoop.GetListForTick`, `ServiceObjectStore.Add` (the coalescing below relies on its return value; not verified), GamePlayer.cs 7761, and the timer's lower lines. The client window code is NOT in this repo, so this note covers the server feed only. Confidence: high on the server feed; medium that it is the whole path to the screen. camera_scope: n/a (HUD).

## 1. Mechanism

- Source of truth: the health integer (`m_health`). The percent is a cached byte, updated in three places. (a) The health setter clamps the value, runs the full-heal branch (2740-2750), starts regeneration if below max, and ends by recomputing the cached percent from the current max (2757). (b) The max getter `MaxHealth` calls `ResolveMaxHealthAndUpdateCache` (2763), which recomputes the percent only if the max changed (2648-2650) and fires `OnCachedHealthPercentChanged` if the percent moved (2654-2655). (c) `RefreshAllCachedResourcePercents` runs at AddToWorld (2713-2723, not read beyond its comment). Percent = clamp(current x 100 / max, 0, 100), and 0 when max is 0 (2621).
- Player path (GamePlayer 2427-2444): the health override reads the percent before the base set (2432), sets it, then if the percent changed (2438) refreshes the group-window percent (2440) and requests a status update with a group notify (2441).
- Max path: a changed max fires the player's override (2281-2285), which refreshes the group-window percent and requests a status update with a group notify.
- Concentration path (2297-2301): sends the status to the owner only, with no group notify, and the code says concentration is not sent to group members.
- Request (GamePlayer 9160-9166): `RequestResourceStatusUpdate(notify)` sets a sticky notify flag (9163, it is only ever set true here) and calls `Start(0)` on a one-shot timer (9165).
- Tick: the timer runs once at the next game-loop tick (TimerService 105-112 sets NextTick to now + interval and adds the timer to the store; 120-127 runs the callback, takes its return value as the next interval, and stops the timer when that is 0). The callback (GamePlayer 9182-9190) clears the notify flag (9188) and calls `UpdatePlayerStatus(notify)` (8742-8748), which sends the self status and, if notify is set, calls `Group.UpdateMember(this, false)`.
- Group batch (Group.cs 457-480): for each player in the group, build one list of the changed members (members of this group, same region unless the other-region flag is set), and send one `SendGroupMembersUpdate` packet per player that has a non-empty list.
- Packet per member (PacketLib168 3895-3930): group slot byte (1 to 8, 3897); health percent from the player's cached group-window value, otherwise the living's own percent (3905); mana percent (3907); a status bitfield: dead (health at or below 0), mezzed, diseased, poisoned, link-dead (3909-3919); and if the member is in another region, zero health and mana plus the other-region bit 0x20 (3925-3928).
- Target frame: `SendCombatAnimation` (1217) writes the defender's health percent as the last byte (1247). If the passed value is above 100, it uses the defender's live percent instead (1242-1245). So every swing carries the target's percent to the viewer, with no separate target packet.
- Pet case: a necromancer pet's health override (NecromancerPet.cs 91-101) refreshes and notifies its owner when its percent changes (96-99). The disciple class (ClassDisciple.cs 96-105) overrides the group-window percent to show the pet's percent when a pet exists (102-103). From the grep, nothing refreshes a disciple owner when its pet's health changes; see section 6.

## 2. Key functions

- `UpdateCachedHealthPercent`: `GameLiving.cs` 2618-2623. Clamp and integer percent, with the max remembered.
- `ResolveMaxHealthAndUpdateCache`: `GameLiving.cs` 2646-2658. Recompute on max change, notify on percent change.
- Health setter: `GameLiving.cs` 2730-2759. Clamp, full-heal branch, regeneration start, cache refresh at the end.
- `GamePlayer` health override: `GamePlayer.cs` 2427-2444. Compare before and after, refresh the group-window cache and request the status.
- `RequestResourceStatusUpdate` and its timer callback: `GamePlayer.cs` 9160-9191. Sticky notify flag and one-shot zero-delay timer.
- `UpdatePlayerStatus`: `GamePlayer.cs` 8742-8748. Self status, then group member update if notify.
- `Group.UpdateMembers`: `Group.cs` 462-480. One list per player per tick, one packet per player.
- `WriteGroupMemberUpdate`: `PacketLib168.cs` 3895-3930. The per-member frame bytes.
- `SendCombatAnimation`: `PacketLib168.cs` 1217-1250. Target percent piggybacked on the combat event.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Percent = clamp(cur x 100 / max, 0, 100), 0 when max is 0 | Clamp 0 and 100 (GameLiving.cs 2621); 0 for max 0 |
| Notify only when the percent changes | The before and after compare (GameLiving.cs 2654; GamePlayer.cs 2438) |
| One-shot zero-delay timer, coalesced by a sticky flag | Start(0) (GamePlayer.cs 9165); callback returns 0 to stop (TimerService.cs 123-127) |
| One batch packet per viewer per tick | Group member list per player (Group.cs 466-478) |
| Status bitfield for a frame | Dead 0x01 (health at or below 0), mezzed 0x02, diseased 0x04, poisoned 0x08, link-dead 0x10, other region 0x20 (PacketLib168.cs 3909-3928) |
| Group slot index | 1 to 8 (PacketLib168.cs 3897) |
| Target percent sentinel | Above 100 means invalid, read live (PacketLib168.cs 1242) |

## 4. TypeScript sketch

simplified: the sketch replaces the donor's setter-and-callback chain with one pure snapshot per viewer per tick, then diffs it against the last value sent (so the notify flag, the one-shot timer and the three update paths are not needed). It omits the XP damage-dealer clear on full heal, the regeneration start, the concentration channel, the byte casts and packet framing, the donor's zero-value other-region write (the sketch returns zeros too, but omits the byte packing), and the group-window cache. It keeps the donor's clamp, the status bit values, the other-region bit and the target percent sentinel. It fixes the stale pet percent by construction, since the frame reads the pet on every tick.

```ts
// Licence: GPL-3.0 (OpenDAoC LICENSE, Version 3). Clean-room sketch from the described mechanism; no donor line is translated.
// clean-room
const STATUS = { dead: 0x01, mezzed: 0x02, diseased: 0x04, poisoned: 0x08, linkdead: 0x10, otherRegion: 0x20 } as const;

interface Member {
  id: number;
  groupIndex: number;          // 1..8
  region: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  mezzed: boolean;
  diseased: boolean;
  poisoned: boolean;
  linkdead: boolean;
  pet?: { health: number; maxHealth: number };   // a pet the member drives; the group frame shows its health
}

interface Frame { id: number; groupIndex: number; healthPct: number; manaPct: number; status: number; }

// Percent clamped to 0..100; 0 when the maximum is 0.
function pct(cur: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, Math.floor((cur * 100) / max)));
}

// Frame derived from current state. Called once per tick, never from a setter.
function frameFor(m: Member, viewerRegion: number): Frame {
  if (m.region !== viewerRegion) {
    return { id: m.id, groupIndex: m.groupIndex, healthPct: 0, manaPct: 0, status: STATUS.otherRegion };
  }
  const healthPct = m.pet ? pct(m.pet.health, m.pet.maxHealth) : pct(m.health, m.maxHealth);
  let status = 0;
  if (m.health <= 0) status |= STATUS.dead;
  if (m.mezzed) status |= STATUS.mezzed;
  if (m.diseased) status |= STATUS.diseased;
  if (m.poisoned) status |= STATUS.poisoned;
  if (m.linkdead) status |= STATUS.linkdead;
  return { id: m.id, groupIndex: m.groupIndex, healthPct, manaPct: pct(m.mana, m.maxMana), status };
}

// Per viewer, once per tick: returns only the frames that differ from what this viewer last received.
// The caller sends the returned list as one packet per viewer.
class FrameFeed {
  private sent = new Map<string, string>();

  tick(viewer: { id: number; region: number }, group: Member[]): Frame[] {
    const out: Frame[] = [];
    for (const m of group) {
      const f = frameFor(m, viewer.region);
      const key = `${viewer.id}:${m.id}`;
      const sig = `${f.healthPct}|${f.manaPct}|${f.status}`;
      if (this.sent.get(key) === sig) continue;
      this.sent.set(key, sig);
      out.push(f);
    }
    return out;
  }
}

// Target frame: the combat event carries the defender's health percent; a value above 100 means
// "not valid", so the live value is read instead.
function combatTargetPct(defender: { health: number; maxHealth: number }, sentPct: number): number {
  return sentPct > 100 ? pct(defender.health, defender.maxHealth) : sentPct;
}

export {};
```

## 5. Lands in

- TARGET `src/fight/frameFeed.ts` (new, server side): one snapshot per viewer per server tick for the self, group and target frames, diffed against the last value sent, one batch per viewer. The window itself is client-only and reads these values. Parity-checklist row 14 (HUD). The per-tick batching is the server tick sub-line "server tick: fixed step, input intake, per-tick NPC budget" under row 18 / post-K item 3.
- Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only, no line translated)
- Brief rule served: 1 (the server owns the frame numbers, the client only draws them); rule 8 (row 14 and the post-K item 3 sub-line)

## 6. Gaps and risks

- DEFECT, stale disciple pet frame (ClassDisciple.cs 102-103; NecromancerPet.cs 96-99; GamePlayer.cs 2440, 2266, 2473): the owner's group percent is a cache, and the only pet-side refresh is in the necromancer pet's health override. A disciple's pet taking damage does not refresh the cache, so the group frame shows the pet's percent only as of the last refresh of the owner (own health change, max change or controlled-brain change, read from the grep of call sites). Not run. Fix: derive the frame from the pet on every tick (the sketch does this), so no per-class hook is needed.
- Side effect on read (GameLiving.cs 2763, 2646-2658): the max getter can fire a status notify, so reading max during a frame build changes network state. Fix: compute max once per tick and never notify from a getter.
- Three update paths (own health, max change, concentration) each carry their own notify rule (GamePlayer.cs 2438-2441, 2281-2285, 2297-2301). Frankendom gets one rule: diff the snapshot each tick. The donor's concentration channel (owner only) is the one exception worth keeping as a data field, not a code path.
- Freshness: the target percent rides on each combat event (1247), while group and self frames wait for the next tick. A target frame can therefore lead the group frame by one tick. Fix: build the target percent from the same tick snapshot; the sketch's `combatTargetPct` only falls back to the live value when the sent value is above 100.
- Other-region members: the donor sends zero health and mana with a flag (3925-3928), so a client that ignores the flag would show 0% (dead-looking) for an unseen member. Frankendom's client must check the flag before drawing a bar.
- Group slot count: the donor's slot field is 1 to 8 (3897). Frankendom's rulings give MAX_ATTACKERS = 3, not a party size, so the slot range is not a Frankendom number; do not copy it without a ruling.
- Status flags: the donor's bits (dead, mezzed, diseased, poisoned, link-dead) are the donor's; Frankendom's status set (guard, stagger, stun and so on) must be its own data list, not these bits.
- Not run: no server test, no packet capture, and the client window code is not in this repo.

Best transferable idea: Derive every frame value (self, group, target) once per server tick from state, diff it against the last value sent to each viewer, and send one batched packet per viewer with only the changed entries, carrying the target's percent on the combat event so the target frame never waits.

Decision (proposed): adapt — the per-tick snapshot, the diff and the one batch per viewer are what Frankendom needs for many-on-one target frames; the donor's cache-and-hook chain is what to reject, because it caused the stale pet frame and a notify on a getter.

Acceptance: A server test: after a pet takes damage, the next tick's frame update for its owner contains exactly one entry for that pet with the new percent; a tick with no change sends no frame packet; a hit on the locked enemy carries that enemy's percent in the same tick's combat event.

Reuse tag: rewrite-from-idea (GPL-3.0; clean-room only)
Brief rule served: 1 (server owns the numbers; client draws); rule 8 (row 14, post-K item 3 sub-line)

Also seen, not the note's subject: the string table `GameServer/language/CZ/CZ - General.txt` (receipts in receipts.tsv): 357 lines, CRLF endings and a UTF-8 byte-order mark. 323 `key: value` entries, 0 duplicate keys, 20 comment lines, 13 blank lines, 1 line with the byte-order mark. Keys are dotted `Class.Member` names with 91 two-level prefixes; 248 keys sit under the GamePlayer prefix. Comments set the grammar: tabs are ignored before the colon (line 5), placeholders are positional `{0}` to `{5}` (line 6; 196 uses in all, `{0}` most often), and keys are meant to stay alphabetical (line 8). There are no plural, case or numeric-suffix keys, so each sentence is a finished Czech string with its own placeholders. About 22 keys name HUD words (target, health, map, window, group), counted by text match on the key only. The English file set is not compared.
