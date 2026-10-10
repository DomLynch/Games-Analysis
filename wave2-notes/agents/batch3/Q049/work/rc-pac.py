A='/mnt/frankendom-donors/keldaanCommunity-pokemonAutoChess/app/'
EM=A+'models/colyseus-models/experience-manager.ts'
EXP=A+'config/game/experience.ts'
GC=A+'rooms/commands/game-commands.ts'
GR=A+'rooms/game-room.ts'
UM=A+'models/mongo-models/user-metadata.ts'
AB=A+'core/abilities/abilities.ts'
PL=A+'models/colyseus-models/player.ts'
PE=A+'core/pokemon-entity.ts'
SE=A+'core/evolution-logic/stack-evolution-handler.ts'
N='keldaanCommunity-pokemonAutoChess'
rows=[
("team level starts at 2 with expNeeded from table",EM,19,"this.expNeeded = ExpTable[2]"),
("team level max is 9 in the manager",EM,20,"this.maxLevel = 9"),
("addExperience carry loop",EM,27,"addExperience(quantity: number): number {"),
("loop pays the table cost and steps the level",EM,30,"expToAdd -= ExpTable[this.level]"),
("loop condition checks stored plus gain against the cost",EM,44,"this.experience + quantity >= ExpTable[this.level] &&"),
("stored remainder only written below max level",EM,34,"if (this.level < this.maxLevel) {"),
("remainder stored",EM,35,"this.experience += expToAdd"),
("returns the XP that counted",EM,39,"return quantity - expToAdd"),
("level step can be seen in the expNeeded refresh",EM,32,"this.expNeeded = ExpTable[this.level] ?? 255"),
("table comment: XP to move from n to n+1",EXP,8,"// Experience required to move from level n to level n+1"),
("table entry for level 2",EXP,11,"2: 2,"),
("max level constant",EXP,6,"export const MAX_LEVEL = 9"),
("account exp threshold",EXP,4,"export const ExpThreshold = 1000"),
("rank exp table",EXP,2,"export const ExpPlace = [700, 400, 350, 300, 250, 200, 200, 200]"),
("buy-level command: money check and canLevelUp",GC,1092,"if (player.money >= cost && player.experienceManager.canLevelUp()) {"),
("buy-level grants 4 XP",GC,1093,"player.addExperience(4)"),
("buy-level cost comes from getLevelUpCost",GC,1091,"const cost = getLevelUpCost(this.state.specialGameRule)"),
("round income only for alive non-bot players",GC,1420,"if (player.alive && !player.isBot) {"),
("round income grants 2 XP",GC,1451,"player.addExperience(2)"),
("rank XP at game end",GR,995,"const exp = ExpPlace[rank - 1]"),
("account level-up: one step when exp plus award reaches threshold",UM,252,"if (user.exp + exp >= ExpThreshold) {"),
("account exp carry",UM,255,"user.exp = user.exp + exp - ExpThreshold"),
("giveUserExp signature",UM,251,"export function giveUserExp(user: IUserMetadataMongo, exp: number) {"),
("Knowledge Thief strategy class",AB,619,"export class KnowledgeThiefStrategy extends AbilityStrategy {"),
("thief XP gate on the owner player",AB,629,"if (pokemon.player && !pokemon.isGhostOpponent) {"),
("thief XP by star level: 1 1 1 2 3",AB,630,"const xpGain = [1, 1, 1, 2, 3][pokemon.stars - 1] ?? 3"),
("thief XP is the amount the player actually gained",AB,631,"const xpActuallyGained = pokemon.player.addExperience(xpGain)"),
("thief pokemon stack gain uses the returned amount",AB,632,"pokemon.addStack(xpActuallyGained)"),
("player.addExperience returns the manager result",PL,284,"const xpActuallyGained = this.experienceManager.addExperience(value)"),
("addStack ignores pokemon without a player",PE,1824,"if (!this.player) return"),
("addStack adds the amount to the board stacks",PE,1825,"this.refToBoardPokemon.stacks += amount"),
("evolution gate uses exact equality",PE,1831,"this.stacks === this.stacksRequired"),
("evolution handler uses greater-or-equal",SE,10,"return pokemon.stacks >= pokemon.stacksRequired"),
]
print('\t'.join(['note','claim','donor_file','line','quote']))
for c,f,l,q in rows:
    assert '\t' not in q
    print('\t'.join([N,c,f,str(l),q]))
