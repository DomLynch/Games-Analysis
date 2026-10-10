AF='/mnt/frankendom-donors/openmw/'
LL=AF+'apps/openmw/mwmechanics/levelledlist.cpp'
WI=AF+'apps/openmw/mwworld/worldimp.cpp'
WD=AF+'apps/openmw/mwgui/waitdialog.cpp'
CS=AF+'apps/openmw/mwworld/cellstore.cpp'
TS=AF+'apps/openmw/mwworld/timestamp.cpp'
CR=AF+'apps/openmw/mwclass/creature.cpp'
LIC=AF+'LICENSE'
N='openmw'
rows=[
("levelled list entry point takes an optional level, default player level",LL,18,"ESM::RefId getLevelledItem("),
("player level read from creature stats when no level is given",LL,29,"playerLevel = player.getClass().getCreatureStats(player).getLevel();"),
("none-chance roll: 0 to 99 below mChanceNone gives no item",LL,33,"if (Misc::Rng::roll0to99(prng) < levItem->mChanceNone)"),
("highest tier at or below the player level is found first",LL,40,"if (levelledItem.mLevel > highestLevel && levelledItem.mLevel <= playerLevel)"),
("all-levels flag for items",LL,45,"bool allLevels = (levItem->mFlags & ESM::ItemLevList::AllLevels) != 0;"),
("all-levels flag for creatures: flags swapped in the file format",LL,47,"allLevels = levItem->mFlags & ESM::CreatureLevList::AllLevels;"),
("candidates: entries at or below the player level, at the top tier unless all-levels",LL,51,"(allLevels || levelledItem.mLevel == highestLevel))"),
("uniform pick among candidates",LL,56,"const ESM::RefId& item = *candidates[Misc::Rng::rollDice(candidates.size(), prng)];"),
("missing item is ignored and returns empty (no reroll)",LL,61,"Warning: ignoring nonexistent item"),
("nested item list: recurses with the same level",LL,76,"return getLevelledItem(ref.getPtr().get<ESM::ItemLevList>()->mBase"),
("nested creature list: recurses with the same level",LL,78,"return getLevelledItem(ref.getPtr().get<ESM::CreatureLevList>()->mBase"),
("spawnRandomCreature signature",WI,3606,"void World::spawnRandomCreature(const ESM::RefId& creatureList)"),
("spawn count GMST read",WI,3610,'find("iNumberCreatures")->mValue.getInteger();'),
("spawn count: one plus a roll below iNumberCreatures",WI,3611,"int numCreatures = 1 + Misc::Rng::rollDice(iNumberCreatures, mPrng);"),
("each spawn picks from the list at player level",WI,3615,"MWMechanics::getLevelledItem(list, true, mPrng);"),
("empty pick is skipped",WI,3616,"if (selectedCreature.empty())"),
("placed 220 units from the player, direction 0",WI,3621,"safePlaceObject(ref.getPtr(), getPlayerPtr(), getPlayerPtr().getCell(), 0, 220.f);"),
("safe placement fallback directions",WI,1321,"int fallbackDirections[4] = { direction, (direction + 3) % 4"),
("rest interruption entry",WD,189,"void WaitDialog::startWaiting(int hoursToWait)"),
("interruption only when sleeping outdoors",WD,204,"if (mSleeping && player.getCell()->isExterior())"),
("interruption only when the region has a sleep list",WD,210,"if (!region->mSleepList.empty())"),
("interruption roll: one die over the hours to wait",WD,213,"int x = Misc::Rng::rollDice(hoursToWait, world->getPrng());"),
("interruption if roll is below fSleepRandMod times hours",WD,216,"if (x < fSleepRandMod * hoursToWait)"),
("interrupt time from fSleepRestMod times hours",WD,220,"int interruptAtHoursRemaining = int(fSleepRestMod * hoursToWait);"),
("interrupt time stored as hours elapsed",WD,223,"mInterruptAt = hoursToWait - interruptAtHoursRemaining;"),
("interrupt uses the region sleep list",WD,224,"mInterruptCreatureList = region->mSleepList;"),
("interrupt advances one hour at a time",WD,262,"getWorld()->advanceTime(1);"),
("interrupt spawns a random creature and stops waiting",WD,272,"spawnRandomCreature(mInterruptCreatureList);"),
("cell respawn entry",CS,1223,"void CellStore::respawn()"),
("cell respawn time gate uses months from a GMST",CS,1229,"- mLastRespawn > 24 * 30 * iMonthsToRespawn)"),
("GMST iMonthsToRespawn read",CS,1228,'find("iMonthsToRespawn")->mValue.getInteger();'),
("cell respawn stamps the time it ran",CS,1231,"mLastRespawn = MWBase::Environment::get().getWorld()->getTimeStamp();"),
("creature respawn pass: clear corpse, then respawn",CS,1250,"clearCorpse(ptr, mStore);"),
("timestamp difference is computed in hours",TS,90,"double operator-(const TimeStamp& left, const TimeStamp& right)"),
("timestamp difference: days times 24 plus hours",TS,109,"return hours + 24 * days;"),
("creature respawn: alive actors are left alone",CR,804,"if (ptr.getCellRef().getCount() > 0 && !creatureStats.isDead())"),
("creature respawn waits for the death animation",CR,807,"if (!creatureStats.isDeathAnimationFinished())"),
("creature respawn delay: clear delay or the smaller of respawn and clear",CR,816,"? fCorpseClearDelay : std::min(fCorpseRespawnDelay, fCorpseClearDelay);"),
("creature respawn needs the Respawn flag and time of death plus delay",CR,819,"&& creatureStats.getTimeOfDeath() + delay <="),
("licence: GNU GPL",LIC,1,"GNU GENERAL PUBLIC LICENSE"),
("licence: version 3",LIC,2,"Version 3, 29 June 2007"),
]
path='/private/tmp/p2/wave2-haiku/batch3/Q001/receipts.tsv'
new=[]
for claim,f,l,q in rows:
    assert '\t' not in q and 15<=len(q)<=90, (claim,len(q))
    new.append('\t'.join([N,claim,f,str(l),q]))
open(path,'a').write('\n'.join(new)+'\n')
print(len(new),'rows appended')
