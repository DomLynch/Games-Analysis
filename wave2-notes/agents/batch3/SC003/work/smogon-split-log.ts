// Licence: MIT (donor, LICENSE line 1). Own code, shape taken from sim/battle.ts 33-56 and 3081-3110.
// clean-room
type Channel = -1 | 0 | 1 | 2 | 3 | 4; // -1 owner/debug view, 0 public (spectators), 1-4 one seat each
type Seat = 1 | 2 | 3 | 4;

type LogEntry =
	| { kind: 'public'; line: string }
	| { kind: 'split'; seat: Seat; secret: string; shared: string };

class FightRecord {
	private entries: LogEntry[] = [];
	private sentUpTo = 0;

	addPublic(line: string): void {
		this.entries.push({ kind: 'public', line });
	}

	// One event, two versions: a private line for one seat (and the owner view) and a shared line
	// for everyone else. An empty shared line means other viewers see nothing for this event.
	addSplit(seat: Seat, secret: string, shared: string = ''): void {
		this.entries.push({ kind: 'split', seat, secret, shared });
	}

	// Entries appended since the last flush; the caller sends this batch to every viewer.
	flush(): LogEntry[] {
		const batch = this.entries.slice(this.sentUpTo);
		this.sentUpTo = this.entries.length;
		return batch;
	}

	// Text one channel sees in a batch. The owner view (-1) sees every secret line; a seat sees its own
	// secret line; spectators (0) and other seats see the shared line; empty results are skipped.
	viewFor(channel: Channel, batch: LogEntry[]): string {
		const out: string[] = [];
		for (const entry of batch) {
			if (entry.kind === 'public') {
				out.push(entry.line);
				continue;
			}
			const line = channel === -1 || entry.seat === channel ? entry.secret : entry.shared;
			if (line) out.push(line);
		}
		return out.join('\n');
	}
}

// Usage shape only: one event is added once, the batch is flushed once, then each viewer reads its own text.
const record = new FightRecord();
record.addPublic('hit: duelist A lands a strike');
record.addSplit(1, 'stamina: 42', 'stamina: low');
const batch = record.flush();
const coachView = record.viewFor(1, batch);     // seat 1 sees "stamina: 42"
const spectatorView = record.viewFor(0, batch); // spectators see "stamina: low"
const ownerView = record.viewFor(-1, batch);    // owner view sees "stamina: 42"
export { coachView, spectatorView, ownerView };
