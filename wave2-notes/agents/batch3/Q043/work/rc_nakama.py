import csv
L="/mnt/frankendom-donors/heroiclabs-nakama/server/core_leaderboard.go"
T="/mnt/frankendom-donors/heroiclabs-nakama/server/core_tournament.go"
D="/mnt/frankendom-donors/heroiclabs-nakama/server/db.go"
M="/mnt/frankendom-donors/heroiclabs-nakama/migrate/sql/20180805174141-tournaments.sql"
N="heroiclabs-nakama"
rows=[
("score write entry point",L,415,"func LeaderboardRecordWrite(ctx context.Context"),
("reset expiry from cron schedule",L,427,"expiryTime = leaderboard.ResetSchedule.Next(time.Now().UTC()).UTC().Unix()"),
("increment adds delta",L,454,"score = leaderboard_record.score + $8, subscore = leaderboard_record.subscore + $9"),
("increment with zero delta writes nothing",L,455,"filterSQL = \" WHERE $8 <> 0 OR $9 <> 0\""),
("decrement floored at zero",L,461,"score = GREATEST(leaderboard_record.score - $8, 0)"),
("set writes only on change",L,469,"WHERE leaderboard_record.score <> $4 OR leaderboard_record.subscore <> $5"),
("best keeps the higher value",L,483,"score = GREATEST(leaderboard_record.score, $4), subscore = GREATEST(leaderboard_record.subscore, $5)"),
("best writes only when strictly better",L,484,"WHERE leaderboard_record.score < $4 OR leaderboard_record.subscore < $5"),
("num_score counts accepted writes",L,495,"num_score = leaderboard_record.num_score + 1"),
("tournament attempt top-up entry",T,77,"func TournamentAddAttempt(ctx context.Context"),
("attempt top-up only inside window",T,96,"if endActive <= nowUnix {"),
("attempt top-up adds to cap",T,101,"UPDATE leaderboard_record SET max_num_score = (max_num_score + $1)"),
("tournament write entry point",T,422,"func TournamentRecordWrite(ctx context.Context"),
("tournament increment",T,464,"opSQL = \"score = leaderboard_record.score + $5, subscore = leaderboard_record.subscore + $6\""),
("tournament decrement floored at zero",T,470,"score = GREATEST(leaderboard_record.score - $5, 0)"),
("tournament best keeps higher",T,489,"score = GREATEST(leaderboard_record.score, $5), subscore = GREATEST(leaderboard_record.subscore, $6)"),
("join-required path gates attempts in SQL",T,529,"AND (max_num_score = 0 OR num_score < max_num_score)"),
("open path counts attempts before the check",T,559,"dbNumScore = dbOldScores.Tuple[0] + 1"),
("open path new record counts one",T,563,"dbNumScore = 1"),
("open path cap check after the write",T,568,"if dbMaxNumScore > 0 && dbNumScore > dbMaxNumScore {"),
("open path cap error returned",T,569,"return runtime.ErrTournamentWriteMaxNumScoreReached"),
("board size guard in open path",T,574,"UPDATE leaderboard SET size = size + 1 WHERE id = $1 AND (max_size = 0 OR size < max_size)"),
("join path board size guard",T,154,"UPDATE leaderboard SET size = size+1 WHERE id = $1 AND size < max_size"),
("transaction commits only if fn succeeds",D,333,"if err = fn(tx); err == nil {"),
("transaction commit call",D,334,"err = tx.Commit()"),
("default attempt cap in migration",M,25,"max_num_score INT          NOT NULL DEFAULT 1000000 CHECK (max_num_score > 0)"),
]
with open("/private/tmp/p2/wave2-haiku/batch3/Q043/receipts.tsv","a",newline="") as f:
    for claim,file,line,q in rows:
        assert "\t" not in q and "\t" not in claim
        f.write("\t".join([N,claim,file,str(line),q])+"\n")
print("wrote",len(rows))
