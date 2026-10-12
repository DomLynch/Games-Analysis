// Licence: GNU AGPL v3 (donor LICENSE line 1; COPYING.md line 10). clean-room: shape only, no donor lines copied.
// clean-room
const MAX_DELAY_S = 3600; // form-level cap in the donor (validation), kept here as an engine constant
const FIXED_POLL_LAG_PUSH_S = 1; // donor's pollingLag for push-fed rounds
const FIXED_POLL_LAG_PULL_S = 6; // donor's pollingLag for upstream-pulled rounds

interface Snapshot { atMs: number; state: string; } // one stored copy of the source state, oldest first

class SpectatorDelay {
	private snaps: Snapshot[] = [];

	constructor(
		private readonly delayS: number,            // zone or event data, 0..MAX_DELAY_S
		private readonly lagS: number,              // FIXED_POLL_LAG_*
		private readonly startState: string,        // the position before any move
	) {
		if (delayS < 0 || delayS > MAX_DELAY_S) throw new Error('delay out of range');
	}

	// delay minus the source's polling lag; undefined means no delay is applied (as in delayMinusLag)
	private effectiveS(): number | undefined {
		const s = this.delayS - this.lagS;
		return s > 0 ? s : undefined;
	}

	// One fetch from the source. Store the state only when it changed, then return what a spectator may see now.
	observe(nowMs: number, state: string): string {
		const last = this.snaps[this.snaps.length - 1];
		if (!last || last.state !== state) this.snaps.push({ atMs: nowMs, state });
		const s = this.effectiveS();
		if (s === undefined) return state;
		const cutoff = nowMs - s * 1000;
		for (let i = this.snaps.length - 1; i >= 0; i--) {
			if (this.snaps[i].atMs <= cutoff) return this.snaps[i].state; // newest snapshot old enough
		}
		return this.startState; // nothing is old enough yet: the start position, no moves
	}

	// Time when the first move becomes visible to spectators. The donor adds the full delay here,
	// while observe() subtracts the lag; this uses the same effective delay as observe().
	firstMoveVisibleAtMs(firstMoveAtMs: number): number {
		const s = this.effectiveS() ?? 0;
		return firstMoveAtMs + s * 1000;
	}

	// Frankendom addition (not in donor): drop snapshots that no spectator can ask for any more.
	prune(nowMs: number): void {
		const s = this.effectiveS();
		if (s === undefined) { this.snaps = []; return; }
		const cutoff = nowMs - s * 1000;
		let keepFrom = 0;
		for (let i = 0; i < this.snaps.length; i++) {
			if (this.snaps[i].atMs <= cutoff) keepFrom = i; // keep the newest one at or before the cutoff
		}
		this.snaps = this.snaps.slice(keepFrom);
	}
}

export { SpectatorDelay, MAX_DELAY_S, FIXED_POLL_LAG_PUSH_S, FIXED_POLL_LAG_PULL_S };
