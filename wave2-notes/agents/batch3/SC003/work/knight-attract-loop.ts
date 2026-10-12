// Licence: GPL-3.0 (donor LICENSE line 1; README "GPL-3.0"; _RESTRICTED-NOTE.txt: shape/idea only). clean-room.
// clean-room
type Mode = 'menu' | 'battle' | 'attract';

interface Brain { step(dt: number, opponent: Fighter): void; }
interface Fighter { hp: number; brain: Brain | null; } // brain null = driven by a person

interface Ledger { gold: number; wins: number; losses: number; }
interface Outcome { playerWon: boolean; reward: number; }

const ATTRACT_RESET_MS = 2400; // pause after a KO before the next attract fight (donor: setTimeout 2400, main.ts 1573)
const OBSTACLES_PER_ARENA = 3; // donor: buildObstacles(3) (main.ts 1866)

// Both sides run a brain only while an attract fight is live. Nothing else changes in attract mode.
function stepFight(mode: Mode, gameOver: boolean, a: Fighter, b: Fighter, dt: number): void {
	if (mode === 'attract' && !gameOver) {
		a.brain?.step(dt, b);
		b.brain?.step(dt, a);
	}
}

// Fight end for one KO. Attract fights pay nothing and touch no ledger; they reset in a new arena.
function onKo(
	mode: Mode,
	ledger: Ledger,
	outcome: Outcome,
	nowMs: number,
	pickArena: () => string,
): { ledger: Ledger; resetAtMs?: number; nextArena?: string } {
	if (mode === 'attract') {
		return { ledger, resetAtMs: nowMs + ATTRACT_RESET_MS, nextArena: pickArena() };
	}
	if (!outcome.playerWon) {
		return { ledger: { ...ledger, losses: ledger.losses + 1 } };
	}
	return { ledger: { ...ledger, gold: ledger.gold + outcome.reward, wins: ledger.wins + 1 } };
}

// Floating hit messages are suppressed in attract mode and after the fight is over (donor flashMsg, main.ts 1479).
function mayShowFlash(mode: Mode, gameOver: boolean): boolean {
	return !(gameOver || mode === 'attract');
}

export { stepFight, onKo, mayShowFlash, ATTRACT_RESET_MS, OBSTACLES_PER_ARENA };
