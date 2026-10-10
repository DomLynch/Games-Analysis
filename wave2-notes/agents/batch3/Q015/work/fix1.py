import sys
p="/private/tmp/p2/wave2-haiku/batch3/Q015/out/ai-aggro/DCurrent-openbor.deep.md"
s=open(p).read()
reps=[
("- Each entity runs `check_ai` when its `nextthink` is due. `check_ai` runs `think` (= `common_think` for AI characters) and sets",
 "- Each entity runs `check_ai` when its `nextthink` is due. `check_ai` runs `think` (set to `common_think` at 9197, 27539, 27663, 27683) and sets"),
("Result: a vulnerable pick is kept over a closer invulnerable one. Among vulnerable targets in front, the nearest wins. Among targets behind, the first one scanned wins, because rule (b) cannot replace it.",
 "Result: rule (b) does not check the candidate's vulnerability, so a nearer candidate in front replaces a vulnerable pick. A vulnerable pick is kept only while no nearer candidate in front appears. Among candidates all behind self, rule (b) never fires, so the first scanned vulnerable one is kept."),
("- Chase point, `common_try_chase` (41525).", "- Chase point, `common_try_chase` (41525)."),
("Walk speed is `speed.x`. It runs (`runspeed`) when the x gap is over 150 and a run animation exists (41572). Z: `destz = target.z`, speed `speed.x / 2` (41619).",
 "Walk speed is `speed.x`. It runs (`runspeed`) when the x gap is over 150 and a run animation exists (41572). Z: `destz = target.z`; walk speed `speed.x / 2` (41619), or `runspeed / 2` when the z gap is over 100 and the z run flags and run animation allow it (41611-41615, not receipted)."),
("It faces the target unless the entity is running or has NO_FLIP. Chase is added",
 "It faces an item if one is in reach, otherwise the target, unless the entity is running or has NO_FLIP (43103-43120, read). Chase is added"),
("A stopped entity waits `(game_speed - aggression) / 2`, floor `game_speed / 5` (43426-43428).",
 "When the entity comes to a stop after moving, it waits `(game_speed - aggression) / 2`, floor `game_speed / 5` (43426-43428)."),
("Returns 0 on every think beat where `_time / THINK_SPEED % 4 == 0`, so one beat in four is skipped.",
 "Returns 0 when `_time / THINK_SPEED % 4 == 0`, which is 2 of every 8 time units (the `_time` step is not read), so a quarter of the windows are skipped."),
("times `(1 - attackthrottle)` (39642), times `(1 - offscreen_noatk_factor)` (0.5, 284) when off screen by more than 10 (39644-39647).",
 "times `(1 - attackthrottle)` (39642), times `(1 - factor)` when off screen by more than 10 (39644-39647), where the factor is the model's `offscreen_noatk_factor` if set, else the global 0.5 (284, 39646-39647)."),
("It is called on contact (for example 39275, 40221, 44756).",
 "It is also called from other places (38992, 39275, 40221, 44756, 49333, 49410; contexts not read)."),
("| Target: nearest hostile in front; a vulnerable pick outranks a closer invulnerable one |",
 "| Target: nearest hostile in front wins; a non-vulnerable pick is replaced by any later candidate |"),
("| Off-screen attacks are damped | Factor 0.5 (theirs, openbor.c:284); off-screen margin 10 (theirs, 39644) |",
 "| Off-screen attacks are damped | Factor per model, else 0.5 (theirs, openbor.c:284); off-screen margin 10 (theirs, 39644) |"),
("- today: none in Frankendom (no engine AI module found by this pass; not searched in Frankendom).",
 "- today: not checked (this reader had no Frankendom checkout; only donor code was in reach)."),
("- Donor quirk, not copied: `recheck_nextattack` is called twice per attempt (39682 and 39684), so a target that is attacking cuts the cooldown by 8, not 4.",
 "- Donor quirk, not copied: `recheck_nextattack` is called twice per attempt (39682 and 39684), so a target that is attacking cuts the cooldown by up to 8 per attempt, not 4."),
("Target pick, `normal_find_target` (35497). Walks `ent_list` in index order.",
 "Target pick, `normal_find_target` (35497). Walks `ent_list` in index order."),
]
for a,b in reps:
    n=s.count(a)
    assert n==1,(n,a[:60])
    s=s.replace(a,b)
open(p,"w").write(s)
print("ok",len(reps))
