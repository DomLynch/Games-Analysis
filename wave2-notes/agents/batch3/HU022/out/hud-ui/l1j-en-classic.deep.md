# l1j-en-classic (hud-ui, cell 16)

Donor: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/serverpackets/S_HPMeter.java` (with `model/L1Party.java`, `model/Instance/L1PcInstance.java`) | Licence: GPL-2.0-or-later (per the file headers, "either version 2, or (at your option) any later version"; the COPYING file is GNU GPL version 2; clean-room, shape only) | Java (server side; no client in this donor) | symbol `S_HPMeter` (ratio packet), `L1Party.createMiniHp` / `deleteMiniHp` / `updateMiniHP`

Checked: `S_HPMeter` read in full (59 lines). `L1Party.java` 40-130 read (join, leave, create, delete, update). `L1PcInstance.java` 2787-2798 (setCurrentHp), 2221-2222 (onPerceive), 3401-3418 (GM bar sweep) read. `L1HpBar.java` read in full. `L1SummonInstance.java` 500-515 read. `S_HPUpdate.java` read in full. `L1Awake.java` 40-90 read (party update branch only). Grep over the server for `new S_HPMeter(` found 10 construction sites, all read as lines (L1PetInstance.java 602 read as a line only). Not read: the L1PcMonitor base class (tick interval), the opcode table, the client, the summon method name at 510 (the code around it is read). Hint file `C_PetMenu.java` was not opened: it is a pet-menu packet, not the frame. camera_scope: not applicable. Confidence: high on the packet and party paths; medium on the GM bar cadence (the monitor interval was not read).

## 1. Mechanism

- The server sends one small packet, S_HPMeter: an object id (4 bytes) and a hit-point ratio as one byte, 0 to 100. The client never gets the other character's exact hp or max hp through this packet.
- Ratio: `100 * current / max`, integer division (so it floors). If max is 0 or less, the ratio is 100 (full) (S_HPMeter.java 34-37).
- Who gets a frame (the only senders, per the grep above):
  - Party. Join: the join method calls `createMiniHp` before the newcomer is added (L1Party.java 50, then 54). Each existing member gets the newcomer's ratio, and the newcomer gets each member's ratio (L1Party.java 101-110). The first member (the leader) gets no frames.
  - Party change: `setCurrentHp` (L1PcInstance.java 2787) returns early if the value is unchanged (2788-2790), clamps to max, sends the self hp update (2796), then calls `updateMiniHP` (2797-2798). `updateMiniHP` sends the changed member's ratio to every member of the party, including the subject (L1Party.java 121-128).
  - Party leave: `removeMember` removes the member, then `deleteMiniHp` if the party is not empty (L1Party.java 57-67). Both sides get ratio 0xFF, which is the hide code (L1Party.java 112-119).
  - Party in view: when a party member comes into view (`onPerceive`), the perceiver gets the subject's current ratio (L1PcInstance.java 2221-2222).
  - Pets and summons: the master gets the ratio when the summon's hp changes (L1SummonInstance.java 510-512; L1PetInstance.java 602, not read in full).
  - GM bar: a GM with the HP-bar skill on gets a ratio for every visible monster, player, summon and pet. `updateObject` (L1PcInstance.java 3401-3418) runs over the visible objects and sends the ratio each time it runs, with no change check. It is driven by the monitor `L1PcAutoUpdate.execTask` (model/monitor/L1PcAutoUpdate.java 31). Turning the bar off sends 0xFF for each known target (L1HpBar.java 49).
- Net effect in this donor: an ordinary player sees another player's hp only through a party (or a summon owner sees the summon). A monster's hp is shown only to a GM with the bar on. There is no player-facing enemy target frame in this donor.

## 2. Key functions

- `S_HPMeter(L1Character)`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/serverpackets/S_HPMeter.java` 32-45 (ratio, the max guard, the byte write).
- `L1Party.createMiniHp` / `deleteMiniHp` / `updateMiniHP`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/L1Party.java` 101-128 and join/leave at 50 and 65.
- `L1PcInstance.setCurrentHp`: `/mnt/frankendom-donors/l1j-en-classic/src/l1j/server/server/model/Instance/L1PcInstance.java` 2787-2799 (the hp entry point for the player).
- `L1PcInstance.updateObject` (GM bar sweep): the same file, 3401-3418.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant |
|---|---|
| Show another entity's health as a percent, not as numbers | ratio scale 100 (theirs, S_HPMeter.java 36) |
| Full frame when there is no max to divide by | `hpRatio = 100` default (theirs, S_HPMeter.java 34) |
| Hide the frame | `0xff` in the ratio byte (theirs, L1Party.java 116-117) |
| Own hp sent as exact numbers, 16-bit | `hpRange = new IntRange(1, 32767)` (theirs, S_HPUpdate.java 26) |
| Party size cap | `Config.MAX_PT` (value not read) |

## 4. TypeScript sketch

simplified: the sketch returns frames (recipient, subject, hidden flag, percent) instead of writing packets. It omits the self hp update, the perceive path, the GM bar sweep and the summon/pet path. It fixes three donor defects: the ratio is never 0 while alive (a floor of 1), the hide code is an explicit flag rather than 0xFF in the percent byte, and the divide has a guard. It also clamps the percent at 100. It does not reproduce the donor's join ordering check (the party cap and the leader rule).

```ts
// Licence: GPL-2.0-or-later (donor headers: "either version 2, or (at your option) any later version"; COPYING is v2). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
export const RATIO_SCALE = 100; // donor: percent

export interface Unit { id: number; hp: number; maxHp: number; }

export interface MeterFrame {
  recipientId: number; // who sees the frame
  subjectId: number;   // whose frame it is
  hidden: boolean;     // explicit flag; the donor encodes "hide" as 0xFF in the ratio byte
  percent: number;     // 0..100, meaningful when hidden is false
}

// Fix: never 0 while alive (the donor floors, so 1 of 300 reads as 0 and looks dead); no divide by zero.
export function ratioPercent(hp: number, maxHp: number): number {
  if (maxHp <= 0) return RATIO_SCALE;               // donor ctor guard: an unset max reads as full
  if (hp <= 0) return 0;
  const floored = Math.floor((RATIO_SCALE * hp) / maxHp);
  return Math.min(RATIO_SCALE, Math.max(1, floored));
}

// Event-driven: called on each hp change. One frame per party member, including the subject itself.
export function onHpChanged(subject: Unit, party: Unit[]): MeterFrame[] {
  const percent = ratioPercent(subject.hp, subject.maxHp);
  return party.map((m) => ({ recipientId: m.id, subjectId: subject.id, hidden: false, percent }));
}

// Join: each side learns the other's current ratio (the newcomer is not yet in `members`).
export function onJoin(newcomer: Unit, members: Unit[]): MeterFrame[] {
  const out: MeterFrame[] = [];
  for (const m of members) {
    out.push({ recipientId: m.id, subjectId: newcomer.id, hidden: false, percent: ratioPercent(newcomer.hp, newcomer.maxHp) });
    out.push({ recipientId: newcomer.id, subjectId: m.id, hidden: false, percent: ratioPercent(m.hp, m.maxHp) });
  }
  return out;
}

// Leave: both sides hide each other's frame.
export function onLeave(leaver: Unit, members: Unit[]): MeterFrame[] {
  const out: MeterFrame[] = [];
  for (const m of members) {
    out.push({ recipientId: m.id, subjectId: leaver.id, hidden: true, percent: 0 });
    out.push({ recipientId: leaver.id, subjectId: m.id, hidden: true, percent: 0 });
  }
  return out;
}

export {};
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (file /tmp/HU022-l1j-hpmeter.ts): passed, no output.

## 5. Lands in

- TARGET `src/fight/health-frame.ts` (the same client-view module as the pokemon cell; the frame reads engine values, never writes them). Parity-checklist row 14 (HUD). The party-frame part is only needed if Frankendom adds parties; the duel frame does not need it.
- today: no party model in Frankendom's rulings that I could check in this pass (not read in Frankendom's code).
- Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
- Brief rule served: 1 (client view of engine values); rule 8 (target file and parity row named)

