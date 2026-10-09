# id-Software-Quake-2 (server-tick-netcode, cell 5)

Donor: `/mnt/frankendom-donors/id-Software-Quake-2/server/sv_ents.c` | Licence: GPL-2.0 (gnu.txt) | C | symbol `SV_BuildClientFrame / SV_EmitPacketEntities / SV_WriteFrameToClient`

Checked: (verified: `SV_BuildClientFrame` at 522-669, `SV_EmitPacketEntities` at 125-210, `SV_WriteFrameToClient` at 413-454; all three read in full). The callers (who calls these each server frame) were not read.

## 1. Mechanism

- Each server frame, for each client, `SV_BuildClientFrame` (522-669) builds that client's frame. It takes the viewer's position (origin plus view offset), finds its BSP leaf, area and PVS cluster, and computes the fat PVS (`SV_FatPVS`, called, not read here).
- It loops over every entity from 1 (574). An entity is skipped if it is flagged no-client (579), or has no model AND no effect AND no sound AND no event (583-585). The viewer's own entity skips all the visibility gates below (588). Otherwise it is skipped if its area is not connected to the viewer's (doors can straddle two areas, so the second area is checked, 591-596), or it is outside the fat PVS (617-633). Beams test one cluster against the PHS instead (600-605). Entities with too many leaves (`num_clusters == -1`) are tested against the head node. A sound-only entity (no model) is dropped beyond 400 units (635-644; the literals 400 at 642 and 9999 at 150/158 sit on lines too short to quote, so receipts point at the neighbouring test lines). The sound branch at 610-615 sets `bitvector = fatpvs` in both arms, so sounds use the PVS, not the PHS, in this file.
- Surviving entities are copied into a shared circular buffer of entity states (`svs.client_entities`, 654-667), sized `maxclients * UPDATE_BACKUP * 64` (sv_init.c 354). The frame stores the buffer index of its first entity and the count, so a frame is a range. A missile owned by the client has `solid` cleared in the copy (663-664). The frame also saves the send time, the area bits and a copy of the player state (548-562).
- `SV_WriteFrameToClient` (413-454) picks the frame to delta from: none (full write) if the client's `lastframe <= 0` or the client is `UPDATE_BACKUP - 3` or more frames behind; otherwise the frame the client last acknowledged (422-437). It writes the frame header, areabits, the delta player state, then calls `SV_EmitPacketEntities`.
- `SV_EmitPacketEntities` (125-210) writes the delta against that old frame (`from`, may be null). It walks the new and old lists in entity-number order with 9999 as the end sentinel: a number present in both gets a delta write that emits nothing if unchanged (players are always treated as having new origin info, 165-174); a number only in the new list is written from its baseline with the force flag set (177-182); a number only in the old list gets a remove record (U_REMOVE, 16-bit number if 256 or above, 184-200). It ends with a zero short (204).
- The server keeps `UPDATE_BACKUP` = 16 frames per client (qcommon.h 190) so a delta can be taken against any acknowledged one within 13 frames.
- Inputs: the entity list, the viewer's position, the acknowledged frame. Outputs: a per-client frame and a delta packet.
- Tick: every server frame, per client (the caller was not read).

## 2. Key functions

- `SV_BuildClientFrame`: `/mnt/frankendom-donors/id-Software-Quake-2/server/sv_ents.c` lines 522-669. Viewer leaf and area; per-entity visibility gate; copy into the shared buffer.
- `SV_EmitPacketEntities`: `/mnt/frankendom-donors/id-Software-Quake-2/server/sv_ents.c` lines 125-210. Delta write against the last acknowledged frame; new, changed, removed.
- `SV_WriteFrameToClient`: `/mnt/frankendom-donors/id-Software-Quake-2/server/sv_ents.c` lines 413-454. Chooses the delta base (none if retransmit-requested or 13+ frames stale), writes header, areabits, player state, then calls the delta emitter.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Relevance gate: per entity, a visibility test from the viewer's cell | BSP area and PVS cluster test (theirs) |
| Two-stage test: cheap gate first (no model, no effect), then visibility | flag bits (theirs) |
| Per-frame copy into a shared circular buffer; frames are ranges | entity buffer size = maxclients * UPDATE_BACKUP * 64 (theirs, sv_init.c 354) |
| Delta against the last acknowledged frame; removals are explicit | `UPDATE_BACKUP` = 16 frames kept, full write at 13 behind (theirs, qcommon.h 190; sv_ents.c 427) |
| Distance cull for sounds without a model | 400 units (theirs, sv_ents.c 642) |
| Head-node visibility fallback for entities with too many leaves | leaf count limit (theirs) |

