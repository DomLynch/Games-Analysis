G="0ad-0ad"
P="/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Promotion.js"
A="/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/helpers/Attack.js"
H="/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Health.js"
L="/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Loot.js"
HE="/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/components/Heal.js"
T="/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/helpers/Transform.js"
TI="/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/templates/template_unit_infantry.xml"
TC="/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/templates/template_unit_cavalry.xml"
rows=[
("XP read through value modifiers for required XP",P,24,"return ApplyValueModificationsToEntity(\"Promotion/RequiredXp\""),
("IncreaseXp is the single entry point that adds XP",P,57,"Promotion.prototype.IncreaseXp = function(amount)"),
("IncreaseXp adds the amount to the current XP counter",P,69,"this.currentXp += +amount;"),
("IncreaseXp reads the required XP for the current tier",P,70,"let requiredXp = this.GetRequiredXp();"),
("Promotion is triggered only when current XP reaches required XP",P,72,"if (this.currentXp >= requiredXp)"),
("Promotion subtracts the current tier requirement and carries the rest",P,80,"this.currentXp -= requiredXp;"),
("Multi-tier promotion: loop checks for further upgrades",P,82,"// check if we can upgrade a second time (or even more)"),
("Each further tier requirement read via value modifiers on the template",P,88,"requiredXp = ApplyValueModificationsToTemplate(\"Promotion/RequiredXp\""),
("Loop stops when carried XP is below the next tier requirement",P,90,"if (this.currentXp < requiredXp)"),
("Loop moves to the next template",P,93,"promotedTemplateName = template.Promotion.Entity;"),
("Template change happens once after the loop",P,95,"this.Promote(promotedTemplateName);"),
("Promotion posts ExperienceChanged after every XP change",P,98,"Engine.PostMessage(this.entity, MT_ExperienceChanged, {});"),
("Dead units are not promoted",P,40,"if (cmpHealth && cmpHealth.GetHitpoints() == 0)"),
("Promote swaps the entity template in place",P,46,"ChangeEntityTemplate(this.entity, promotedTemplateName);"),
("Already-promoted old entity forwards XP to its successor",P,63,"let cmpPromotion = Engine.QueryInterface(this.promotedUnitEntity, IID_Promotion);"),
("Trickle XP timer interval is 1000 ms",P,124,"cmpTimer.SetInterval(this.entity, IID_Promotion, \"TrickleTick\", 1000, 1000, null);"),
("Trickle tick adds the trickle rate as XP",P,129,"this.IncreaseXp(this.trickleRate);"),
("Attacker gains XP from its hits via the attack helper",A,342,"let cmpPromotion = Engine.QueryInterface(data.attacker, IID_Promotion);"),
("No XP from status-effect damage",A,338,"// We do not want an entity to get XP from active Status Effects."),
("Attack helper credits targetState.xp to the attacker",A,343,"if (cmpPromotion && targetState.xp)"),
("Attack helper credits targetState.xp to the attacker (call)",A,344,"cmpPromotion.IncreaseXp(targetState.xp);"),
("Health.TakeDamage computes XP for the attacker",H,188,"Health.prototype.TakeDamage = function(amount, attacker, attackerOwner)"),
("XP computed only on a real health loss with Loot xp",H,196,"if (cmpLoot && cmpLoot.GetXp() > 0 && change.healthChange < 0)"),
("XP = victim loot xp x health removed / victim max health",H,197,"change.xp = cmpLoot.GetXp() * -change.healthChange / this.GetMaxHitpoints();"),
("Loot xp is read through value modifiers and floored",L,15,"return Math.floor(ApplyValueModificationsToEntity(\"Loot/xp\""),
("Healer Promotion lookup for healing XP",HE,228,"let cmpPromotion = Engine.QueryInterface(this.entity, IID_Promotion);"),
("Healer XP = healed amount share x victim loot xp",HE,231,"cmpPromotion.IncreaseXp((targetState.new - targetState.old)"),
("Transform reads the old entity's XP counter",T,82,"let cmpPromotion = Engine.QueryInterface(oldEnt, IID_Promotion);"),
("Transform hands the old XP counter to the new entity",T,87,"cmpNewPromotion.IncreaseXp(cmpPromotion.GetCurrentXp());"),
("Infantry Loot xp is 100 (theirs)",TI,44,"    <xp>100</xp>"),
("Infantry RequiredXp is 100 (theirs)",TI,54,"<RequiredXp>100</RequiredXp>"),
("Cavalry Loot xp is 130 (theirs)",TC,39,"    <xp>130</xp>"),
("Cavalry RequiredXp is 150 (theirs)",TC,49,"<RequiredXp>150</RequiredXp>"),
("Attack Damage effect dispatches to Health.TakeDamage (data file)","/mnt/frankendom-donors/0ad-0ad/binaries/data/mods/public/simulation/data/attack_effects/damage.json",5,"\"method\": \"TakeDamage\","),
("Attack effects handler is the caller that credits attacker XP",A,303,"AttackHelper.prototype.HandleAttackEffects = function(target, data, bonusMultiplier = 1)"),
("Heal function that credits healer XP",HE,204,"Heal.prototype.PerformHeal = function(data, lateness)"),
("Template change function that carries XP to the new entity",T,4,"function ChangeEntityTemplate(oldEnt, newTemplate)"),
]
import sys
out=open("/private/tmp/p2/wave2-haiku/batch3/Q050/receipts.tsv","w")
out.write("\t".join(["note","claim","donor_file","line","quote"])+"\n")
for claim,path,line,q in rows:
    assert "\t" not in q and 15<=len(q)<=90, (len(q),q)
    out.write("\t".join([G,claim,path,str(line),q])+"\n")
out.close()
print(len(rows),"rows written")
