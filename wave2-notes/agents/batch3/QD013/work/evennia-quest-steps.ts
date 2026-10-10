// Licence: BSD-3-Clause (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
type Status = "started" | "completed" | "abandoned" | "failed";
type Ev = Record<string, number | string | boolean>;

// One character's ledger: a single object holds the XP and every quest's record.
interface QuestEntry {
  step: string;
  status: Status;
  data: Record<string, number | string | boolean>;
}
interface Ledger {
  xp: number;
  quests: Record<string, QuestEntry>;
}

interface StepCtx {
  entry: QuestEntry;
  ledger: Ledger;
  ev: Ev; // the event that triggered progress
  setStep(name: string): void;
  finish(): void;
}

interface QuestDef {
  key: string;
  startStep: string;
  steps: Record<string, (ctx: StepCtx) => void>;
  help: Record<string, string>;
  cleanup?: (entry: QuestEntry) => void;
}

// Any terminal status ends the quest: cleanup runs once, here.
function setStatus(def: QuestDef, entry: QuestEntry, status: Status): void {
  entry.status = status;
  def.cleanup?.(entry);
}

// Start a quest, or keep stored progress if the character already has it.
function addQuest(def: QuestDef, ledger: Ledger): QuestEntry {
  const existing = ledger.quests[def.key];
  if (existing) return existing;
  const entry: QuestEntry = { step: def.startStep, status: "started", data: {} };
  ledger.quests[def.key] = entry;
  return entry;
}

// Run the current step; keep going while a step advances; never run after a terminal status.
function progress(def: QuestDef, ledger: Ledger, ev: Ev): void {
  for (let i = 0; i < 8; i++) {
    const entry = ledger.quests[def.key];
    if (!entry || entry.status !== "started") return;
    const before = entry.step;
    const step = def.steps[before];
    if (!step) return;
    step({
      entry,
      ledger,
      ev,
      setStep(name: string) { entry.step = name; },
      finish() { setStatus(def, entry, "completed"); },
    });
    if (entry.step === before && entry.status === "started") return;
  }
}

// Help: terminal status first, then the current step's text.
function help(def: QuestDef, entry: QuestEntry): string {
  if (entry.status !== "started") return `You have ${entry.status} this quest.`;
  return def.help[entry.step] ?? "No help available.";
}

// Example quest: step A waits for the parcel; step B pays 10 XP once and completes.
const delivery: QuestDef = {
  key: "delivery",
  startStep: "A",
  help: { A: "Pick up the parcel.", B: "Deliver it with more than 5 gold on you." },
  steps: {
    A: (c) => { if (c.ev.item === "parcel") c.setStep("B"); },
    B: (c) => {
      const gold = c.ev.gold;
      if (typeof gold === "number" && gold > 5) { c.ledger.xp += 10; c.finish(); }
    },
  },
  cleanup: (entry) => { delete entry.data.tmp; },
};

const ledger: Ledger = { xp: 0, quests: {} };
addQuest(delivery, ledger);
progress(delivery, ledger, { item: "parcel" });  // A -> B
progress(delivery, ledger, { gold: 7 });         // B -> completed, +10 xp
progress(delivery, ledger, { gold: 7 });         // no-op: terminal status gate
if (ledger.xp !== 10) throw new Error("xp paid more than once");
if (help(delivery, ledger.quests["delivery"]) !== "You have completed this quest.") throw new Error("help");

export {};
