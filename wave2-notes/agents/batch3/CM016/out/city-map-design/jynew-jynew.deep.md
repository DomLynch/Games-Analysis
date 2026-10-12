# jynew-jynew (city-map-design, cell 1)

Donor: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/MapTeleportor.cs` (with `GameSave/GameRuntimeData.cs`, `LuaScripts/Jyx2Configs/MapHelper.lua`, `GameMaps/LevelMaster.cs`, `GameMaps/BigMapLocationNameDrawer.cs`, `UI/MainUIPanel.cs`; data `Assets/Mods/JYX2/Configs/场景.xlsx`) | Licence: conflicting, treated as restricted. The top-level `LICENSE` says "The use of any resources or code of this project is not permitted unless authorized" (LICENSE:8). The code headers say MIT (MapTeleportor.cs:5). Clean-room, shape only | C# (Unity) + Lua + xlsx data | symbol `MapTeleportor.DoTransport`

Checked: Opened in full: MapTeleportor.cs (176 lines), MapHelper.lua (68 lines), the gate block of GameRuntimeData.cs (699-725), BigMapLocationNameDrawer.cs (labels), and the trigger path of LevelMaster.cs (346-348, 469-514, 430). Read in part: MainUIPanel.cs (Update, compass, name panel, 1-135 range), Jyx2_PlayerInput.cs (the NONAVAGENT branch start only), GameMainMenu.cs (START tag, 205-222), Jyx2LuaToCsBridge.cs (map interface and table load, 480-600). The zone table was read as raw XML from the xlsx on the VPS (zipfile read, nothing written): 85 non-empty rows. The xlsx is a binary file, so these rows have no receipts and are marked as read-from-data only. Confidence high for the exit, gate, label and HUD mechanisms. Not read: the 3D town layout, road and building grammar, how services (shops, inns) are placed in each `.unity` scene, the shop table 小宝商店.xlsx, and the Lua that calls `SetSceneEntraceCondition`. So the town-layout half of this cell is not covered; the verdict is for the zone graph only.

Best transferable idea: One data table of zones where each zone has an entry gate (open, closed, or skill-gated) that a save can override, and exits named by trigger, so the same exit lists drive the transitions, the signage labels and the overworld map.
Decision (proposed): adapt — zones as data fits our ruling, so take the zone table, the exit-by-trigger-name list and the per-save gate override. Reject the client-side gate: the check runs in the Unity client, so Frankendom must check it on the server (server-verified), and the override must live in the one character ledger, not a separate key-value bag.
Acceptance: A server test asserts that an entry request to a gate-1 zone is refused for a save with no override, is accepted after the override is set, and that an exit name missing from the zone's list returns no destination and does not crash.

## 1. Mechanism

- Zone data. Each row of `场景.xlsx` is one zone: Name, MapScene (the scene file), TransportToMap (an exit list such as `Leave:1000,Leave2:13`), EnterCondition, Tags, and music ids. The table is loaded from Lua into a dictionary by id (Jyx2LuaToCsBridge.cs:578). Of 85 non-empty rows: 8 start open (EnterCondition 0), 77 start closed (1), 0 use code 2. One row is the world map (id 1000, tag WORLDMAP). One row is the start zone (id 70, tag START:0). 14 rows have POINTLIGHT, 1 has NONAVAGENT, 5 have a Leave2 exit.
- Exit triggers. Each exit is a MonoBehaviour trigger on a map. On enter (MapTeleportor.cs:42-63): on the world map the destination is looked up by the node's own name (49); in a town it is looked up by the trigger name in the current map's exit list (53, 138). The prompt is shown by ShowEnterButton, which returns before showing anything if the gate is closed (105-111, the check at 107), and the target objects are highlighted (63).
- Entry gate. CheckCanEnterMap (75-103) returns true in the Unity editor (77-79). Otherwise it reads the gate from the runtime (82): -1 or 0 is open; 2 is open if any party member has Qinggong 75 or more (94-100); anything else is closed (102).
- Gate read and save. GetSceneEntranceCondition (699-717) returns 0 for any world-map row (705-706). For other rows it returns the save's override under the key `SceneEntraceCondition_<id>` (709-712) if one exists, else the table value (716). A missing map returns -1 (702). SetSceneEntraceCondition (722-725) writes the override. No C# caller of the setter exists in Assets/Scripts; it is probably called from Lua (not read).
- Transition. DoTransport (121-175): on the world map it records the player's world position first (129-134) and takes the destination by node name; in a town it takes the destination from the exit list (138) and then checks for null (141). It sets LastGameMap (148). The spawn trigger is the explicit TransportTriggerName if set (152-153), else "Leave" when leaving the world map (157), else the map name when entering it (158-161). Then the extra console command runs (164-167) and the scene loads at that trigger (170).
- Arrival. StartAtTrigger calls Transport(triggerName) (346-348). TransportToTransform (476-501) finds the trigger under Level/Triggers (479), falls back to Level/Dynamic (483-485), then warps the player to that trigger's position and copies its rotation when it is not identity. The lookup is by name and does nothing if the name is missing.
- Signage. BigMapLocationNameDrawer creates one TextMesh per MapTeleportor on the world map (37-43), placed at the node position plus Vector3.up times 6, scale 3 (11-12, 43). A label is skipped when the name is banned: the global ban is on when the flag BanLocationName.All is 1 or the difficulty is Hard (101-102), and then the name is hidden unless its ShowLocationName flag is set; a per-name BanLocationName flag of 1 always hides it (113). The home base label is the player name plus the suffix 居 (48).
- Overworld readout. MainUIPanel shows a coordinate line only when the player is on the world map and the compass flag (获得罗盘) is 1 (42, 47). The player's coordinates are floored (59). The source has no minimap; the only mention is a comment that the minimap has no world-map travel button (99).

## 2. Key functions

- `MapTeleportor.OnTriggerEnter` 42-64 and `DoTransport` 121-175: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/MapTeleportor.cs`. Exit resolution, gate prompt, transition.
- `MapTeleportor.CheckCanEnterMap` 75-103: same file. Editor bypass, gate codes, skill check.
- `GameRuntimeData.GetSceneEntranceCondition` 699-717 and `SetSceneEntraceCondition` 722-725: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameSave/GameRuntimeData.cs`. Per-save override with table default.
- `helpers.GetTransportToMapValue` 26-28 and `helpers.GetMapByName` 58-66: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/LuaScripts/Jyx2Configs/MapHelper.lua`. The exit and name lookups.
- `LevelMaster.Transport(string)` 469-474 and `TransportToTransform` 476-501: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/LevelMaster.cs`. Arrival at a named trigger.
- `BigMapLocationNameDrawer.ForceRefresh` 37-48 and the ban checks 101-113: `/mnt/frankendom-donors/jynew-jynew/jyx2/Assets/Scripts/GameMaps/BigMapLocationNameDrawer.cs`.

## 3. Numbers vs mechanism

| Reusable algorithm | Game-specific constants |
|---|---|
| Zone row: exits as `trigger:zoneId` items, one gate code, tags | The table itself (85 rows); the tag names START, WORLDMAP, POINTLIGHT, NONAVAGENT |
| Gate codes: open (-1 or 0), closed (1), skill-gated (2) | Skill threshold 75 for Qinggong (MapTeleportor.cs:98), a literal in C# |
| Per-save override, falls back to the table value | Override key prefix `SceneEntraceCondition_` (GameRuntimeData.cs:709) |
| Label offset above the node | Height 6 (BigMapLocationNameDrawer.cs:11), scale 3 (12) |
| Global label ban with per-name show flags | Hard difficulty turns the global ban on (102); flags BanLocationName.All and ShowLocationName.<name> |
| Overworld readout gated by an item flag | Compass flag 获得罗盘 (MainUIPanel.cs:42) |
| Exits are looked up by name; a missing name yields nil or null | None |

## 4. TypeScript sketch

simplified: keeps the donor's gate order (the world map is always open, then the save override, then the table default, then the skill gate for any party member at the threshold) and the label rule (global ban unless shown, then the per-name ban). It omits the editor bypass, the scene file and music fields, the Leave2 specifics, the TextMesh and prefab placement, the NONAVAGENT movement, the compass readout, and the spawn-trigger choice in DoTransport. It changes three things on purpose: exits are split per item and indexed once at load (no substring match), an unknown zone fails closed (the donor returns -1, which callers treat as open), and the threshold 75 is a parameter. The donor's null check comes after the index; here the lookup returns null and the caller must test it before use.

```ts
// clean-room sketch from the described mechanism (donor licence: restricted; shape only, no lines copied).
export {};

