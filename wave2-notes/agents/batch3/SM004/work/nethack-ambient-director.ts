// Licence: NGPL (NetHack General Public License, GPL family: treated as copyleft). Clean-room shape only: written from the described steps. No donor text is used; the LINE strings are placeholders.
export type Feature =
  | 'fountain' | 'sink' | 'court' | 'swamp' | 'vault' | 'beehive'
  | 'morgue' | 'barracks' | 'zoo' | 'shop' | 'temple' | 'oracle';

// Order is priority: features are tried in this order, and the first exclusive cue to fire ends the tick.
const ORDER: readonly Feature[] = [
  'fountain', 'sink', 'court', 'swamp', 'vault', 'beehive',
  'morgue', 'barracks', 'zoo', 'shop', 'temple', 'oracle',
];

const EXCLUSIVE: ReadonlySet<Feature> = new Set<Feature>([
  'court', 'swamp', 'vault', 'beehive', 'morgue', 'barracks', 'zoo', 'shop', 'temple', 'oracle',
]);

// These need a creature (a witness) in the zone before they can speak. Fountain, sink, swamp, vault and shop need none
// (donor: shop has no monster witness; after a successful roll it always ends the tick. The caller leaves 'shop' out of
// `present` when the shop is untended or the hero is inside it, which the donor checks before it plays the line).
const NEEDS_WITNESS: ReadonlySet<Feature> = new Set<Feature>([
  'court', 'beehive', 'morgue', 'barracks', 'zoo', 'temple', 'oracle',
]);

// Chance per fixed tick, by feature. Zone data may override each one.
export const DEFAULT_CHANCE: Record<Feature, number> = {
  fountain: 1 / 400, sink: 1 / 300, court: 1 / 200, swamp: 1 / 200, vault: 1 / 200, beehive: 1 / 200,
  morgue: 1 / 200, barracks: 1 / 200, zoo: 1 / 200, shop: 1 / 200, temple: 1 / 200, oracle: 1 / 400,
};

// Placeholder lines only. Normal and altered (for example, stunned or blinded) sets.
const LINE: Record<Feature, { normal: string; altered: string }> = {
  fountain: { normal: '[fountain line A]', altered: '[fountain line B]' },
  sink: { normal: '[sink line A]', altered: '[sink line B]' },
  court: { normal: '[court line A]', altered: '[court line B]' },
  swamp: { normal: '[swamp line A]', altered: '[swamp line B]' },
  vault: { normal: '[vault line A]', altered: '[vault line B]' },
  beehive: { normal: '[beehive line A]', altered: '[beehive line B]' },
  morgue: { normal: '[morgue line A]', altered: '[morgue line B]' },
  barracks: { normal: '[barracks line A]', altered: '[barracks line B]' },
  zoo: { normal: '[zoo line A]', altered: '[zoo line B]' },
  shop: { normal: '[shop line A]', altered: '[shop line B]' },
  temple: { normal: '[temple line A]', altered: '[temple line B]' },
  oracle: { normal: '[oracle line A]', altered: '[oracle line B]' },
};

export interface Witness {
  feature: Feature;   // the feature the creature stands in
  eligible: boolean;  // computed by the caller (court: asleep, lord or prince, not an animal; beehive: flying ant; temple: active priest and hero outside the temple; and so on)
}

export interface TickInput {
  rng: () => number;                          // returns a value in [0, 1)
  muted: boolean;                             // cues switched off, or the listener cannot hear
  altered: boolean;                           // use the altered line set
  witnesses: readonly Witness[];              // creatures currently in the zone
  chance?: Partial<Record<Feature, number>>;  // zone data override
}

export interface AmbientCue { feature: Feature; line: string; }

// One fixed tick. `present` is the zone's feature set (zone data).
export function ambientTick(present: ReadonlySet<Feature>, input: TickInput): AmbientCue[] {
  if (input.muted) return [];                 // gate first: no roll is spent
  const out: AmbientCue[] = [];
  for (const f of ORDER) {
    if (!present.has(f)) continue;            // no roll for a feature the zone does not have
    const p = input.chance?.[f] ?? DEFAULT_CHANCE[f];
    if (input.rng() >= p) continue;           // roll failed
    if (NEEDS_WITNESS.has(f) && !input.witnesses.some((w) => w.feature === f && w.eligible)) continue; // no witness: the roll does not end the tick
    out.push({ feature: f, line: input.altered ? LINE[f].altered : LINE[f].normal });
    if (EXCLUSIVE.has(f)) break;              // first exclusive cue ends the tick
  }
  return out;
}
