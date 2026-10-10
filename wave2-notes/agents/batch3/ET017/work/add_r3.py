B='/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/'
L='/mnt/frankendom-donors/pmbstyle-L2Solo/LICENSE'
n='pmbstyle-L2Solo'
rows=[
(n,'licence: Apache License 2.0 (LICENSE line 2)',L,'2','Version 2.0, January 2004'),
(n,'listing gate: classify uses funded demand minus supply',B+'MarketListingPolicy.js','137','const availableUnits = Math.max(0, actionableUnits - market.supply.units);'),
(n,'listing count capped at available funded units',B+'MarketListingPolicy.js','142','listCount: Math.min(Number(item.count), availableUnits),'),
(n,'saturated when no funded room is left',B+'MarketListingPolicy.js','138','if (availableUnits <= 0) return surplusGearDecision(item, \'saturated\', market);'),
(n,'no demand at all sends stock to NPC or warehouse',B+'MarketListingPolicy.js','133','return surplusGearDecision(item, \'no_demand\', market);'),
(n,'unit price is a competition price: rival ask and NPC price, cheaper wins',B+'MarketListingPolicy.js','184','const competition = Math.min(Number(decision?.market?.supply?.minimumPrice'),
(n,'undercut is 98 percent of the competition price',B+'MarketListingPolicy.js','186','const competitivePrice = Math.floor(competition * 0.98);'),
(n,'no listing when the floor is above the undercut price',B+'MarketListingPolicy.js','187','if (minimum > competitivePrice) {'),
(n,'listed price is the preferred ask, bounded by floor and undercut',B+'MarketListingPolicy.js','199','return Math.max(minimum, Math.min(preferred, competitivePrice));'),
(n,'floor is 60 percent of the reference (BotMarketPricing)',B+'BotMarketPricing.js','53','return priceAt(item, 0.60);'),
(n,'reference price = min(scaled base, cheapest NPC price)',B+'BotMarketPricing.js','45','return Math.min(BotEconomyPricing.scalePrice(item?.basePrice), npcPrice(item));'),
(n,'priceAt floors the ratio times reference, minimum 1',B+'BotMarketPricing.js','49','return Math.max(1, Math.floor(referencePrice(item) * ratio));'),
(n,'MIN_LISTING_BASE_PERCENT = 60 is defined and exported',B+'MarketListingPolicy.js','13','const MIN_LISTING_BASE_PERCENT = 60;'),
(n,'NPC sink price is half of base price',B+'MarketListingPolicy.js','236','npcPrice: Math.max(1, Math.floor(Number(decision.item.basePrice || 0) * 0.5))'),
(n,'NPC liquidation half-base sink also in ItemDisposition',B+'ItemDisposition.js','492','npcPrice: Math.max(1, Math.floor(item.basePrice * 0.5))'),
(n,'NPC liquidation unit price cap 1000',B+'ItemDisposition.js','12','const NPC_LIQUIDATION_MAX_UNIT_PRICE = 1000;'),
(n,'seller spread is 70 to 90 percent from character and item seed',B+'ItemDisposition.js','54','const percent = 70 + (Math.abs(seed) % 21);'),
(n,'seed = characterId x 31 plus selfId x 17',B+'ItemDisposition.js','53','const seed = (Number(state.characterId || 0) * 31) + (Number(item.selfId || 0) * 17);'),
(n,'learned multiplier clamped between 50 and 100 percent',B+'ItemDisposition.js','55','const adjustment = Math.max(50, Math.min(100, Number(state?.stats?.marketPricing'),
(n,'ask = reference times spread times multiplier',B+'ItemDisposition.js','56','percent * adjustment / 10000);'),
(n,'adena rate scales every price (economyRate)',B+'BotEconomyPricing.js','7','return Math.max(0.01, Number(ProgressionRates.profile().adena || 1));'),
(n,'scalePrice multiplies base value by the economy rate',B+'BotEconomyPricing.js','11','const price = Math.floor(Math.max(0, Number(value) || 0) * economyRate());'),
(n,'wanted signal lives 30 minutes',B+'MarketDemandIndex.js','3','const WANTED_TTL_MS = 30 * 60 * 1000;'),
(n,'funded units per signal: min(amount, budget divided by unit price)',B+'MarketDemandIndex.js','146','return Math.min(signal.amount, Math.floor(signal.budget / unitPrice));'),
(n,'funded demand total across ready signals',B+'MarketDemandIndex.js','156','fundedUnits: signals.reduce((sum, signal) => sum + affordableUnits(signal), 0)'),
(n,'listing lifetime 20 minutes',B+'ColdMarketListingService.js','19','const DEFAULT_LISTING_MS = 20 * 60 * 1000;'),
(n,'speculative listing lifetime 5 minutes',B+'ColdMarketListingService.js','20','const SPECULATIVE_LISTING_MS = 5 * 60 * 1000;'),
(n,'listing review every 2 minutes',B+'ColdMarketListingService.js','21','const LISTING_REVIEW_MS = 2 * 60 * 1000;'),
(n,'sell retry after 30 minutes',B+'ColdMarketListingService.js','22','const SELL_RETRY_DELAY_MS = 30 * 60 * 1000;'),
(n,'unsold expiry lowers the multiplier by 5, floor 50, never raised',B+'ColdMarketListingService.js','756','percent: Math.max(50, Number(previous.percent || 100) - 5),'),
(n,'speculative failure only on expiry of a speculative listing',B+'ColdMarketListingService.js','750','const speculativeFailed = item.marketReason === \'speculative_demand\''),
(n,'speculative minimum base price 10000',B+'MarketListingPolicy.js','11','const SPECULATIVE_GEAR_MIN_BASE_PRICE = 10000;'),
(n,'material shelf: 200 units total, seller limit 2 to 4',B+'MarketListingPolicy.js','122','const sellerLimit = Math.max(2, Math.min(4, recentBuyers));'),
(n,'material shelf total of 200 units',B+'MarketListingPolicy.js','123','const units = Math.max(0, 200 - market.supply.units);'),
(n,'competitive units use 5 percent band above unit price',B+'MarketListingPolicy.js','89','Number(offer.price || 0) <= Math.ceil(unitPrice * 1.05)'),
]
with open('receipts.tsv','a') as f:
    for r in rows:
        assert '\t' not in r[4]
        f.write('\t'.join(r)+'\n')
print(len(rows))
