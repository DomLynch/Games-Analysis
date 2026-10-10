import csv
C='/mnt/frankendom-donors/opentibiabr-otclient/modules/game_market/t_market.lua'
G='/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp'
H='/mnt/frankendom-donors/otland-forgottenserver/src/const.h'
K='/mnt/frankendom-donors/otland-forgottenserver/config.lua.dist'
M='/mnt/frankendom-donors/opentibiabr-otclient/modules/gamelib/market.lua'
L='/mnt/frankendom-donors/opentibiabr-otclient/LICENSE'
n='opentibiabr-otclient'
rows=[
(n,'client listing fee = ceil(price/50 x amount), i.e. 2 percent of gross',C,'1667','local fee = math.ceil((numericValue / 50) * amount)'),
(n,'client fee floor is 20 gold',C,'1668','if fee < 20 then'),
(n,'client fee cap is 1000000 gold',C,'1670','elseif fee > 1000000 then'),
(n,'client sell-side preview: profit = gross minus fee',C,'1775','mainMarket.profitAmount:setText(convertGold(grossProfit - fee, true))'),
(n,'client buy-side preview: total = gross plus fee',C,'1713','mainMarket.profitAmount:setText(convertGold(grossProfit + fee, true))'),
(n,'client create-offer recomputes the same fee for the buy pre-check',C,'1837','local fee = math.ceil((piecePrice / 50) * amount)'),
(n,'client buy pre-check totals gross plus fee',C,'1844','local totalCost = totalOrderValue + fee'),
(n,'client affordability gate is client-side only',C,'1845','if getTotalMoney() < totalCost then'),
(n,'client MarketMaxOffers = 100',M,'4','MarketMaxOffers = 100'),
(n,'client licence is MIT',L,'1','OTClient is made available under the MIT License'),
(n,'server fee = 1 percent of gross (truncated), cross-check',G,'5251','uint64_t fee = (price / 100.) * amount;'),
(n,'server applies floor MIN_MARKET_FEE',G,'5253','fee = MIN_MARKET_FEE;'),
(n,'server applies cap MAX_MARKET_FEE',G,'5255','fee = MAX_MARKET_FEE;'),
(n,'server MIN_MARKET_FEE = 20',H,'8','inline constexpr int32_t MIN_MARKET_FEE = 20;'),
(n,'server MAX_MARKET_FEE = 100000 (client says 1000000)',H,'9','inline constexpr int32_t MAX_MARKET_FEE = 100000;'),
(n,'server buy debit = price x amount plus fee',G,'5292','totalPrice += fee;'),
(n,'server sell listing debits the fee from cash first',G,'5286','const auto debitCash = std::min(playerMoney, fee);'),
(n,'server cancel of a buy refunds price x amount only, fee kept',G,'5328','player->bankBalance += offer.price * offer.amount;'),
(n,'server max offers per player default 100',K,'77','maxMarketOffersAtATimePerPlayer = 100'),
(n,'server offer duration default 30 days',K,'74','marketOfferDuration = 30 * 24 * 60 * 60'),
]
with open('receipts.tsv','a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,escapechar=None,lineterminator='\n')
    for r in rows:
        assert '\t' not in r[4] and '\t' not in r[1]
        w.writerow(r)
print(len(rows),'rows')
