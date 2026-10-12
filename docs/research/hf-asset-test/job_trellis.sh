set -x
source /w/repo/job/setup_env.sh; echo "SETUP_DONE_AT $SECONDS"
cp -r /w/repo/job /w/job; cd /w/job
python gen_images.py; echo "IMAGES_DONE_AT $SECONDS"
python upload_out.py "/w/job/images/*" /w/job/images_timing.json
python trellis_batch.py; echo "TRELLIS_DONE_AT $SECONDS"
python upload_out.py "/w/job/out_trellis/*"
echo "ALL_DONE_AT $SECONDS"
