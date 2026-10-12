// Licence: GPL-2.0-or-later (donor). clean-room sketch written from the described mechanism, not a translation of the donor lines.

type Order = 'hold' | 'disengage';

interface Member {
  id: number;
  polymorphed: boolean;
  seriouslyWounded: boolean;
  hasTask: boolean;
}

type Step = 'follow' | 'wait' | 'none';
type Engage = 'attack' | 'chase' | 'none';

class Team {
  members: Member[]; // members[0] is the leader
  orders = new Set<Order>();
  attackSize: number; // member count when the attack launched
  cancelled = false;

  constructor(members: Member[]) {
    if (members.length === 0) throw new Error('a team needs a member');
    this.members = members;
    this.attackSize = members.length;
  }

  get leader(): Member {
    return this.members[0];
  }

  // Exclusive slot: turning one order on clears the other.
  setOrder(order: Order, on: boolean): void {
    if (on) {
      this.orders.clear();
      this.orders.add(order);
    } else {
      this.orders.delete(order);
    }
  }

  // Player toggle: flip the order, same exclusivity rule.
  toggleOrder(order: Order): void {
    this.setOrder(order, !this.orders.has(order));
  }

  hasOrder(order: Order): boolean {
    return this.orders.has(order);
  }

  // Retreat rule: fewer than ceil(attackSize / 2) non-polymorphed members left,
  // or exactly one such member left and it is seriously wounded.
  shouldRetreat(): boolean {
    const live = this.members.filter(m => !m.polymorphed);
    const floor = Math.floor((this.attackSize + 1) / 2);
    return live.length < floor || (live.length === 1 && live[0].seriouslyWounded);
  }
}

// Follow rule for one creature. A 'hold' team waits; the leader never follows.
function followStep(team: Team | undefined, me: Member, distToLeader: number): Step {
  if (!team || team.leader.id === me.id) return 'none';
  if (team.hasOrder('hold')) return 'wait';
  return distToLeader > 1 ? 'follow' : 'wait';
}

// Chase is off while the active team holds either order.
function mayChase(team: Team | undefined): boolean {
  return !team || (!team.hasOrder('hold') && !team.hasOrder('disengage'));
}

// Adjacent enemies are always attacked; chasing needs mayChase.
function engage(distToEnemy: number, chase: boolean): Engage {
  if (distToEnemy === 1) return 'attack';
  return chase ? 'chase' : 'none';
}

// Per-update pass: retreat check on every team first, then prune teams with a member that has no task.
// Fix for donor defect: every team is checked; there is no early return.
function tickTeams(teams: Team[]): Team[] {
  for (const t of teams) {
    if (!t.cancelled && t.shouldRetreat()) {
      t.cancelled = true;
      t.setOrder('disengage', true);
    }
  }
  return teams.filter(t => t.members.every(m => m.hasTask));
}

export {};
