// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type Obj = {
  id: number;
  targetId: number;      // creature entry this objective counts
  amount: number;        // count required (data)
  optional: boolean;
  sequenced: boolean;    // counts only after the previous objective is done
  progress: number;
};

type Quest = {
  id: number;
  objectives: Obj[];
  complete: boolean;
  noProxyCredit: boolean; // quest flag: proxy credit (no real victim) is ignored
};

type KillEvent = {
  creatureEntry: number;
  killCredit: number[];   // proxy entries on the creature template (at most 2)
  victimId: string | null; // null for proxy credit
};

// One index for all active quests: target id -> every objective that counts it.
const index = new Map<number, Array<{ quest: Quest; obj: Obj }>>();

function acceptQuest(q: Quest): void {
  for (const obj of q.objectives) {
    const list = index.get(obj.targetId) ?? [];
    list.push({ quest: q, obj });
    index.set(obj.targetId, list);
  }
}

// donor IsQuestObjectiveCompletable (17117-17155), without the progress-bar delegation:
// walk back to the nearest earlier sequenced objective; the objectives in between must be complete or optional.
function sequenceOpen(q: Quest, obj: Obj): boolean {
  const i = q.objectives.indexOf(obj);
  if (i === 0) return true;
  let between = true;                 // everything between obj and the earlier sequenced one is complete or optional
  let prevSeq = -1;
  for (let p = i - 1; p >= 0; p--) {
    const po = q.objectives[p];
    if (po.sequenced) { prevSeq = p; break; }
    if (between) between = po.optional || po.progress >= po.amount;
  }
  const prevDone = prevSeq !== -1 && q.objectives[prevSeq].progress >= q.objectives[prevSeq].amount;
  if (obj.sequenced) {
    if (prevSeq === -1) return between;
    return prevDone && between;
  }
  // a non-sequenced objective after an incomplete sequenced one needs that sequenced objective to be completable itself
  if (prevSeq !== -1 && !prevDone) return sequenceOpen(q, q.objectives[prevSeq]);
  return true;
}

function questCanComplete(q: Quest, ignoredObjId: number): boolean {
  if (q.complete) return false;       // donor: status must be INCOMPLETE (14536)
  return q.objectives.every(o => o.id === ignoredObjId || o.optional || o.progress >= o.amount);
}

function report(_q: Quest, _o: Obj): void {
  // client progress message would go here
}

function creditObjective(targetId: number, add: number, victimId: string | null): void {
  for (const { quest, obj } of index.get(targetId) ?? []) {
    if (!sequenceOpen(quest, obj)) continue;                // donor 16751 first
    if (quest.noProxyCredit && victimId === null) continue; // then the proxy rule, 16754
    const wasDone = obj.progress >= obj.amount;
    if (wasDone && add >= 0) continue;                      // a finished objective takes no more credit
    obj.progress = Math.min(Math.max(obj.progress + add, 0), obj.amount); // clamp to [0, amount]
    report(quest, obj);
    if (obj.progress >= obj.amount) {
      if (questCanComplete(quest, obj.id)) quest.complete = true;
    } else if (quest.complete && !obj.optional) {
      quest.complete = false;                               // a removed item or undone kill reopens the quest
    }
  }
}

// Called once per server-verified kill: the main entry gets credit with the victim, then each proxy entry without one.
function onKill(ev: KillEvent): void {
  creditObjective(ev.creatureEntry, 1, ev.victimId);
  for (const proxy of ev.killCredit.slice(0, 2)) creditObjective(proxy, 1, null);
}
