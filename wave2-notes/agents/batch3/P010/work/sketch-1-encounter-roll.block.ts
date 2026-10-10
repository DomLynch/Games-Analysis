// Licence: GPL-3.0 (donor). Clean-room sketch written from the described mechanism, not a translation of the donor lines.
// clean-room
type EncounterId = string;
type EncounterTable = Readonly<Record<EncounterId, number>>;

interface RunLedger {
  usedEncounters: Set<EncounterId>; // once-per-run ledger for this run
  festival: boolean;                // special rule: no once-per-run limit, table normalised to total 1
}

// One roll per town phase. Each entry takes a slice of [0, total).
// The part of the range that no entry covers means "no encounter at this stage".
function rollEncounter(
  table: EncounterTable,
  run: RunLedger,
  rand: () => number = Math.random
): EncounterId | null {
  const total = run.festival
    ? Object.values(table).reduce((sum, w) => sum + w, 0)
    : 1;
  let r = rand() * total;
  let picked: EncounterId | null = null;
  for (const id of Object.keys(table)) {
    r -= table[id];
    if (r < 0) { picked = id; break; }
  }
  if (picked === null) return null;
  if (!run.festival && run.usedEncounters.has(picked)) return null; // roll is spent, not re-rolled
  run.usedEncounters.add(picked);
  return picked;
}

const ITEM_PHASE_BASE_MS = 16000;   // zone/stage data in the donor
const PORTAL_PHASE_BASE_MS = 23000; // zone/stage data in the donor

interface PhaseInput { portalStage: boolean; firstItemStage: boolean; alive: number; encounter: boolean; }

// Phase length: base, plus 2 s per alive player (not on the first item stage), plus 5 s when an encounter exists.
function townPhaseMs(p: PhaseInput): number {
  let ms = p.portalStage ? PORTAL_PHASE_BASE_MS : ITEM_PHASE_BASE_MS;
  if (!p.portalStage && !p.firstItemStage) ms += p.alive * 2000;
  if (p.encounter) ms += 5000;
  return ms;
}

interface LockInput { alive: number; rank: number; encounter: boolean; isBot: boolean; fixedMs?: number; }

// Input lockout after the phase opens. fixedMs replaces the formula (the donor's stage overrides);
// bot jitter is added last, as in the donor.
function lockoutMs(
  p: LockInput,
  jitter: (lo: number, hi: number) => number = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1))
): number {
  let ms = p.fixedMs ?? ((p.encounter ? 10000 : 5000) + (p.alive - p.rank) * 2000);
  if (p.isBot) ms += jitter(1000, 6000);
  return ms;
}
