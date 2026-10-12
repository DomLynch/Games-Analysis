// Licence: MIT (donor FPtje-DarkRP). Shape adapted; written from the mechanism, not copied line by line.

interface Ledger {
  balance(accountId: string): number;
  // The one money door: every change of balance is a signed row.
  settle(rows: ReadonlyArray<{ accountId: string; delta: number; reason: string }>): void;
}

interface Plot {
  id: string;
  masterOwnerId: string | null;   // donor: doorData.owner
  coOwnerIds: Set<string>;        // donor: extraOwners (co-owners share the plot)
}

interface UpkeepRules {
  feePerPlot: number;   // donor: price = 10 per taxable plot (sv_doors.lua:172)
  jitterMax: number;    // donor: math.random(-5, 5) (sv_doors.lua:173); caller supplies the draw
  graceMisses: number;  // NEW, not in donor: 0 = donor behaviour (evict on the first shortfall)
}

interface PayerState { misses: number; }

// Donor: unowning for a shortfall. The master wipes all co-owners; a co-owner only leaves.
export function releaseFor(plot: Plot, payerId: string): void {
  if (plot.masterOwnerId === payerId) {
    plot.coOwnerIds.clear();    // donor: removeAllKeysExtraOwners (sv_doors.lua:96)
    plot.masterOwnerId = null;  // donor: doorData.owner = nil (sv_doors.lua:98)
  } else {
    plot.coOwnerIds.delete(payerId); // donor: removeKeysDoorOwner
  }
}

// One upkeep cycle for one player (donor: pmeta:doPropertyTax, run every 270 s).
export function upkeepCycle(
  payerId: string,
  plots: Plot[],          // plots the payer owns OR co-owns (donor counts both: sv_doors.lua:146-166)
  rules: UpkeepRules,
  state: PayerState,
  ledger: Ledger,
  jitter: number,         // integer in [-jitterMax, jitterMax]
): "none" | "paid" | "missed" | "evicted" {
  if (plots.length === 0) return "none";                        // donor :170
  const due = rules.feePerPlot * plots.length + jitter;         // donor :173
  if (due === 0) return "none";                                 // donor :180
  if (ledger.balance(payerId) >= due) {                         // donor :182
    ledger.settle([{ accountId: payerId, delta: -due, reason: "upkeep" }]); // donor :185
    state.misses = 0;
    return "paid";
  }
  state.misses += 1;                                            // NEW: grace counter
  if (state.misses <= rules.graceMisses) return "missed";
  for (const plot of plots) releaseFor(plot, payerId);          // donor :188 taxesUnOwnAll
  state.misses = 0;
  return "evicted";
}
export {};