type Gate = -1 | 0 | 1 | 2; // -1 and 0 open; 1 closed; 2 needs a party member at the skill threshold

interface ZoneRow {
  id: number;
  name: string;
  exits: string;   // "trigger:zoneId,trigger:zoneId"
  enterGate: Gate; // table default for a new save
  isWorld: boolean;
}

interface SaveState {
  gateOverride: Map<number, Gate>; // per-save unlock; falls back to the table default
  flags: Record<string, number>;   // story and debug flags, default 0
}

interface Party {
  qinggong: number[];
}

const SKILL_THRESHOLD = 75; // donor literal; a data field in this sketch

class ZoneGraph {
  private readonly byId = new Map<number, ZoneRow>();
  private readonly exitsOf = new Map<number, Map<string, number>>();

  constructor(rows: ZoneRow[]) {
    // Exit lookup is built once at load. Each item is split on its first colon, so a trigger name only matches a whole item.
    for (const r of rows) {
      this.byId.set(r.id, r);
      const exits = new Map<string, number>();
      for (const item of r.exits.split(",")) {
        const colon = item.indexOf(":");
        if (colon <= 0) continue;
        const dest = Number(item.slice(colon + 1));
        if (Number.isInteger(dest)) exits.set(item.slice(0, colon), dest);
      }
      this.exitsOf.set(r.id, exits);
    }
  }

