# amilich-isometric-city (anticheat-validation, cell 3)

Donor: `/mnt/frankendom-donors/amilich-isometric-city/src/context/GameContext.tsx` (`placeAtTile`, with `src/hooks/useMultiplayerSync.ts` `applyRemoteAction`) | Licence: MIT (LICENSE: "MIT License", "Copyright (c) 2025 amilich") | TypeScript (React) | symbol `placeAtTile`

Checked: The hint file `src/hooks/useCheatCodes.ts` (134 lines, read in full) is a client-side keyboard cheat: Konami code, "vinnie", "motherlode", "fund" set a trigger in local state. It has no validation, so it is not anticheat. The mechanism that matters is the remote-action path. Read: `src/lib/multiplayer/supabaseProvider.ts` (330 lines, read in full); `src/hooks/useMultiplayerSync.ts` (`applyRemoteAction` 92-166; throttle 272-296); `src/context/GameContext.tsx` (`clamp` 110; setters 844-870; `placeAtTile` 873-972; `loadState` 1138-1150; `addMoney` 1421-1430); `src/components/Game.tsx` (cheat effect 188-220); `src/lib/multiplayer/database.ts` (size cap 48-75, read partly). Callers: `placeAtTile` is called from the remote path with `isRemote` true and from the local tool path (the local path was not traced in full). Not read: the Supabase row-level policies (no `.sql`, edge-function or config files in the repo; find returned none), `setDisastersEnabled`, and the rest of `GameContext.tsx` (1150-1420 except `addMoney`). The grep for rate limits (rateLimit, throttle, debounce, cooldown) hit seven files; I read only the multiplayer files, so "no rate limit on incoming actions" is a grep result, not a full read. Confidence: high for the receiver rule set and the absence of any server check in this repo; medium on the rate-limit claim. camera_scope: not a camera cell.

## 1. Mechanism

- Transport is peer to peer through Supabase Realtime. Each client broadcasts its own actions to every peer (`dispatchAction`, supabaseProvider.ts): the sender stamps `playerId` on the action (line 239) and sends it. No server runs game logic.
- Persistence: any client writes the full city to the room row. Saves are throttled to one per 3 s (`STATE_SAVE_INTERVAL` 3000, supabaseProvider.ts 31 and 259; a save that comes too soon is queued). A save above 20 MB is refused (database.ts 49, 72).
- Receiver guards, in order:
  1. Broadcast payload must have `type` and `playerId`, or it is dropped with a warning (supabaseProvider.ts 194-199). Own echoes are dropped next (not counted here).
  2. `applyRemoteAction` (useMultiplayerSync.ts 101): a null action or one without a type is dropped.
  3. Each action type maps to a local setter. For `place` (107-113) the receiver sets the tool from the action, then calls `placeAtTile(x, y, true)`, then restores its own tool. `placeBatch` and `bulldoze` follow the same pattern. `setTaxRate`, `setBudget`, `setSpeed`, `setDisasters` and `createBridges` call the setters directly (135-155).
  4. `fullState` is ignored (156-158), with the comment "Blocking this prevents malicious players from overwriting game state". `tick` is a no-op (the comment says it is not yet implemented).
- The rule set for a remote `place` is the same code as local `place` (`placeAtTile`, GameContext.tsx 873-972). In order: the select tool is a no-op (880); the tile is found by `prev.grid[y]?.[x]` (884), and a missing tile is a no-op (886), so out-of-range and fractional coordinates stop here; if the tool has a cost and `prev.stats.money < cost`, it is a no-op (887); several no-ops when nothing would change (897 and the branch checks at 908, 924, 938, 958); then the money is taken and the building set. Only local actions are re-broadcast (972, `!isRemote`).
- Setter clamps: tax rate is clamped to 0-100 (849) and budget funding to 0-100 (861). The budget key is not checked (861-866). `setSpeed` stores whatever value it is given (844-846).
- Full-state sync: a joiner takes the first state-sync addressed to it (supabaseProvider.ts 212, guarded by `!isCreator` and `!hasReceivedInitialState`). `loadState` (GameContext.tsx 1138-1150) checks the shape only: a `grid` array, a numeric `gridSize`, and `stats.money` and `stats.population` present. It does not check values.
- Cheats (the hint file): the Konami code and "motherlode" each set a trigger of 50,000 (`useCheatCodes.ts` 11-101). `Game.tsx` (194-205) calls `addMoney` (GameContext.tsx 1421-1430) for those two, which changes the local money with no check. "fund" (10,000) sets a trigger, but no code handles that type (grep for `'fund'` finds only the hook), so it adds nothing and leaves the trigger set. `addMoney` has no multiplayer callback (the callbacks are used only in `placeAtTile` and `finishTrackDrag`, by grep).
- Throttles in the code read are write-rate limits, not anti-abuse: 3 s for database saves (supabaseProvider 31, 259) and 2 s between pushes of the local state to the provider (useMultiplayerSync.ts 272-279). Nothing limits how many actions one peer may send.

