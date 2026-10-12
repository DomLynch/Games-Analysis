// Licence: GPL-2.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Race = "blood" | "venom" | "ink" | "undead" | "fire" | "energy" | "none";
type Fluid = "blood" | "slime" | "ink";
type DamageKind = "physical" | "other";

interface HitFx {
  effect: string;      // donor enum name for the hit effect (CONST_ME_*), shown to spectators
  colour: string;      // donor text colour name (TEXTCOLOR_*)
  splash: Fluid | null; // floor splash, only for physical hits
}

// Data table, one row per race. Pure lookup: it returns what to show and places nothing.
const HIT_FX: Record<Race, HitFx> = {
  blood:  { effect: "CONST_ME_DRAWBLOOD",  colour: "TEXTCOLOR_RED",          splash: "blood" },
  venom:  { effect: "CONST_ME_HITBYPOISON", colour: "TEXTCOLOR_LIGHTGREEN",  splash: "slime" },
  ink:    { effect: "CONST_ME_DRAWINK",     colour: "TEXTCOLOR_DARKGREY",    splash: "ink" },
  undead: { effect: "CONST_ME_HITAREA",     colour: "TEXTCOLOR_LIGHTGREY",   splash: null },
  fire:   { effect: "CONST_ME_DRAWBLOOD",   colour: "TEXTCOLOR_ORANGE",      splash: null },
  energy: { effect: "CONST_ME_ENERGYHIT",   colour: "TEXTCOLOR_ELECTRICPURPLE", splash: null },
  none:   { effect: "CONST_ME_NONE",        colour: "TEXTCOLOR_NONE",        splash: null },
};

// Decal lifetimes are data: seconds per stage, removed after the last stage.
const SMALL_SPLASH_STAGES_S = [45, 45, 60];   // donor items.xml 1760, 1764, 1768
const FULL_SPLASH_STAGES_S = [45, 45, 600];   // donor items.xml 1748, 1752, 1756

interface Decal {
  fluid: Fluid;
  stages: number[];   // seconds per stage, remaining stages only
  msLeft: number;     // time left in the current stage
}

class Floor {
  private decals = new Map<string, Decal>(); // one decal per tile key

  // Replaces any decal already on the tile. A safe zone gets no floor decal.
  place(tile: string, fluid: Fluid, stages: number[], safe: boolean): void {
    if (safe) return;
    this.decals.set(tile, { fluid, stages: stages.slice(1), msLeft: stages[0] * 1000 });
  }

  // Delta-time update. Donor uses a 4-bucket wheel with a 250 ms tick; here a plain dt is used.
  tick(dtMs: number): void {
    for (const [tile, d] of this.decals) {
      d.msLeft -= dtMs;
      while (d.msLeft <= 0) {
        if (d.stages.length === 0) { this.decals.delete(tile); break; }
        d.msLeft += d.stages.shift()! * 1000;
      }
    }
  }

  count(): number { return this.decals.size; }
}

interface HitInput {
  race: Race;
  kind: DamageKind;
  raw: number;          // damage before clamping
  hp: number;           // target health before the hit
  lethalVeto: boolean;  // a prepare-death rule refused the death
  safe: boolean;        // tile is a safe zone
  tile: string;
}

interface HitOutcome { drained: number; fx: HitFx | null; vetoed: boolean; }

// Order: clamp to remaining health, then the veto check, then visuals, then the drain.
// Donor order differs: it shows the effect and places the splash before the veto and the drain.
function resolveHit(p: HitInput, floor: Floor): HitOutcome {
  const dmg = Math.min(Math.max(p.raw, 0), p.hp);
  if (dmg === 0) return { drained: 0, fx: null, vetoed: false };
  if (dmg >= p.hp && p.lethalVeto) return { drained: 0, fx: null, vetoed: true };

  const fx = HIT_FX[p.race];
  if (p.kind === "physical" && fx.splash !== null) {
    floor.place(p.tile, fx.splash, SMALL_SPLASH_STAGES_S, p.safe);
  }
  return { drained: dmg, fx, vetoed: false };
}

// Death: one rule for the safe zone, applied to the death splash too (donor death path skips it).
function onDeath(race: Race, tile: string, safe: boolean, floor: Floor): void {
  if (race === "blood") floor.place(tile, "blood", FULL_SPLASH_STAGES_S, safe);
  if (race === "ink") floor.place(tile, "ink", FULL_SPLASH_STAGES_S, safe);
}

export {};
