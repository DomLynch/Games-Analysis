cd /mnt/frankendom-donors
clone(){ n=$1; u=$2; restricted=$3; [ -d $n ] && { echo "$n exists"; return; }
  if timeout 500 git clone -q --depth 1 $u $n 2>/dev/null; then rm -rf $n/.git
    [ -n "$restricted" ] && echo "RESTRICTED: $restricted. Study shape/idea only; never copy code or constants. Added 2026-10-10 on Dom's instruction." > $n/_RESTRICTED-NOTE.txt
    echo "OK  $n $(du -sh $n | cut -f1) lic=$(ls $n | grep -iE '^(licen[sc]e|copying)' | head -1)"
  else echo "FAIL $u"; fi; }
clone 117HD-RLHD https://github.com/117HD/RLHD.git ""
clone neilrush-Camera-Keys https://github.com/neilrush/Camera-Keys.git ""
clone 2003scape-rsc-c https://github.com/2003scape/rsc-c.git ""
clone Danjb1-rsc-remastered https://github.com/Danjb1/rsc-remastered.git "no licence; derived from RuneScape Classic client"
clone 2009scape-rt4-client https://gitlab.com/2009scape/rt4-client.git "Jagex-derived RuneScape rev 530 client"
clone darkanrs-client https://gitlab.com/darkanrs/client.git "Jagex-derived RuneScape client"
clone RuneStar-client https://github.com/RuneStar/client.git "Jagex-derived OSRS client"
clone Rabrg-refactored-client https://github.com/Rabrg/refactored-client.git "Jagex-derived RuneScape 317 client"
clone Jameskmonger-317refactor https://github.com/Jameskmonger/317refactor.git "Jagex-derived RuneScape 317 client"