## 6. Gaps and risks

- GPL-2.0-or-later: clean-room only. Nothing here is a line-by-line port.
- Defect 1 (live, small): the ratio floors (S_HPMeter.java 36; L1Party.java 106-108 and 126; L1SummonInstance.java 510). 1 of 300 hp reads 0%, the same as dead. Fix: floor at 1 while alive (sketch `ratioPercent`).
- Defect 2 (possible): the guard that S_HPMeter uses for max (line 35) is missing in the party and summon divides (L1Party.java 106-108 and 126; L1SummonInstance.java 510). A max of 0 would throw. Not reached in any path read. Fix: one shared function with the guard.
- Defect 3 (protocol): the hide code is 0xFF inside the same byte as the percent. It does not collide today because the ratio tops out at 100, but nothing enforces that. Fix: an explicit hidden flag (sketch).
- Defect 4 (cost): the GM bar sends a ratio for every visible target on every monitor run, with no change check (L1PcInstance.java 3415-3416). The monitor interval was not read. Fix: send on change only, as the party path already does.
- Defect 5 (wire range): the own-hp packet clamps hp to 1 to 32767 (S_HPUpdate.java 26, 38). A boss with a larger max is clamped on the wire. Fix: a wider field, or scale for display only.
- Rulings: the donor sends a ratio to others and exact numbers to self, which fits server-verified kills (the server computes the ratio from its own ledger) and does not leak max hp to other clients. Frankendom's one-ledger rule means the frame must be a view of the engine's hp, never a second copy.
- Gap against Frankendom: the donor has no enemy target frame for ordinary players. Frankendom's enemy frame (cell 1, pokemon) is a different shape: per-enemy, drawn from the engine, with a shield strip. Do not copy the donor's "no enemy frame" as a design.
- Many-on-one: the donor's party frame has no cap beyond the party size (Config.MAX_PT, value not read). MAX_ATTACKERS = 3 does not appear in this donor.
- Also seen (string table, hud-ui fold-in): this donor has no locale file. The player-facing messages are inline Java literals: 403 `new S_SystemMessage(` call sites across 119 files (grep count). The SQL dump (db/l1jdb_m10.sql, 104 CREATE TABLE statements) has no table named as a string table, so there is no count of entries and no grammar to describe; quoted nothing.
- Also seen (minimap and world map): no minimap code found. `S_MapID` (serverpackets/S_MapID.java 9-17) sends the map id and an underwater flag. `model/map/L1WorldMap.java` is a loader for map data at startup (not a player map). Not a minimap.
- Also seen (touch UX, input buffer, lock-on): no lock-on, forgiveness or input-buffer code found by grep. The attack gate at `clientpackets/C_Attack.java` line 90 (`if (Config.CHECK_ATTACK_INTERVAL) {`) is the only nearby rule; its body was not read.

Best transferable idea: other characters' health is one byte, a 0 to 100 ratio that the server computes from its own hp and pushes only on change and only to the people who need the frame (party members, the owner of a summon), with an explicit hide on leave, so the client never learns the other side's max.
Decision (proposed): adapt — keep ratio-only frames for other characters and exact numbers for self, and fix the floor-to-zero bug, the unguarded divide and the 0xFF hide code; park it until Frankendom has parties, since the duel frame does not need it.
Acceptance: in a party of three, member A's frame shows member B as a percent and never B's max hp; a test takes B from 1 hp of 300 to 1 hp and asserts the frame shows 1%, not 0%; leaving the party hides both frames at once.

Reuse tag: rewrite-from-idea (GPL-2.0-or-later; clean-room only)
Brief rule served: 1 (client view of engine values); rule 8 (named target file and parity row 14)
