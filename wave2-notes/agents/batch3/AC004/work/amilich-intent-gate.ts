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
