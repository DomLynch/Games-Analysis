// clean-room sketch of a layered minimap: dirty-cell set with a one-half full-rebuild rule, per-cell layer tag, fog memory from the youngest record (shape only, GPL-2.0-or-later donor)
type Vis = "hidden" | "fog" | "seen";
type Obj = "none" | "tree" | "granite" | "building" | "road";
type Layer = "hidden" | "terrain" | "player" | "building" | "road";
type Toggle = "territory" | "houses" | "roads";

interface Rec { obj: Obj; owner: number; time: number } // what a viewer last saw on a cell
interface Ally { rec: Rec; inFog: boolean }
interface Cell {
  vis: Vis;            // local viewer visibility
  own: Rec;            // local viewer's record
  allies: Ally[];      // allied viewers' records, used only with team view
  roadAt: boolean;     // a visible road leaves this cell
  t1: number;          // terrain colour, triangle 0 (0xRRGGBB)
  t2: number;          // terrain colour, triangle 1 (0xRRGGBB)
  shade: number;       // offset added to each channel before the 0x40 bias
  layer: Layer;        // layer tag from the last paint
}
interface Ctx {
  teamView: boolean;
  toggles: Record<Toggle, boolean>;
  playerRgb: (owner: number) => number;
}

const TREE = 0x003c14;
const GRANITE = 0xa2a2a2;
const BUILDING = 0xffffff;
const ROAD = 0xaaaaaa;

// The local record, replaced by an allied fog record that is younger (mirrors the youngest-node lookup).
function youngest(c: Cell, ctx: Ctx): Rec {
  let best = c.own;
  if (ctx.teamView) {
    for (const a of c.allies) {
      if (a.inFog && a.rec.time > best.time) best = a.rec;
    }
  }
  return best;
}

function classify(c: Cell, rec: Rec): Layer {
  if (rec.obj === "tree" || rec.obj === "granite") return rec.owner ? "player" : "terrain";
  if (rec.owner) {
    if (rec.obj === "building") return "building";
    if (c.roadAt) return "road";
    return "player";
  }
  return "terrain";
}

function shade(rgb: number, s: number): number {
  const ch = (v: number): number => Math.min(255, Math.max(0, v + s - 0x40));
  return (ch((rgb >> 16) & 0xff) << 16) | (ch((rgb >> 8) & 0xff) << 8) | ch(rgb & 0xff);
}

function mix(a: number, b: number): number {
  const avg = (s: number): number => (((a >> s) & 0xff) + ((b >> s) & 0xff)) >> 1;
  return (avg(16) << 16) | (avg(8) << 8) | avg(0);
}

function halve(rgb: number): number {
  return (((rgb >> 16) & 0xff) >> 1) << 16 | ((((rgb >> 8) & 0xff) >> 1) << 8) | (((rgb & 0xff)) >> 1);
}

function rgbOf(c: Cell, rec: Rec, layer: Layer, ctx: Ctx, triangle: 0 | 1): number {
  if (layer === "building" && ctx.toggles.houses) return BUILDING;
  if (layer === "road" && ctx.toggles.roads) return ROAD;
  let rgb = rec.obj === "tree" ? TREE : rec.obj === "granite" ? GRANITE : shade(triangle === 0 ? c.t1 : c.t2, c.shade);
  if (rec.owner && ctx.toggles.territory) rgb = mix(rgb, ctx.playerRgb(rec.owner));
  return rgb;
}

function cellColour(c: Cell, ctx: Ctx, triangle: 0 | 1): { layer: Layer; rgb: number } {
  if (c.vis === "hidden") return { layer: "hidden", rgb: 0x000000 };
  const fog = c.vis === "fog";
  const rec = fog ? youngest(c, ctx) : c.own;
  const layer = classify(c, rec);
  const rgb = rgbOf(c, rec, layer, ctx, triangle);
  return { layer, rgb: fog ? halve(rgb) : rgb };
}

class MiniMap {
  private dirty = new Set<number>();
  constructor(
    private readonly w: number,
    private readonly cells: Cell[],
    private readonly out: Uint32Array, // 2 columns per cell
  ) {}

  markDirty(i: number): void {
    this.dirty.add(i);
  }

  // Two columns per cell; odd rows are shifted by one column.
  private px(i: number, t: 0 | 1): number {
    const x = i % this.w;
    const y = Math.floor(i / this.w);
    return y * (2 * this.w) + ((x * 2 + t + (y & 1)) % (2 * this.w));
  }

  private paint(i: number, ctx: Ctx): void {
    const c = this.cells[i];
    for (const t of [0, 1] as const) {
      const { layer, rgb } = cellColour(c, ctx, t);
      c.layer = layer;
      this.out[this.px(i, t)] = rgb | 0xff000000;
    }
  }

  // Called once per draw: rebuild everything when the dirty set reaches half the map, else repaint dirty cells only.
  flush(ctx: Ctx): "none" | "partial" | "full" {
    if (this.dirty.size === 0) return "none";
    if (this.dirty.size >= Math.floor(this.cells.length / 2)) {
      for (let i = 0; i < this.cells.length; i++) this.paint(i, ctx);
      this.dirty.clear();
      return "full";
    }
    for (const i of this.dirty) this.paint(i, ctx);
    this.dirty.clear();
    return "partial";
  }

  // Flip one layer and repaint the cells it affects (and, for territory, buildings and roads that are switched off).
  toggle(which: Toggle, ctx: Ctx): void {
    ctx.toggles[which] = !ctx.toggles[which];
    const hit = (l: Layer): boolean => {
      if (which === "territory") {
        return l === "player" || (l === "building" && !ctx.toggles.houses) || (l === "road" && !ctx.toggles.roads);
      }
      return which === "houses" ? l === "building" : l === "road";
    };
    for (let i = 0; i < this.cells.length; i++) {
      if (hit(this.cells[i].layer)) this.paint(i, ctx);
    }
  }
}

export { MiniMap };
export {};
