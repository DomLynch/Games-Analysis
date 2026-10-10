cd /mnt/frankendom-donors
clone(){ n=$1; u=$2; restricted=$3; [ -d $n ] && { echo "$n exists"; return; }
  if timeout 800 git clone -q --depth 1 $u $n 2>/dev/null; then rm -rf $n/.git
    [ -n "$restricted" ] && echo "RESTRICTED: $restricted. Study shape/idea only; never copy code, constants or text. Added 2026-10-10 on Dom's instruction." > $n/_RESTRICTED-NOTE.txt
    echo "OK  $n $(du -sh $n | cut -f1) lic=$(ls $n | grep -iE '^(licen[sc]e|copying)' | head -1)"
  else echo "FAIL $u"; fi; }
L="leaked official SWG (Sony Online/Disney) source, proprietary, no licence"
clone SWG-Source-client-tools https://github.com/SWG-Source/client-tools.git "$L"
clone SWG-Source-src https://github.com/SWG-Source/src.git "$L"
clone SWG-Source-dsrc https://github.com/SWG-Source/dsrc.git "$L"
clone ptklatt-Utinni https://github.com/ptklatt/Utinni.git ""
clone ChairGraveyard-GalaxyExtender https://github.com/ChairGraveyard/GalaxyExtender.git ""
clone maddogg221-SWGVulkanClient https://github.com/maddogg221/SWGVulkanClient.git ""
clone t-harper-swg-client-ts https://github.com/t-harper/swg-client-ts.git ""
clone brendenbowers-SWGEmuClient https://github.com/brendenbowers/SWGEmuClient.git ""
clone ProjectSWGCore-Holocore https://github.com/ProjectSWGCore/Holocore.git ""
clone Inorien-AOReloaded https://github.com/Inorien/AOReloaded.git ""
clone CellAO-CellAO-NightPredator https://github.com/CellAO/CellAO-NightPredator.git ""
clone bearlikelion-WoWdot https://github.com/bearlikelion/WoWdot.git ""
clone Clancey-WowUnreal https://github.com/Clancey/WowUnreal.git ""
clone Reinisch-Warcraft-Arena-Unity https://github.com/Reinisch/Warcraft-Arena-Unity.git ""
clone mpstark-DynamicCam https://github.com/mpstark/DynamicCam.git ""
clone Gethe-wow-ui-source https://github.com/Gethe/wow-ui-source.git "Blizzard proprietary WoW UI code (shipped to players), no licence"
clone Segs-Segs https://github.com/Segs/Segs.git ""
clone Segs-Segs-Client https://github.com/Segs/Segs-Client.git ""
clone saveme712-CoHClient https://github.com/saveme712/CoHClient.git ""
clone hdneo-mxo-hd https://github.com/hdneo/mxo-hd.git ""
clone psforever-PSF-LoginServer https://github.com/psforever/PSF-LoginServer.git ""
clone EvEmu-Project-evemu_Crucible https://github.com/EvEmu-Project/evemu_Crucible.git ""
df -h /mnt/frankendom-donors | tail -1
