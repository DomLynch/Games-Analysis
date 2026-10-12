import sys, os, json
from huggingface_hub import HfApi, get_token
kind=sys.argv[1]
a=HfApi(); R="Domlynch/frankendom-asset-test"
a.create_repo(R,repo_type="model",private=True,exist_ok=True)
a.upload_folder(folder_path=os.path.dirname(os.path.abspath(__file__)),path_in_repo="job",repo_id=R,repo_type="model",ignore_patterns=["launch.py","__pycache__"])
img='pytorch/pytorch:2.6.0-cuda12.4-cudnn9-devel'
boot='pip install -q huggingface_hub && mkdir -p /w/repo && python - <<"PY"\nimport os\nfrom huggingface_hub import snapshot_download\nsnapshot_download("%s",repo_type="model",token=os.environ["HF_TOKEN"],local_dir="/w/repo",allow_patterns=["wheels_sm80_89/*","job/*","results/images/*"])\nPY\n'%R
cfg={'build':('cpu-upgrade','60m','WHAT=trellis bash /w/repo/job/build_wheels.sh'),
 'natten':('cpu-upgrade','75m','WHAT=natten bash /w/repo/job/build_wheels.sh'),
 'smoke':('cpu-upgrade','25m','bash /w/repo/job/job_smoke.sh'),
 'smoke1':('a100-large','12m','ASSETS=a03_ruined_tower SUB=smoke1 WATCHDOG=300 exec bash /w/repo/job/job_run2.sh'),
 'l40s4':('l40sx1','18m','ASSETS=a04_iron_chest,a07_glow_mushrooms,a08_brazier,a10_stone_well SUB=l40s4 FLAVOR=l40sx1 PREFLIGHT_LITE=1 WATCHDOG=420 exec bash /w/repo/job/job_run2.sh'),
 'full':('a100-large','18m','ASSETS=a01_dead_oak,a02_gravestone,a03_ruined_tower,a04_iron_chest,a05_spiked_pauldron,a06_great_helm,a07_glow_mushrooms,a08_brazier,a09_bramble,a10_stone_well SUB=full WATCHDOG=300 exec bash /w/repo/job/job_run2.sh'),
 'trellis':('l4x1','35m','bash /w/repo/job/job_trellis.sh'),
 'pixal':('l4x1','15m','bash /w/repo/job/job_pixal.sh')}[kind]
if kind.startswith(('build','natten')):
    boot='mkdir -p /w/repo && pip install -q huggingface_hub && python - <<"PY"\nimport os\nfrom huggingface_hub import snapshot_download\nsnapshot_download("%s",repo_type="model",token=os.environ["HF_TOKEN"],local_dir="/w/repo",allow_patterns=["job/*"])\nPY\n'%R
job=a.run_job(image=img,command=['bash','-c',boot+cfg[2]],flavor=cfg[0],timeout=cfg[1],secrets={'HF_TOKEN':get_token()})
print(job.id,job.url)
