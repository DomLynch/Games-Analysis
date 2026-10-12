// clean-room sketch of openmw's quest progress and dialogue response choice (GPL-3.0 donor; shape only)
type Cmp = "eq" | "ne" | "gt" | "ge" | "lt" | "le";

interface Select { read: () => number | undefined; cmp: Cmp; target: number; }

// qStatus: the INFO's quest marker (none, name line, finished, restart).
interface Info {
  id: string;
  journalIndex: number;
  qStatus: "none" | "name" | "finished" | "restart";
  disposition: number;
  selects: Select[];
  text: string;
}

interface Quest { topic: string; index: number; finished: boolean; seen: Set<string>; entries: string[]; }

function compare(cmp: Cmp, a: number, b: number): boolean {
  switch (cmp) {
    case "eq": return a === b;
    case "ne": return a !== b;
    case "gt": return a > b;
    case "ge": return a >= b;
    case "lt": return a < b;
    case "le": return a <= b;
    default: throw new Error("unknown comparison");
  }
}

// A select passes when its value is missing (the donor ignores a missing global) or the comparison holds.
function selectPasses(s: Select): boolean {
  const v = s.read();
  if (v === undefined) return true;
  return compare(s.cmp, v, s.target);
}

// applyInfo: one quest line heard. Finished/restart set the flag, the index only moves forward,
// a line already heard is not added twice. Returns true when this line is a restart.
function applyInfo(q: Quest, info: Info): boolean {
  if (info.journalIndex < 0) throw new Error("no journal index on " + info.id);
  if (info.qStatus === "finished") q.finished = true;
  if (info.qStatus === "restart") q.finished = false;
  if (info.journalIndex > q.index) q.index = info.journalIndex;
  if (!q.seen.has(info.id)) {
    q.seen.add(info.id);
    q.entries.push(info.text);
  }
  return info.qStatus === "restart";
}

// pickResponse: responses of one topic in file order; the first that passes wins unless searchAll.
// A response that passes everything but the disposition gate is a refusal; if every response is refused,
// the refusal topic is searched instead.
function pickResponse(topic: Info[], refusalTopic: Info[], npcDisposition: number, searchAll = false): Info[] {
  const out: Info[] = [];
  let refused = false;
  for (const info of topic) {
    if (!info.selects.every(selectPasses)) continue;
    if (npcDisposition >= info.disposition) {
      out.push(info);
      if (!searchAll) break;
    } else {
      refused = true;
    }
  }
  if (out.length === 0 && refused) {
    for (const info of refusalTopic) {
      if (!info.selects.every(selectPasses)) continue;
      if (npcDisposition >= info.disposition) {
        out.push(info);
        if (!searchAll) break;
      }
    }
  }
  return out;
}

export {};
