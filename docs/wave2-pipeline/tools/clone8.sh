cd /mnt/frankendom-donors
while pgrep -f "clone5.sh|clone6.sh|clone7.sh" >/dev/null; do sleep 5; done
clone(){ n=$1; u=$2; restricted=$3; [ -d $n ] && { echo "$n exists"; return; }
  if timeout 600 git clone -q --depth 1 $u $n 2>/dev/null; then rm -rf $n/.git
    [ -n "$restricted" ] && echo "RESTRICTED: $restricted. Study shape/idea only; never copy code, constants or text. Added 2026-10-10 on Dom's instruction." > $n/_RESTRICTED-NOTE.txt
    echo "OK  $n $(du -sh $n | cut -f1) lic=$(ls $n | grep -iE '^(licen[sc]e|copying)' | head -1)"
  else echo "FAIL $u"; fi; }
clone dereth-network-dereth https://github.com/dereth-network/dereth.git ""
clone kblaschke-Iris2 https://github.com/kblaschke/Iris2.git ""
clone xrip-uo-client https://github.com/xrip/uo-client.git "rebuilt from decompilation of Origin's original UO client"
clone CapnBry-excalibar https://github.com/CapnBry/excalibar.git ""
clone Mag-nus-acclient-AI-RE https://github.com/Mag-nus/acclient-AI-RE.git "decompiled proprietary Asheron's Call client (Turbine)"
df -h /mnt/frankendom-donors | tail -1
