set -x
source /w/repo/job/setup_env.sh; echo "SETUP_DONE_AT $SECONDS"
cp -r /w/repo/job /w/job; mkdir -p /w/job/images; cp /w/repo/results/images/*.png /w/job/images/
git clone -q --depth 1 https://github.com/microsoft/TRELLIS.2 /w/trellis2
cd /w/job; ASSETS=a01_dead_oak,a02_gravestone,a03_ruined_tower,a05_spiked_pauldron,a09_bramble python trellis_batch.py; echo "TRELLIS_DONE_AT $SECONDS"
true
echo "ALL_DONE_AT $SECONDS"