## 2. Key functions

- `placeAtTile`: `/mnt/frankendom-donors/amilich-isometric-city/src/context/GameContext.tsx` 873-972. One rule set for local and remote placement: tool, bounds by lookup, affordability on the receiver's own money, no-op refusals, then the change.
- `applyRemoteAction`: `/mnt/frankendom-donors/amilich-isometric-city/src/hooks/useMultiplayerSync.ts` 101-160. Maps each remote action to a local setter; ignores `fullState`.
- `MultiplayerProvider` receive path: `/mnt/frankendom-donors/amilich-isometric-city/src/lib/multiplayer/supabaseProvider.ts` 194-215. Shape guard on the payload and the first-state-wins rule.
- `setTaxRate` and `setBudgetFunding`: `/mnt/frankendom-donors/amilich-isometric-city/src/context/GameContext.tsx` 848-866. Clamp to 0-100.

## 3. Numbers vs mechanism

| Reusable algorithm | Donor constant (value as read) |
|---|---|
| Bounds by lookup: missing tile is a refusal | rule (GameContext.tsx 884-886) |
| Affordability on the receiver's own money | rule (887) |
| Clamp a percentage setting | 0 to 100 for tax rate (849) and budget funding (861) |
| Refuse a whole-state overwrite from a peer | rule (useMultiplayerSync.ts 156-158) |
| Database save throttle | 3000 ms (supabaseProvider.ts 31) |
| State push throttle to the provider | 2000 ms (useMultiplayerSync.ts 275) |
| City save size cap | 20 MB (database.ts 49) |
| Place cost | per tool, from TOOL_INFO (not read in detail) |

## 4. TypeScript sketch

simplified: the sketch keeps the donor order for `place` (tool, bounds by lookup, affordability, no-op refusals, then the change) and the clamp for tax rate and budget funding. It adds two things the donor does not do: a budget-key check (the donor accepts any key) and an explicit refusal of `fullState` (the donor ignores it in a switch). It omits the select tool, the water, subway and terraform branches, bulldoze's zone detail, bridges and drags, the local re-broadcast (the echo rule lives in the caller, not here), the speed and disaster setters, and `loadState`. Costs are placeholders, not the donor's TOOL_INFO. Money is one number here; the donor keeps one per peer, which is the gap in section 6.

