// Licence: unclear (donor LICENSE forbids use of code or resources without public authorisation; file headers say MIT). Clean-room sketch from the described mechanism, not a translation of the donor.
type ItemId = number;
interface Gear { weapon: number | null; armour: number | null; }
interface Role {
  id: number;
  gear: Gear;
  carried: Map<ItemId, number>; // items the companion brings with them
  hp: number;
  mp: number;
}
type JoinResult = "joined" | "full" | "duplicate" | "unknown";
type LeaveResult = "left" | "not-in-party" | "protected" | "blocked-off-map";

class Party {
  // slot 0 is the hero; order is the roster order
  private order: number[] = [];

  constructor(
    private readonly roles: Map<number, Role>,
    private readonly pool: Map<ItemId, number>,   // one shared inventory (one ledger)
    private readonly maxSize: number,             // donor: settings value, not read
    private readonly leaveOnlyOffMap: boolean,    // donor: mod config flag, default true
    private readonly recover: (r: Role) => void   // donor Recover() body, not read
  ) {}

  join(id: number): JoinResult {
    if (this.order.includes(id)) return "duplicate";
    const role = this.roles.get(id);
    if (!role) return "unknown";
    if (this.order.length >= this.maxSize) return "full"; // donor: this check lives in the Lua caller, not in join
    for (const [item, n] of role.carried) {
      this.pool.set(item, (this.pool.get(item) ?? 0) + n);
    }
    role.carried.clear();
    role.gear = { weapon: null, armour: null };
    this.order.push(id);
    return "joined";
  }

  leave(id: number, onWorldMap: boolean): LeaveResult {
    if (id === 0) return "protected";                      // donor: the hero rule is in the UI, not in LeaveTeam
    if (this.leaveOnlyOffMap && !onWorldMap) return "blocked-off-map"; // donor: UI rule
    const i = this.order.indexOf(id);
    if (i < 0) return "not-in-party";
    const role = this.roles.get(id);
    if (!role) return "not-in-party";
    role.gear = { weapon: null, armour: null };
    this.order.splice(i, 1);
    this.recover(role);
    return "left";
  }
}
export {};