  // Trigger name to destination zone id, or null. The caller must check for null before using it.
  destination(fromId: number, trigger: string): number | null {
    return this.exitsOf.get(fromId)?.get(trigger) ?? null;
  }

  canEnter(zoneId: number, save: SaveState, party: Party): boolean {
    const zone = this.byId.get(zoneId);
    if (!zone) return false; // fail closed for an unknown zone
    if (zone.isWorld) return true;
    const gate = save.gateOverride.get(zoneId) ?? zone.enterGate;
    if (gate === -1 || gate === 0) return true;
    if (gate === 2) return party.qinggong.some((q) => q >= SKILL_THRESHOLD);
    return false;
  }

  // Signage: a label shows unless the name is banned, or the global ban is on and the name is not explicitly shown.
  labelVisible(zoneId: number, save: SaveState, banAllNames: boolean): boolean {
    const zone = this.byId.get(zoneId);
    if (!zone) return false;
    if (banAllNames && (save.flags[`ShowLocationName.${zone.name}`] ?? 0) === 0) return false;
    if ((save.flags[`BanLocationName.${zone.name}`] ?? 0) === 1) return false;
    return true;
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS, exit 0 (file `/tmp/cm016-jynew-zonegraph.ts`; local copy in `work/jynew-zonegraph.ts`).

## 5. Lands in

- TARGET `origins/zones/zone-graph.ts` (new, proposed; does not exist yet): the zone table, exit lookup, save gate override and label visibility as data on the one runtime. The gate check itself belongs to the server path.
- Parity-checklist row 23 (zone population, zones as data). Row 23 is the nearest row; the HUD readout would be row 14 and was not chosen.
- Reuse tag: rewrite-from-idea (restricted donor; clean-room, shape only)
- Brief rule served: zones are data on one runtime; one ledger (the save override is a field of the character save, not a separate store). Server-verified: the gate is checked on the server.

## 6. Gaps and risks

- Licence: the top-level LICENSE forbids use of code and resources without authorization, and the code headers say MIT. Unresolved, so clean-room only. No line is translated.
- The gate is client-side. CheckCanEnterMap runs in the Unity client (MapTeleportor.cs:75-103) and the override is in a client key-value store (GameRuntimeData.cs:709-725). Frankendom must check the gate on the server; the donor shape does not transfer as trust.
- Defects (keep the idea, fix each):
  - D1: the exit lookup is a pattern match on the whole exit string, not anchored to one item (MapHelper.lua:27). fix: split on commas and match whole trigger names (sketch does this).
  - D2: the lookup can return nil and the caller indexes the table before the null check (MapTeleportor.cs:138 before 141). fix: return null from the lookup and test it before use.
  - D3: a missing map returns -1, which the callers treat as open (GameRuntimeData.cs:702; MapTeleportor.cs:84-92). fix: fail closed (sketch does this).
  - D4: the skill threshold 75 is a literal in C# (MapTeleportor.cs:98). fix: a per-zone data field.
  - D5: gate code 2 is used by none of the 85 shipped rows, so that branch is dead in this data. fix: keep it and test it, or drop it.
  - D6: the name lookup walks the whole Map table on every call (MapHelper.lua:58-66). fix: build the name index once at load.
  - D7: the editor build always returns open (MapTeleportor.cs:77-79), so editor play does not test the gates. fix: a named test flag instead of the editor define.
- A locked exit shows no prompt at all (MapTeleportor.cs:107-110). Frankendom should decide whether a locked zone shows a "locked" state; the donor shows nothing.
- Not covered: town layout, road and building grammar, service placement, the shop table, and the Lua that sets the gate override.

Reuse tag: rewrite-from-idea (restricted donor; clean-room, shape only)
Brief rule served: 1 (one engine, zones as data); server-verified entry (gate on the server); one ledger (the override is on the character save)
