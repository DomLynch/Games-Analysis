cd /mnt/frankendom-donors
for r in latentcollapse/RustDAoC esponges/daoc-web BifrostTitan/DAoC-Client-Lib BifrostTitan/daoc-niflib dol-leodagan/DaocClientLib shadowofze/OfflineDAoC Eve-of-Darkness/dark-forge Merec/DAoC-MapCreator atom0s/craft_extract; do
  n=$(echo $r | tr / -)
  [ -d $n ] && { echo "$n exists"; continue; }
  if timeout 400 git clone -q --depth 1 https://github.com/$r.git $n 2>/dev/null; then rm -rf $n/.git; echo "OK  $n $(du -sh $n | cut -f1) files=$(find $n -type f | wc -l) lic=$(ls $n | grep -iE '^(licen[sc]e|copying)' | head -1)"; else echo "FAIL $r"; fi
done
echo ---; head -c 900 RustDAoC/README.md 2>/dev/null; echo; ls RustDAoC | head -20; grep -rli camera RustDAoC --include=*.rs 2>/dev/null | head -5