## 4. TypeScript sketch

simplified: relevance is reduced to no-client, has-model and a visible-zone set (the donor also admits entities with an effect, sound or event, bypasses the viewer's own entity, tests area connection and beams separately, and culls model-less sounds at 400 units). The delta returns id lists, not field-level bytes; players' origin handling, the baseline write, the stale-frame fallback to a full write and the player state are omitted.

```ts
// Licence: GPL-2.0 (gnu.txt) (donor). CLEAN-ROOM sketch: written from the mechanism description, not a translation of donor lines.
type State = Record<string, number>;
interface Ent { id: number; zone: number; hasModel: boolean; noClient: boolean; state: State; }
interface Frame { ids: number[]; states: Map<number, State>; }

// Relevance: cheap gates first, then the viewer's visibility test.
function relevant(e: Ent, visibleZones: Set<number>): boolean {
  if (e.noClient) return false;
  if (!e.hasModel) return false;      // sounds and effects are handled by a separate rule
  return visibleZones.has(e.zone);
}

// Build a client's frame: a snapshot of every relevant entity, keyed by id.
function buildFrame(ents: Ent[], visibleZones: Set<number>): Frame {
  const ids: number[] = [];
  const states = new Map<number, State>();
  for (const e of ents) {
    if (!relevant(e, visibleZones)) continue;
    ids.push(e.id);
    states.set(e.id, { ...e.state });
  }
  return { ids, states };
}
// Delta against the last acknowledged frame, walking both id lists in order.
function delta(from: Frame | null, to: Frame): { changed: number[]; created: number[]; removed: number[] } {
  const out = { changed: [] as number[], created: [] as number[], removed: [] as number[] };
  const all = new Set([...(from ? from.ids : []), ...to.ids]);
  for (const id of [...all].sort((a, b) => a - b)) {
    const a = from?.states.get(id);
    const b = to.states.get(id);
    if (a && b) {
      if (JSON.stringify(a) !== JSON.stringify(b)) out.changed.push(id);
    } else if (b) {
      out.created.push(id);
    } else {
      out.removed.push(id);
    }
  }
  return out;
}
```

## 5. Lands in

- TARGET `src/fight/snapshot.ts` (new), the per-client relevance and delta snapshot. Parity-checklist row 18 (post-K item 3: server tick), and row 19 for the delta-against-acknowledged-frame idea (fight record). Rule 5 (many-on-one: relevance and who sees what) applies to the visibility gate.
- today: no snapshot or delta module exists; `src/net/view.ts` only swaps sides for presentation, and rollback snapshots are whole `Duel` objects. Relevance would only matter once a server sends state for many entities. (read in worktree `frankendom-combat-p3`, commit 6adcab27e).
- Reuse tag: rewrite-from-idea
- Brief rule served: (category default, not per-cell) 1 (one combat core, two clients); rules 7-9 n/a

## 6. Gaps and risks

- The visibility test is a BSP-leaf PVS, which Frankendom does not have. The gate would be a different test (zone membership, distance). Only the two-stage shape and the delta step transfer.
- The delta is against the last acknowledged frame. A client that has not acknowledged anything, or is 13 or more frames behind, gets a full write (422-432). Frankendom needs the same rule for a new joiner and a reconnect.
- The donor's removal record is explicit; a dropped client packet leaves stale state until the next acknowledged frame. Loss handling is in the transport, not here.
- Snapshot state is sent as-is; the donor does not check what a client may read beyond visibility. Hidden state (for example, another player's stats) would need its own filter.
