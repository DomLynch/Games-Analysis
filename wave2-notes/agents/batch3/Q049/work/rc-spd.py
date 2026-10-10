D='/mnt/frankendom-donors/00-Evan-shattered-pixel-dungeon/core/src/main/java/com/shatteredpixel/shatteredpixeldungeon/'
MOB=D+'actors/mobs/Mob.java'
HERO=D+'actors/hero/Hero.java'
TAL=D+'actors/hero/Talent.java'
EC=D+'items/artifacts/EtherealChains.java'
AB=D+'actors/buffs/AllyBuff.java'
N='00-Evan-shattered-pixel-dungeon'
rows=[
("Mob EXP default is 1",MOB,133,"public int EXP = 1;"),
("Mob maxLvl defaults to MAX_LEVEL minus one",MOB,134,"public int maxLvl = Hero.MAX_LEVEL-1;"),
("kill XP is zero when hero level is above the mob max level",MOB,988,"int exp = Dungeon.hero.lvl <= maxLvl ? EXP : 0;"),
("ascension fallback gives 10 times spawning weight",MOB,994,"exp == 0 && maxLvl > 0 && EXP > 0 && Dungeon.hero.lvl < Hero.MAX_LEVEL){"),
("ascension fallback formula",MOB,995,"exp = Math.round(10 * spawningWeight());"),
("kill XP is granted through earnExp with the mob class",MOB,1001,"Dungeon.hero.earnExp(exp, getClass());"),
("spawningWeight defaults in the base class",MOB,1168,"public float spawningWeight(){"),
("earnExp signature",HERO,2010,"public void earnExp( int exp, Class source ) {"),
("ascension-sourced XP does not add to the total",HERO,2013,"if (source != AscensionChallenge.class) {"),
("exp is added to the ledger",HERO,2014,"this.exp += exp;"),
("percent of the level bar is exp over maxExp",HERO,2016,"float percent = exp/(float)maxExp();"),
("chains meter is charged by the bar fraction",HERO,2019,"if (chains != null) chains.gainExp(percent);"),
("rejuvenating furrow counts down by percent x 200",HERO,2038,"countDown(percent*200f);"),
("level loop: subtract the level cost and continue",HERO,2058,"while (this.exp >= maxExp()) {"),
("level loop subtracts the current level cost",HERO,2059,"this.exp -= maxExp();"),
("level up only below MAX_LEVEL",HERO,2066,"if (lvl < MAX_LEVEL) {"),
("at the cap, Bless is prolonged",HERO,2079,"Buff.prolong(this, Bless.class, Bless.DURATION);"),
("MAX_LEVEL is 30",HERO,205,"public static final int MAX_LEVEL = 30;"),
("maxExp(level) = 5 + 5 x level",HERO,2115,"return 5 + lvl * 5;"),
("maxExp() reads the current level",HERO,2111,"return maxExp( lvl );"),
("max HP per level: 20 + 5 x (level - 1) plus boosts",HERO,263,"HT = 20 + 5*(lvl-1) + HTBoost;"),
("talent tier thresholds",TAL,436,"public static int[] tierLevelThresholds"),
("talent tiers constant",TAL,960,"public static final int MAX_TALENT_TIERS = 4;"),
("tier 3 needs a subclass",HERO,395,"|| (tier == 3 && subClass == HeroSubClass.NONE)"),
("points available in the partial tier",HERO,401,"return 1 + lvl - Talent.tierLevelThresholds[tier] - talentPointsSpent(tier)"),
("divine inspiration adds two points for a boosted tier",HERO,411,"isBoosted(tier)) {"),
("EtherealChains: exp gains charge fraction times 100",EC,347,"exp += Math.round(levelPortion*100);"),
("EtherealChains soft cap test",EC,350,"if (charge > 5+(level()*2)){"),
("EtherealChains slows the fraction past the soft cap",EC,351,"levelPortion *= (5+((float)level()*2))/charge;"),
("EtherealChains partial charge times 6",EC,353,"partialCharge += levelPortion*6f;"),
("EtherealChains level-up threshold",EC,355,"if (exp > 100+level()*100 && level() < levelCap){"),
("ally kills use the same level cutoff",AB,73,"int exp = hero.lvl <= enemy.maxLvl ? enemy.EXP : 0;"),
]
print('\t'.join(['note','claim','donor_file','line','quote']))
for c,f,l,q in rows:
    assert '\t' not in q
    print('\t'.join([N,c,f,str(l),q]))
