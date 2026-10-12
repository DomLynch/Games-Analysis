// Licence: GPL-3.0 (donor ModernUO, LICENSE). Clean-room sketch of the mechanism; no donor lines copied.
// Target (proposed): src/fight/quest.ts. Quests are data rows; the server runs this on each kill, hand-in and tick.

export {};

type Mode = "all" | "any";

interface ObjectiveDef {
  kind: "kill" | "deliver";
  target: string;        // kill: creature type; deliver: item type
  need: number;          // count to finish
  durationMs?: number;   // undefined = untimed
  area?: string;         // kill: optional zone id (zone data)
  dest?: string;         // deliver: npc id that takes the item
}

interface QuestDef {
  id: string;
  giver: string;         // npc id that offers it
  mode: Mode;            // all objectives, or any one
  objectives: ObjectiveDef[];
  oneTimeOnly: boolean;
  restartMs: number;     // 0 = none; else re-offer delay after completion
  needsReport: boolean;  // true = the player must return to the giver before the reward is claimable
  chainTriggered: boolean;
  next?: string;         // quest offered after this one is claimed
}

interface ObjState { def: ObjectiveDef; have: number; endsAt: number | null; expired: boolean; done: boolean; }
interface Instance { quest: QuestDef; objs: ObjState[]; complete: boolean; claimable: boolean; failed: boolean; }
interface Player { active: Instance[]; done: Map<string, number>; chainOffers: Set<string>; }

const MAX_ACTIVE = 10; // donor: MaxConcurrentQuests

export function accept(q: QuestDef, pl: Player, now: number): Instance {
  const inst: Instance = {
    quest: q,
    complete: false,
    claimable: false,
    failed: false,
    objs: q.objectives.map(d => ({
      def: d,
      have: 0,
      endsAt: d.durationMs === undefined ? null : now + d.durationMs,
      expired: false,
      done: false,
    })),
  };
  pl.active.push(inst);
  return inst;
}

export function canOffer(q: QuestDef, pl: Player, defs: Map<string, QuestDef>, now: number): boolean {
  if (pl.active.length >= MAX_ACTIVE) return false;
  const seen = new Set<string>(); // fix: cycle guard; the donor walks NextQuest with no visited set
  let cur: QuestDef | undefined = q;
  while (cur !== undefined && !seen.has(cur.id)) {
    seen.add(cur.id);
    const avail = pl.done.get(cur.id);
    if (avail !== undefined) {
      if (cur.oneTimeOnly) return false;
      if (avail > now) return false;
    }
    cur = cur.next === undefined ? undefined : defs.get(cur.next);
  }
  return true;
}

// Ends the quest when the player cannot finish it (all-mode with one expired objective, or nothing left).
function refresh(pl: Player, inst: Instance, now: number): void {
  inst.complete = inst.quest.mode === "all" ? inst.objs.every(o => o.done) : inst.objs.some(o => o.done);
  const hasDeliver = inst.objs.some(o => o.def.kind === "deliver");
  if (inst.complete && !inst.quest.needsReport && !hasDeliver) reportBack(pl, inst, now);
}

// Timed objectives expire; all-mode fails on any expiry; the quest fails when nothing is left to do.
export function slice(pl: Player, now: number): void {
  for (const inst of pl.active) {
    if (inst.claimable || inst.failed) continue;
    let anyFail = false;
    let anyLeft = false;
    for (const o of inst.objs) {
      if (o.expired) continue;
      if (o.endsAt !== null && o.endsAt <= now) {
        o.expired = true;
        anyFail = true;
      } else {
        anyLeft = true;
      }
    }
    if ((inst.quest.mode === "all" && anyFail) || !anyLeft) inst.failed = true;
  }
}

// A kill counts for the first live kill objective that matches; one objective per quest per kill.
export function onKill(pl: Player, creature: string, inArea: (zone: string) => boolean, now: number): void {
  for (const inst of pl.active) {
    if (inst.claimable || inst.failed) continue;
    for (const o of inst.objs) {
      if (o.expired || o.def.kind !== "kill" || o.def.target !== creature) continue;
      if (o.def.area !== undefined && !inArea(o.def.area)) continue;
      o.have++;
      if (o.have >= o.def.need) o.done = true;
      break;
    }
    refresh(pl, inst, now);
  }
}

// The player's turn-in to a quester. Marks deliveries done; the reward still waits for the claim.
export function handIn(pl: Player, npcId: string, now: number): Instance | undefined {
  let found: Instance | undefined;
  for (const inst of pl.active) {
    for (const o of inst.objs) {
      if (!o.expired && o.def.kind === "deliver" && o.def.dest === npcId) {
        if (!o.done) {
          o.done = true;
          refresh(pl, inst, now);
        }
        found ??= inst;
        break;
      }
    }
  }
  return found;
}

// Player confirms at the giver. Records the restart time at this point, as the donor does.
export function reportBack(pl: Player, inst: Instance, now: number): boolean {
  if (!inst.complete || inst.failed) return false;
  inst.claimable = true;
  if (inst.quest.restartMs > 0) pl.done.set(inst.quest.id, now + inst.quest.restartMs);
  return true;
}

// Reward claim. If the backpack cannot take the reward, nothing changes and the claim can be retried.
export function claim(pl: Player, inst: Instance, fits: boolean): boolean {
  if (!inst.claimable || inst.failed || !fits) return false;
  if (inst.quest.oneTimeOnly && inst.quest.restartMs === 0) pl.done.set(inst.quest.id, Number.POSITIVE_INFINITY);
  if (inst.quest.chainTriggered) pl.chainOffers.delete(inst.quest.id);
  if (inst.quest.next !== undefined) pl.chainOffers.add(inst.quest.next);
  pl.active = pl.active.filter(i => i !== inst);
  return true;
}

export function cancel(pl: Player, inst: Instance): void {
  pl.active = pl.active.filter(i => i !== inst); // deliver-item removal not modelled here
}

export type Dialogue =
  | { state: "none" }
  | { state: "offer"; quest: QuestDef }
  | { state: "progress"; inst: Instance }
  | { state: "report"; inst: Instance }
  | { state: "reward"; inst: Instance };

// Giver double-click: the first rule that matches wins.
// 1 in-progress with this giver, 2 hand-ins, 3 chain offers, 4 a random eligible starter.
export function dialogue(
  npcId: string,
  npcQuests: QuestDef[],
  pl: Player,
  defs: Map<string, QuestDef>,
  now: number,
  pick: <T>(xs: T[]) => T,
): Dialogue {
  let inst: Instance | undefined = pl.active.find(i => i.quest.giver === npcId);
  if (inst === undefined) inst = handIn(pl, npcId, now);
  if (inst !== undefined) {
    if (inst.failed) return { state: "none" };
    if (inst.claimable) return { state: "reward", inst };
    if (inst.complete) return { state: "report", inst };
    return { state: "progress", inst };
  }
  const busy = (q: QuestDef): boolean => pl.active.some(i => i.quest.id === q.id);
  let quest: QuestDef | undefined = npcQuests.find(q => q.chainTriggered && pl.chainOffers.has(q.id));
  if (quest === undefined) {
    const eligible = npcQuests.filter(q => !q.chainTriggered && !busy(q) && canOffer(q, pl, defs, now));
    if (eligible.length > 0) quest = pick(eligible);
    else quest = npcQuests.find(q => !q.chainTriggered && !busy(q));
  }
  if (quest === undefined) return { state: "none" };
  return canOffer(quest, pl, defs, now) ? { state: "offer", quest } : { state: "none" };
}
