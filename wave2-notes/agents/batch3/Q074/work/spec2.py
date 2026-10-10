SY="/mnt/frankendom-donors/PixelGuys-Cubyz/src/sync.zig"
GM="/mnt/frankendom-donors/PixelGuys-Cubyz/src/game.zig"
PH="/mnt/frankendom-donors/PixelGuys-Cubyz/src/physics.zig"
HU="/mnt/frankendom-donors/PixelGuys-Cubyz/src/callbacks/block/touch/hurt.zig"
EN="/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/Entity.zig"
KL="/mnt/frankendom-donors/PixelGuys-Cubyz/src/server/command/kill.zig"
HB="/mnt/frankendom-donors/PixelGuys-Cubyz/src/gui/windows/healthbar.zig"
LI="/mnt/frankendom-donors/PixelGuys-Cubyz/LICENSE"
REC = [
("licence: GNU GPL version 3 (LICENSE line 2)", LI, "Version 3, 29 June 2007"),
("one health entry point: addHealth takes the cause and the side", SY, "pub fn addHealth(health: f32, cause: main.game.DamageType, side: Side"),
("client side sends the change to the server as a command", SY, "client.executeCommand(.{.addHealth = .{.target = entity"),
("server side runs the change directly", SY, "server.executeCommand(.{.addHealth = .{.target = entity"),
("server applies: remember previous health", SY, "info.previous = info.target.?.player().health;"),
("server applies: clamp to [0, max]", SY, "std.math.clamp(info.target.?.player().health + info.health, 0,"),
("server applies: at zero or below, a kill", SY, "if (info.target.?.player().health <= 0) {"),
("server kill: refill to max health", SY, "info.target.?.player().health = info.target.?.player().maxHealth;"),
("server kill: cause message to the chat", SY, "info.cause.sendMessage(info.target.?.name);"),
("server kill: one kill sync operation with spawn point", SY, "self.syncOperations.append(allocator, .{.kill = .{"),
("server not dead: one health sync operation carrying the delta", SY, "self.syncOperations.append(allocator, .{.health = .{"),
("client undo of a refused change restores previous health", SY, "main.game.Player.super.health = info.previous;"),
("client applies a health sync by clamping", SY, "main.game.Player.super.health = std.math.clamp(main.game.Player.super.health + health.health, 0, main.game.Player.super.maxHealth);"),
("client applies a kill sync by respawning", SY, "main.game.Player.kill(kill.spawnPoint);"),
("creative targets are skipped on the server", SY, "if (target.?.gamemode.raw == .creative) return;"),
("server accepts only a sender's change to itself", SY, "if (user.?.id != result.target) return error.Invalid;"),
("command entry point on the server", SY, "pub fn executeCommand(payload: Command.Payload, source: ?*main.server.User) void {"),
("execution context forwards to the base operation", SY, "return self.cmd.executeBaseOperation(self.allocator, _op, self.side);"),
("DamageType: heal is the add-health cause", GM, "heal = 0, // For when you are adding health"),
("DamageType enum declaration", GM, "pub const DamageType = enum(u8) {"),
("client kill: respawn position and full health", GM, "Player.super.health = Player.super.maxHealth;"),
("fall damage: change in vertical speed at a landing", GM, "const velocityChange = @abs(@abs(prevVel[2]) - @abs(Player.super.vel[2]));"),
("fall damage: height from speed minus 7 safe units, rounded, halved", GM, "const damage: f32 = @floatCast(@round(@max((velocityChange*velocityChange)/(2*physics.baseGravity) - 7, 0))/2);"),
("fall damage: ignore tiny values", GM, "if (damage > 0.01) {"),
("fall damage is sent as a client change", GM, "main.sync.addHealth(-damage, .fall, .client, Player.id);"),
("fall damage runs in the client update", GM, "pub fn update(deltaTime: f64) void {"),
("gravity constant used by the fall formula", PH, "pub const baseGravity = 30.0;"),
("block touch hurt: damage per frame is dps times delta time", HU, "const damage = self.dps*@as(f32, @floatCast(params.deltaTime));"),
("block touch hurt: sent as a client change", HU, "main.sync.addHealth(-damage, self.damageType, .client, main.game.Player.id);"),
("block touch hurt: server side not implemented (TODO)", HU, "TODO: Implement on the server side"),
("touch callback is run per block from physics", PH, "_ = block.?.onTouch().run(.{.entity = entity, .source = block.?"),
("kill command: a huge negative change through the same entry point", KL, "main.sync.addHealth(-std.math.floatMax(f32), .kill, .server, target.user.id);"),
("base entity default health", EN, "health: f32 = 8,"),
("base entity default max health", EN, "maxHealth: f32 = 8,"),
("healthbar: half-heart units are 2 per health point", HB, "const halfHeartUnits: usize = @ceil(displayHealth*2);"),
("healthbar: total hearts from max health", HB, "const totalHearts: usize = @ceil(main.game.Player.super.maxHealth);"),
("health sync: ignoreSource lists health as true, so the sender is skipped", SY, ".create, .delete, .useDurability, .health, .energy, .rotation => true,"),
("kill sync: ignoreSource lists kill as false, so the sender gets it", SY, ".kill => false,"),
("network entry: a received user command is executed on the server", SY, "executeCommand(payload, source);"),
("block hurt: dps comes from the block data (zon)", HU, ".dps = zon.get(f32, \"dps\") orelse {"),
("sender is skipped for ignoreSource operations", SY, "if (user == source and op.ignoreSource()) continue;"),
]
