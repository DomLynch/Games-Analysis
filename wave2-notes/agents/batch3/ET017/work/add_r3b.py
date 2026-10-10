B='/mnt/frankendom-donors/pmbstyle-L2Solo/src/GameServer/Bot/Economy/'
n='pmbstyle-L2Solo'
rows=[
(n,'invalid item is ignored',B+'MarketListingPolicy.js','55',"return { action: 'ignore', reason: 'invalid_item' };"),
(n,'small material lot goes to warehouse',B+'MarketListingPolicy.js','57',"if (!LotPolicy.viable(item)) return { action: 'warehouse', reason: 'small_material_lot' };"),
(n,'store close passes reason expired to the learned multiplier',B+'ColdMarketListingService.js','774',"marketPricing: pricingAfterReview(state, store, timestamp, reason === 'expired')"),
(n,'store close runs NPC liquidation over candidates',B+'ColdMarketListingService.js','784','return LifeState.applyNpcLiquidation(storedState, liquidated).then((liquidatedState) => ({'),
(n,'ready-signal count uses budget divided by unit price',B+'MarketDemandIndex.js','146','return Math.min(signal.amount, Math.floor(signal.budget / unitPrice));'),
]
with open('receipts.tsv','a') as f:
    for r in rows:
        assert '\t' not in r[4]
        f.write('\t'.join(r)+'\n')
print(len(rows))
