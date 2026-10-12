// Kill-count quest gate keyed on (zone, enemy type), modelled on Angband quest_check.
type Pos = { x: number; y: number };

export interface QuestDef {
  name: string;
  zone: number;      // zone level the quest counts in (data)
  race: string;      // enemy type id (data)
  number: number;    // kills needed (data); must be >= 1
}

export interface QuestState extends QuestDef {
  cur: number;       // kills so far
  open: boolean;     // false once completed
}

export interface KillOutcome {
  completed: boolean;      // at least one quest completed on this kill
  unlockAt?: Pos;          // where the gate appears (the death tile)
  wonAll: boolean;         // every quest is now closed
}

export function newQuestState(defs: QuestDef[]): QuestState[] {
  return defs.map((d) => ({ ...d, cur: 0, open: true }));
}

// Called once per server-verified enemy death, after drops are rolled.
export function questCheck(
  quests: QuestState[],
  zone: number,
  race: string,
  deathTile: Pos,
): KillOutcome {
  let completed = false;
  for (const q of quests) {
    // simplified: donor relies on level 0 never matching a dungeon depth;
    // this sketch adds an explicit open check so a closed quest cannot be counted again.
    if (q.open && q.zone === zone && q.race === race) {
      q.cur += 1;
      if (q.cur === q.number) {
        q.open = false;
        completed = true;
      }
    }
  }
  const stillOpen = quests.filter((q) => q.open).length;
  return {
    completed,
    unlockAt: completed ? deathTile : undefined,
    wonAll: quests.length > 0 && stillOpen === 0,
  };
}

export {};