```ts
// Licence: MIT (donor amilich-isometric-city). Clean-room sketch of the shape only, written from the described mechanism.
export {};

type Tool = "road" | "house" | "park" | "bulldoze";
// Placeholder costs for the sketch. The donor's per-tool costs (TOOL_INFO) were not copied.
const COST: Record<Tool, number> = { road: 10, house: 300, park: 80, bulldoze: 0 };
const TOOLS: ReadonlySet<string> = new Set<string>(["road", "house", "park", "bulldoze"]);
const BUDGET_KEYS: ReadonlySet<string> = new Set<string>(["roads", "police", "fire", "schools"]);

interface Tile { building: Tool | "grass" }
interface World { money: number; grid: Tile[][]; taxRate: number; budget: Map<string, number> }

type Intent =
  | { kind: "place"; tool: string; x: number; y: number }
  | { kind: "setTaxRate"; rate: number }
  | { kind: "setBudget"; key: string; funding: number }
  | { kind: "fullState"; state: unknown };

type Result =
  | "applied"
  | "refused: unknown tool"
  | "refused: out of bounds"
  | "refused: cannot afford"
  | "refused: no change"
  | "refused: unknown budget key"
  | "refused: full state";

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

// One rule set for every path. Local input and remote intents both call this function;
// only the caller decides whether to echo the intent to peers (cf. placeAtTile with isRemote).
function applyIntent(w: World, i: Intent): Result {
  switch (i.kind) {
    case "place": {
      if (!TOOLS.has(i.tool)) return "refused: unknown tool";
      const tool = i.tool as Tool;
      const row = w.grid[i.y];
      const tile: Tile | undefined = row === undefined ? undefined : row[i.x];
      if (tile === undefined) return "refused: out of bounds";     // bounds by lookup
      const cost = COST[tool];
      if (cost > 0 && w.money < cost) return "refused: cannot afford"; // checked on the receiver's own money
      if (tool === "bulldoze" && tile.building === "grass") return "refused: no change";
      if (tool !== "bulldoze" && tile.building === tool) return "refused: no change";
      w.money -= cost;
      tile.building = tool === "bulldoze" ? "grass" : tool;
      return "applied";
    }
    case "setTaxRate":
      w.taxRate = clamp(i.rate, 0, 100);
      return "applied";
    case "setBudget":
      if (!BUDGET_KEYS.has(i.key)) return "refused: unknown budget key"; // the donor does not check the key
      w.budget.set(i.key, clamp(i.funding, 0, 100));
      return "applied";
    case "fullState":
      return "refused: full state"; // whole-state overwrites from a peer are never applied
  }
}
```

Typecheck: `npx -p typescript tsc --noEmit --strict --target es2020` on the VPS (/tmp/ac004-amilich-intent-gate.ts) exits 0.

## 5. Lands in

- TARGET `src/fight/intake.ts` (the same gate as cells 1 and 2: every client intent goes through one rule set before the engine). The rule set is written once and used for every intent, which is what the donor's `placeAtTile` does for local and remote placement.
- Parity-checklist row 5 (controls/input). The addendum puts input intake here. No row of 1-22 is about a shared rule set for peer messages, so row 5 is the closest; row 18 (loot and XP) and row 19 (replay) do not fit.
- Reuse tag: rewrite-from-idea (MIT; code may be adapted, but this sketch is clean-room and shape only)
- Brief rule served: server-verified kills and one engine (the client sends intent; the server's one rule set decides); one ledger (the affordability check must run on the server's money, not the sender's)

Decision (proposed): adapt. Take the single rule set for every intent (bounds by lookup, affordability on the server's ledger, no-op refusals, clamps, and whole-state messages refused) and run it on the server only. Reject the peer-to-peer broadcast and the first-state-wins sync, because Frankendom's server holds the state and clients never overwrite it.
Acceptance: a server test sends a place intent outside the grid, and one with less money than the price; both are refused with the world unchanged. A tax-rate intent of 250 is stored as 100. A `fullState` intent is refused and logged. A player sees a refused build as no change, with a short message.

## 6. Gaps and risks

- No shared ledger: money is per peer. A peer that calls `addMoney` (the cheats) changes only its own city, and each receiver checks affordability against its own money, so peers can diverge. Frankendom's one-ledger ruling rules this out; the affordability check must run once, on the server.
- No server check anywhere in the repo: no SQL policies, no edge functions, no config. Anything a client writes to the room row is trusted. Frankendom's server must be the only writer of verdicts.
- Sender identity is self-declared: the receiver trusts `playerId`, which the sender sets (supabaseProvider.ts 239). Frankendom should stamp the session's identity on the server (see cell 1).
- No rate limit on incoming actions was found (grep only). A peer can flood a receiver. Frankendom needs a per-client budget per tick (cell 1).
- Setters do not check everything: `setSpeed` stores any value (844-846) and the budget key is not checked (861-866). `loadState` checks only the shape of a joined state (1141-1147), so a joined state with absurd values is accepted.
- The cheats add money with no check (Game.tsx 195, 205), and the "fund" trigger is set but never handled. Frankendom must not have a client-side currency or kill credit.
- Nothing records a bad action (no kick, ban or flag path in the code read). Frankendom needs a strike ledger if it wants one (cell 2 pattern).
- MAX_ATTACKERS = 3 is not part of this mechanism. Pit as client: this donor has no fixed arena.
- MIT: code may be adapted. This sketch was written clean-room from the mechanism.
