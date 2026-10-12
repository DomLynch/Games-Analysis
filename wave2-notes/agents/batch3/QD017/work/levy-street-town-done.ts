// Sketch: zone "town done" completion over an authored errand list, plus the zone-entry hint precedence.
// Clean-room shape of an MIT donor (Levy Street, 2026); written from the rule, not copied.
export type QuestState = 'unavailable' | 'available' | 'active' | 'ready' | 'done';

export interface Errand {
  id: string;
  retired: boolean;
  // false when this character can never take the quest (class lock with another class).
  classOk: boolean;
  // simplified: the donor derives this from geometry (giver or turn-in NPC inside the hub circle,
  // a turn-in NPC inside the zone) and from quest fields (repeatable, suggestedPlayers, trainer, instance mob).
  // Here the zone data authors it as one flag, so the sketch carries no geometry.
  counted: boolean;
}

export interface ZoneCompletion {
  errands: Errand[];
  welcome: string;
  welcomeQuestId?: string;
  welcomeDone?: string;
}

export type EntryHint = 'welcome' | 'town_done';

// True once every counted, reachable errand is done. A zone with no counted errands is never complete.
export function townComplete(z: ZoneCompletion, state: (id: string) => QuestState): boolean {
  let counted = 0;
  for (const e of z.errands) {
    if (!e.counted) continue;
    if (e.retired || !e.classOk) continue;
    counted++;
    if (state(e.id) !== 'done') return false;
  }
  return counted > 0;
}

// town_done replaces welcome once the town is complete (zones without welcomeDone never show it).
// welcome is silent while its welcome quest is not available (the donor's zoneWelcomeText rule).
// simplified: the donor returns the welcome text object itself; this sketch returns only the hint kind.
export function entryHint(z: ZoneCompletion, state: (id: string) => QuestState): EntryHint | null {
  if (z.welcomeDone !== undefined && townComplete(z, state)) return 'town_done';
  if (z.welcomeQuestId !== undefined && state(z.welcomeQuestId) !== 'available') return null;
  return 'welcome';
}

export {};
