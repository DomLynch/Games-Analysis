import requests, json, sys
from huggingface_hub import get_token
P={"l4x1":0.80,"cpu-upgrade":0.03,"a100-large":2.50,"l40sx1":1.80}
tot=0
for j in sys.argv[1:]:
    d=requests.get("https://huggingface.co/api/jobs/Domlynch/"+j,headers={"Authorization":"Bearer "+get_token()}).json()
    r=d.get("durations",{}).get("runningSecs") or 0; c=r/3600*P[d["flavor"]]; tot+=c
    print(j,d["flavor"],d["status"]["stage"],"running_s",r,"sched_s",d.get("durations",{}).get("schedulingSecs"),"usd %.4f"%c)
print("TOTAL usd %.4f"%tot)
