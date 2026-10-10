cd /mnt/frankendom-donors
while pgrep -f "clone5.sh|clone6.sh" >/dev/null; do sleep 5; done
clone(){ n=$1; u=$2; restricted=$3; [ -d $n ] && { echo "$n exists"; return; }
  if timeout 600 git clone -q --depth 1 $u $n 2>/dev/null; then rm -rf $n/.git
    [ -n "$restricted" ] && echo "RESTRICTED: $restricted. Study shape/idea only; never copy code, constants or text. Added 2026-10-10 on Dom's instruction." > $n/_RESTRICTED-NOTE.txt
    echo "OK  $n $(du -sh $n | cut -f1) lic=$(ls $n | grep -iE '^(licen[sc]e|copying)' | head -1)"
  else echo "FAIL $u"; fi; }
clone shnok-l2-unity https://github.com/shnok/l2-unity.git ""
clone realratchet-Lineage2JS https://github.com/realratchet/Lineage2JS.git ""
clone elberacasa-Lineage2Elbera https://github.com/elberacasa/Lineage2Elbera.git ""
clone opensro-dev-opensro https://github.com/opensro-dev/opensro.git ""
clone Doddler-RagnarokRebuildTcp https://github.com/Doddler/RagnarokRebuildTcp.git ""
clone wcassis-willeq https://github.com/wcassis/willeq.git ""
clone eq-p99-tools-eq-client https://github.com/eq-p99-tools/eq-client.git ""
clone djhenry-eqoxide https://github.com/djhenry/eqoxide.git ""
clone knervous-eqsage https://github.com/knervous/eqsage.git ""
clone bernatvadell-muonline https://github.com/bernatvadell/muonline.git ""
clone uglyoldbob-l1j-client https://github.com/uglyoldbob/l1j-client.git ""
clone Elem8100-MapleNecrocer https://github.com/Elem8100/MapleNecrocer.git ""
clone ryantpayton-MapleStory-Client https://github.com/ryantpayton/MapleStory-Client.git ""
clone sven-n-MuMain https://github.com/sven-n/MuMain.git "leaked Webzen MU Online client source (community-maintained), no licence"
clone NakiuS-Metin2Client https://github.com/NakiuS/Metin2Client.git "leaked Metin2 client source, no valid licence"
df -h /mnt/frankendom-donors | tail -1
