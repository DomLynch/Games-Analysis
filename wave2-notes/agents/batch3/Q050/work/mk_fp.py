G="flutter-team-archive-pinball"
R="/mnt/frankendom-donors/flutter-team-archive-pinball/"
GB=R+"lib/game/bloc/game_bloc.dart"
GS=R+"lib/game/bloc/game_state.dart"
RC=R+"packages/pinball_components/lib/src/components/spaceship_ramp/cubit/spaceship_ramp_cubit.dart"
AB=R+"lib/game/components/android_acres/behaviors/"
RM=AB+"ramp_multiplier_behavior.dart"
RB=AB+"ramp_bonus_behavior.dart"
RP=AB+"ramp_progress_behavior.dart"
RR=AB+"ramp_reset_behavior.dart"
DR=R+"lib/game/components/drain/behaviors/draining_behavior.dart"
MB=R+"lib/game/components/multipliers/behaviors/multipliers_behavior.dart"
SC=R+"packages/pinball_components/lib/src/components/score_component/score_component.dart"
AA=R+"lib/game/components/android_acres/android_acres.dart"
rows=[
("Round loss banks round score times multiplier into total",GB,31,"state.totalScore + state.roundScore * state.multiplier,"),
("Round loss function",GB,29,"void _onRoundLost(RoundLost event, Emitter emit) {"),
("Rounds count down by one on loss, floored at zero",GB,34,"final roundsLeft = math.max(state.rounds - 1, 0);"),
("Banked total written on loss",GB,38,"totalScore: score,"),
("Round score cleared on loss",GB,39,"        roundScore: 0,"),
("Multiplier reset to 1 on loss",GB,40,"        multiplier: 1,"),
("Scored adds points to the round score only while playing",GB,49,"final combinedScore = math.min("),
("Round score update from a Scored event",GB,53,"emit(state.copyWith(roundScore: combinedScore - state.totalScore));"),
("Multiplier increase function",GB,57,"void _onIncreasedMultiplier(MultiplierIncreased event, Emitter emit) {"),
("Multiplier steps by one and is capped at 6",GB,61,"multiplier: math.min(state.multiplier + 1, 6),"),
("Starting rounds are 3",GS,55,"        rounds = 3,"),
("Multiplier applies only at round loss (donor comment)",GS,60,"/// Multipliers are only applied to the score for the current round once is"),
("Max multiplier is 6",GS,86,"bool get isMaxMultiplier => multiplier == 6;"),
("Ramp hit adds one to hits",RC,9,"void onAscendingBallEntered() => emit(state.copyWith(hits: state.hits + 1));"),
("Arrow light advances modulo the light states",RC,16,"ArrowLightState.values[(index + 1) % ArrowLightState.values.length],"),
("Ramp reset sets the initial state",RC,21,"void onReset() => emit(const SpaceshipRampState.initial());"),
("Multiplier behavior doc: every five ramp shots",RM,7,"/// Increases the multiplier when a [Ball] is shot 5 times into the"),
("Every fifth hit is detected by modulo 5",RM,17,"final achievedFiveShots = newState.hits % 5 == 0;"),
("Multiplier increment needs a new hit and a non-max multiplier",RM,20,"return hitsIncreased & achievedFiveShots && notMaxMultiplier;"),
("Multiplier increment event is sent to GameBloc",RM,25,"readBloc<GameBloc, GameState>().add(const MultiplierIncreased());"),
("Arrow progresses unless the multiplier is max and the arrow is lit",RP,23,"final canProgress = !gameBloc.state.isMaxMultiplier ||"),
("Arrow wraps once more when fully lit below max multiplier",RP,30,"if (spaceshipCubit.state.arrowFullyLit && !gameBloc.state.isMaxMultiplier) {"),
("Every tenth ramp hit scores the one-million bonus",RB,25,"final achievedOneMillionPoints = newState.hits % 10 == 0;"),
("Bonus scoring value is one million",SC,93,"return 1000000;"),
("Bonus wired with Points.oneMillion",AA,22,"RampBonusBehavior(points: Points.oneMillion),"),
("Each ramp hit scores five thousand",AA,21,"RampShotBehavior(points: Points.fiveThousand),"),
("Ramp state resets when the rounds count changes",RR,12,"return previousState.rounds != newState.rounds;"),
("Multiplier lamps follow GameState.multiplier",MB,18,"multiplier.bloc.next(state.multiplier);"),
("Round is lost when the last ball leaves",DR,17,"if (ballsLeft - 1 == 0) {"),
("Round loss event is sent when the last ball drains",DR,22,".add(const RoundLost());"),
("Licence: MIT copyright line",R+"LICENSE",3,"Copyright (c) 2021 Very Good Ventures"),
]
out=open("/private/tmp/p2/wave2-haiku/batch3/Q050/receipts.tsv","a")
for claim,path,line,q in rows:
    assert "\t" not in q and 15<=len(q)<=90, (len(q),q)
    out.write("\t".join([G,claim,path,str(line),q])+"\n")
out.close()
print(len(rows),"rows appended")
