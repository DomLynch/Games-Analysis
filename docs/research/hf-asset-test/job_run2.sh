# a100-large TRELLIS.2 run. env: ASSETS (comma ids), SUB (results subfolder). Saves every step; SIGTERM leaves evidence.
exec > >(tee -a /w_job.log) 2>&1
set -x
export JOB_TAG=$(date +%H%M%S)
upl() { python /w/repo/job/prep_model.py "$1" "$SUB" "$2" || echo UPL_FAIL; }
tail_up() { tail -200 /w_job.log > /w_tail.txt; upl /w_tail.txt joblog_tail_$JOB_TAG.txt; }
trap 'echo SIGTERM; [ -n "$PY" ] && kill -TERM $PY 2>/dev/null; sleep 5; tail_up; exit 143' TERM
source /w/repo/job/setup_env.sh || { echo SETUP_ABORT; tail_up; exit 1; }; echo "SETUP_DONE_AT $SECONDS"
echo "{\"job\":\"$JOB_TAG\",\"setup_s\":$SECONDS}" > /w_setup.json; upl /w_setup.json setup_$JOB_TAG.json
mkdir -p /w/job/images; cp -r /w/repo/job/* /w/job/; cp /w/repo/results/images/*.png /w/job/images/
git clone -q --depth 1 https://github.com/microsoft/TRELLIS.2 /w/trellis2
cd /w/job; python preflight.py 2>&1 | tee /w_pre.txt; PRE=${PIPESTATUS[0]}; upl /w_pre.txt preflight_$JOB_TAG.txt
[ "$PRE" = 0 ] || { echo PREFLIGHT_ABORT; tail_up; exit 1; }; echo "PREFLIGHT_DONE_AT $SECONDS"
python trellis_batch.py & PY=$!; wait $PY; RC=$?
echo "ALL_DONE_AT $SECONDS rc=$RC"; tail_up
