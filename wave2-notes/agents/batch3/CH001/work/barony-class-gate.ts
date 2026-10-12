// Licence: BSD-2-Clause (donor). Clean-room sketch of the mechanism; no donor lines or donor data copied.
// clean-room
type Verdict = "ok" | "missing-pack" | "missing-unlock" | "unknown-class" | "unknown-race";

interface ClassRule {
  tier: "base" | "specialist";
  pack?: string;                     // content pack that must be owned (undefined = free)
  nativeRace?: string;               // the race that owns this class outright
}

interface RaceRule {
  pack?: string;
  isHuman: boolean;
}

interface Draft {
  race: string;
  look: 0 | 1;                       // cosmetic only: this sketch never reads it
  cls: string;
}

interface Context {
  packs: Set<string>;                // packs the player owns
  unlockedRaces: Set<string>;        // races whose unlock achievement is earned
  challengeOverride: boolean;        // challenge runs skip pack checks (donor: per class and per race)
}

// Order: pack ownership first, then human, then base classes, then the specialist rule.
// The look is not in the gate. In the donor a non-human race with look 1 returns valid for any class
// before the class rule runs; this sketch removes that bypass.
function validate(
  draft: Draft,
  classes: Map<string, ClassRule>,
  races: Map<string, RaceRule>,
  ctx: Context,
): Verdict {
  const cls = classes.get(draft.cls);
  if (cls === undefined) return "unknown-class";
  const race = races.get(draft.race);
  if (race === undefined) return "unknown-race";

  if (!ctx.challengeOverride) {
    if (cls.pack !== undefined && !ctx.packs.has(cls.pack)) return "missing-pack";
    if (race.pack !== undefined && !ctx.packs.has(race.pack)) return "missing-pack";
  }
  if (race.isHuman) return "ok";
  if (cls.tier === "base") return "ok";
  if (cls.nativeRace === draft.race) return "ok";
  if (cls.nativeRace !== undefined && ctx.unlockedRaces.has(cls.nativeRace)) return "ok";
  return "missing-unlock";
}

// Fallback used by the donor after a race or look change: an invalid class becomes the race's own
// class (the donor computes it as a base index plus the race index; this sketch takes it from data).
function fallbackClass(race: string, ownClassOf: Map<string, string>): string | undefined {
  return ownClassOf.get(race);
}

export {};
