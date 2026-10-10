import csv
H="/mnt/frankendom-donors/hedgewars-hw/hedgewars/"
R="/mnt/frankendom-donors/hedgewars-hw/"
N="hedgewars-hw"
rows=[
("drop director entry point", H+"uGearsUtils.pas",1584,"function SpawnBoxOfSmth: PGear;"),
("no drop while placing hogs or kings", H+"uGearsUtils.pas",1589,"if (PlacingHogs) or (PlacingKings) or"),
("crate count cap cMaxCaseDrops", H+"uGearsUtils.pas",1591,"or (CountGears(gtCase) >= cMaxCaseDrops)"),
("1-in-cCaseFactor roll", H+"uGearsUtils.pas",1592,"or (GetRandom(cCaseFactor) <> 0) then"),
("count of crates is CountGears gtCase", H+"uGearsUtils.pas",1500,"function CountGears(Kind: TGearType): Longword;"),
("health branch uses cHealthCaseProb as percent of 10000", H+"uGearsUtils.pas",1611,"h:= cHealthCaseProb * 100;"),
("ammo share is the remaining space split by ammo weight", H+"uGearsUtils.pas",1613,"a:= (10000-h)*aTot div (aTot+uTot)"),
("invulnerable games: no health crate, roll over ammo and utility weights", H+"uGearsUtils.pas",1609,"if ((GameFlags and gfInvulnerable) = 0) then"),
("invulnerable roll range is aTot+uTot", H+"uGearsUtils.pas",1617,"t:= GetRandom(aTot+uTot);"),
("ammo weight counts non-utility types", H+"uGearsUtils.pas",1599,"if (Ammoz[i].Ammo.Propz and ammoprop_Utility) = 0 then"),
("guard: no weights at all leaves the health branch", H+"uGearsUtils.pas",1608,"if (aTot+uTot) <> 0 then"),
("health crate amount cHealthCaseAmount", H+"uGearsUtils.pas",1626,"FollowGear^.Health:= cHealthCaseAmount;"),
("ammo box type set to the lowest enum value, not the roll", H+"uGearsUtils.pas",1639,"i:= Low(TAmmoType);"),
("box carries that AmmoType", H+"uGearsUtils.pas",1641,"FollowGear^.AmmoType:= i;"),
("box placed by FindPlace", H+"uGearsUtils.pas",1662,"FindPlace(FollowGear, true, 0, LAND_WIDTH);"),
("ammo roll walks weights with dec(t, Probability)", H+"uGearsUtils.pas",1731,"dec(t, Ammoz[i].Probability)"),
("GetAmmo is the weighted ammo pick", H+"uGearsUtils.pas",1711,"function GetAmmo(Hedgehog: PHedgehog): TAmmoType;"),
("GetUtility is the weighted utility pick", H+"uGearsUtils.pas",1737,"function GetUtility(Hedgehog: PHedgehog): TAmmoType;"),
("drop step inside turn-end state list", H+"uGears.pas",69,"stHealth, stSpawn, stDelay4,"),
("drop step skipped during multi-shoot", H+"uGears.pas",494,"if (not isInMultiShoot) then"),
("drop step calls SpawnBoxOfSmth", H+"uGears.pas",496,"tmpGear:= SpawnBoxOfSmth;"),
("drop step waits delayFinal", H+"uGears.pas",501,"delay:= delayFinal;"),
("delayFinal constant", H+"uGears.pas",79,"delayFinal = 100;"),
("DoDelay counts one unit per call", H+"uGears.pas",137,"if delay <= 0 then"),
("pickup finds crate within 36 by 36", H+"uGearsHedgehog.pas",1351,"t:= CheckGearNear(HHGear, gtCase, 36, 36);"),
("pickup call", H+"uGearsHedgehog.pas",1353,"PickUp(HHGear, t)"),
("PickUp procedure", H+"uGearsHedgehog.pas",788,"procedure PickUp(HH, Gear: PGear);"),
("pickup branch when the box has no preset type", H+"uGearsHedgehog.pas",808,"if Gear^.AmmoType <> amNothing then"),
("pickup branch comment for unresolved box", H+"uGearsHedgehog.pas",814,"// Add spawning here..."),
("pickup spawns an add-ammo gear with random delay", H+"uGearsHedgehog.pas",831,"GetRandom(125)+25);"),
("add-ammo step procedure", H+"uGearsHandlersMess.pas",6879,"procedure doStepAddAmmo(Gear: PGear);"),
("utility box uses GetUtility", H+"uGearsHandlersMess.pas",6896,"if Gear^.Pos = posCaseUtility then"),
("utility roll call", H+"uGearsHandlersMess.pas",6897,"a:= GetUtility(Gear^.Hedgehog)"),
("ammo roll call", H+"uGearsHandlersMess.pas",6898,"else a:= GetAmmo(Gear^.Hedgehog);"),
("random helper: GetRandom(m) is GetNext mod m", R+"hedgewars/uRandom.pas",93,"function GetRandom(m: LongWord): LongWord;"),
("GetRandom body", R+"hedgewars/uRandom.pas",96,"GetRandom:= GetNext mod m"),
("ammo probability levels", R+"hedgewars/uConsts.pas",377,"probabilityLevels: array [0..8] of LongWord = (0,20,30,60,100,200,400,600,800);"),
("ammo weight from scheme letter via levels", R+"hedgewars/uAmmos.pas",100,"Ammoz[a].Probability:= probabilityLevels"),
("default health share 35 percent", R+"hedgewars/uVariables.pas",2974,"cHealthCaseProb     := 35;"),
("default health amount 25", R+"hedgewars/uVariables.pas",2975,"cHealthCaseAmount   := 25;"),
("default drop frequency 1 in 5", R+"hedgewars/uVariables.pas",2983,"cCaseFactor     := 5;"),
("default crate cap 5", R+"hedgewars/uVariables.pas",2984,"cMaxCaseDrops   := 5;"),
("scheme/script can set CaseFreq", R+"hedgewars/uScript.pas",3837,"ScriptGetInteger('CaseFreq');"),
("engine header GPL version 2", H+"uGearsUtils.pas",7,"version 2 of the License"),
("licence file is GPL version 2", R+"COPYING",2,"Version 2, June 1991"),
("hinted mission file places scripted supply crates", R+"share/hedgewars/Data/Missions/Campaign/A_Space_Adventure/desert01.lua",149,"SpawnSupplyCrate(btorch3X, btorch3Y, amBlowTorch)"),
]
with open("receipts.tsv","a",newline="") as f:
    w=csv.writer(f,delimiter="\t",quoting=csv.QUOTE_NONE,lineterminator="\n")
    for claim,fp,ln,q in rows:
        assert "\t" not in q
        w.writerow([N,claim,fp,str(ln),q])
print(len(rows))
