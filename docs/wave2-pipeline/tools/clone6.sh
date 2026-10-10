cd /mnt/frankendom-donors
while pgrep -f clone5.sh >/dev/null; do sleep 5; done
clone(){ n=$1; u=$2; [ -d $n ] && { echo "$n exists"; return; }
  if timeout 500 git clone -q --depth 1 $u $n 2>/dev/null; then rm -rf $n/.git; echo "OK  $n $(du -sh $n | cut -f1) lic=$(ls $n | grep -iE '^(licen[sc]e|copying)' | head -1)"; else echo "FAIL $u"; fi; }
clone xyeppp-RoR-Interface https://github.com/xyeppp/RoR-Interface.git
clone deregtd-AC2D https://github.com/deregtd/AC2D.git
clone shoff-ShadowbaneCacheViewer https://github.com/shoff/ShadowbaneCacheViewer.git
clone blinkdog-ShadowbaneCacheExporter https://github.com/blinkdog/ShadowbaneCacheExporter.git
clone MelvinGr-ProjectFaolan https://github.com/MelvinGr/ProjectFaolan.git
clone ao-data-albiondata-client https://github.com/ao-data/albiondata-client.git
df -h /mnt/frankendom-donors | tail -1
