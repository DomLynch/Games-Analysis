// Licence: Sustainable Use License 1.0 (donor LICENSE.md): restricted. CLEAN-ROOM: written from the mechanism, not a translation.
// Status chips: a chip shows only while its state is past a threshold, chips keep a fixed order,
// and each chip is good (green) or bad (red). The strip is rebuilt on state events, not every frame.

export interface PlayerStatus {
  sneaking: boolean;
  levelUpAvailable: boolean;
  addicted: boolean;
  poison: number;
  radiation: number;
}

export interface ChipRule {
  id: string;
  isBad: boolean;                      // red if true, green if false
  show: (s: PlayerStatus) => boolean;
}

export const POISON_SHOW_ABOVE = 0;     // a chip shows when poison is above this
export const RADIATION_SHOW_ABOVE = 65; // a chip shows when radiation is above this
export const SLOT_COUNT = 6;            // the donor's slot array size; five chip types exist

// Table order is the display order (the donor sorts by enum value, which is the same order).
export const CHIP_RULES: ChipRule[] = [
  { id: "addict", isBad: true, show: (s) => s.addicted },
  { id: "sneak", isBad: false, show: (s) => s.sneaking },
  { id: "level", isBad: false, show: (s) => s.levelUpAvailable },
  { id: "poisoned", isBad: true, show: (s) => s.poison > POISON_SHOW_ABOVE },
  { id: "radiated", isBad: true, show: (s) => s.radiation > RADIATION_SHOW_ABOVE },
];

export function visibleChips(s: PlayerStatus): ChipRule[] {
  return CHIP_RULES.filter((rule) => rule.show(s)).slice(0, SLOT_COUNT);
}

// Layout: chips are 130 px wide and each overlaps the one before by a 3 px connector.
// The first chip is drawn at x = 0; chip i >= 1 starts at 130 * i - 3 * (i + 1).
export const CHIP_WIDTH_PX = 130;
export const CONNECTOR_PX = 3;

export function chipX(index: number): number {
  if (index <= 0) {
    return 0;
  }
  return CHIP_WIDTH_PX * index - CONNECTOR_PX * (index + 1);
}

// Width the strip needs for n chips (the right edge of the last chip).
export function stripWidth(n: number): number {
  if (n <= 0) {
    return 0;
  }
  return chipX(n - 1) + CHIP_WIDTH_PX;
}

export {};
