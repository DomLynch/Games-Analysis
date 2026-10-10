cd /mnt/frankendom-donors
for r in eriknihlen/OpenAC Sziadan/open-midgard nmeylan/nostalro-client vE5li/korangar greenboxal/fimbulclient guilhermelhr/unityro kivutar/goro drgomesp/midgarts gesior/otwebclient mattyx14/TheForgottenTibiaClient kcopelandmgmt/Shadowbane WarEmu/WarEmu Shmerrick/ProjectWAR daochook/daochook; do
  n=$(echo $r | tr / -)
  [ -d $n ] && { echo "$n exists"; continue; }
  if timeout 400 git clone -q --depth 1 https://github.com/$r.git $n 2>/dev/null; then rm -rf $n/.git; echo "OK  $n $(du -sh $n | cut -f1) lic=$(ls $n | grep -iE '^(licen[sc]e|copying)' | head -1)"; else echo "FAIL $r"; fi
done
