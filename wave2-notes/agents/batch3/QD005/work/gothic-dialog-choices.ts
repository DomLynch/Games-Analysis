// Licence: MIT (donor OpenGothic, LICENSE "MIT License", Copyright (c) 2019 Try). Shape adapted; written fresh for Frankendom.
export interface Topic {
  id: number;                       // main function id (donor: info.information)
  npc: number;                      // owner npc id (donor: info.npc)
  important: boolean;               // donor: info.important
  permanent: boolean;               // donor: info.permanent (repeatable)
  nr: number;                       // sort key (donor: info.nr)
  title: string;                    // donor: info.description; empty = auto-run
  condition?: (self: number, other: number) => boolean; // donor: condition fn; missing = valid
  subChoices: { id: number; text: string }[];           // donor: info.choices
}

export interface DialogState {
  known: Set<string>;               // "player:topic" pairs (donor: dlgKnownInfos)
  except: number[];                 // main ids entered in this conversation (donor: except)
  usedSub: Set<string>;             // "player:topic:sub" pairs used (donor erases from the shared list)
}

export interface Pick { fn: number; title: string; sort: number; }

function sortPicks(a: Pick[]): Pick[] {
  return a.sort((l, r) => (l.sort - r.sort) || (l.fn - r.fn));
}

// Tier 1 (important) first when asked, then tier 0; the first tier with any valid topic wins.
export function dialogChoices(s: DialogState, npc: number, player: number, topics: Topic[], includeImportant: boolean): Pick[] {
  const tiers: number[] = includeImportant ? [1, 0] : [0];
  for (const tier of tiers) {
    const out: Pick[] = [];
    for (const t of topics) {
      if (t.npc !== npc || Number(t.important) !== tier) continue;
      const known = s.known.has(`${player}:${t.id}`);
      if (known && !t.permanent) continue;                       // heard once, never again
      if (t.important && t.permanent && s.except.includes(t.id)) continue; // no repeat inside one talk
      const valid = t.condition ? t.condition(npc, player) : true;
      if (!valid) continue;
      out.push({ fn: t.id, title: t.title, sort: t.nr });
    }
    if (out.length > 0) return sortPicks(out);
  }
  return [];
}

// Sub-choices of the selected topic, minus the ones this player already used.
export function subChoices(s: DialogState, player: number, t: Topic): Pick[] {
  const out: Pick[] = t.subChoices
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => !s.usedSub.has(`${player}:${t.id}:${c.id}`))
    .map(({ c, i }) => ({ fn: c.id, title: c.text, sort: i }));
  return sortPicks(out);
}

// Entering a topic records it; a main entry marks the topic known, a sub-choice marks only the sub-choice used.
export function exec(s: DialogState, player: number, t: Topic, fn: number, run: (fn: number) => void): void {
  if (fn === t.id) {
    s.known.add(`${player}:${t.id}`);
    s.except.push(t.id);
  } else {
    s.usedSub.add(`${player}:${t.id}:${fn}`);
  }
  run(fn);
}

export {};
