import csv
G='/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp'
I='/mnt/frankendom-donors/otland-forgottenserver/src/iomarket.cpp'
D='/mnt/frankendom-donors/otland-forgottenserver/src/databasetasks.cpp'
L='/mnt/frankendom-donors/otland-forgottenserver/src/luascript.cpp'
K='/mnt/frankendom-donors/otland-forgottenserver/config.lua.dist'
V='/mnt/frankendom-donors/otland-forgottenserver/src/otserv.cpp'
X='/mnt/frankendom-donors/otland-forgottenserver/LICENSE'
n='otland-forgottenserver'
rows=[
(n,'server header: governed by GPL-2.0 (cited in game.cpp header)',G,'2','governed by the GPL-2.0 License that can be found in the LICENSE file.'),
(n,'LICENSE is GNU GPL version 2 text',X,'2','Version 2, June 1991'),
(n,'create: buy offers debit cash first, then bank',G,'5297','const auto debitCash = std::min(playerMoney, totalPrice);'),
(n,'create: buy total is price x amount (escrowed at listing)',G,'5291','uint64_t totalPrice = static_cast<uint64_t>(price) * amount;'),
(n,'create: sell offers take items out of the world at listing',G,'5264','const auto& itemList = getMarketItemList(it.wareId, amount, *player);'),
(n,'create: sell offers debit only the fee, cash first',G,'5286','const auto debitCash = std::min(playerMoney, fee);'),
(n,'create: row stores itemtype, amount, price, time, anonymous (no charges)',I,'250','INSERT INTO `market_offers` (`player_id`, `sale`, `itemtype`, `amount`, `price`'),
(n,'create: per-player offer count limit',G,'5247','getPlayerOfferCount(player->getGUID()) >= maxOfferCount'),
(n,'accept: self-trade check compares account, not character',G,'5396','if (offerAccountId == player->getAccount()) {'),
(n,'accept: total = offer price x accepted amount',G,'5410','uint64_t totalPrice = offer.price * amount;'),
(n,'accept of a buy offer: acceptor is credited to bank',G,'5444','player->bankBalance += totalPrice;'),
(n,'accept of a sell offer: buyer debit cash first, then bank',G,'5489','const auto debitCash = std::min(playerMoney, totalPrice);'),
(n,'accept of a sell offer: seller credited to bank',G,'5527','sellerPlayer->bankBalance += totalPrice;'),
(n,'accept: partial fill reduces remaining amount',G,'5544','offer.amount -= amount;'),
(n,'accept: row deleted when fully filled',G,'5547','tfs::iomarket::deleteOffer(offer.id);'),
(n,'cancel: buy refund = remaining price x amount to bank, fee not returned',G,'5328','player->bankBalance += offer.price * offer.amount;'),
(n,'cancel: sell items recreated from row with type default charges',G,'5352','subType = it.charges;'),
(n,'cancel: pays before moving the row to history',G,'5368','tfs::iomarket::moveOfferToHistory(offer.id, OFFERSTATE_CANCELLED);'),
(n,'expiry: sweep selects rows older than duration',I,'193','FROM `market_offers` WHERE `created` <= {:d}'),
(n,'expiry: cutoff = now minus marketOfferDuration',I,'189','const time_t lastExpireDate = time(nullptr) - getNumber(ConfigManager::MARKET_OFFER_DURATION);'),
(n,'expiry: move first, pay only if the move succeeded',I,'118','if (!moveOfferToHistory(result->getNumber<uint32_t>("id"), OFFERSTATE_EXPIRED)) {'),
(n,'expiry: buy refund = price x remaining amount to bank',I,'175','uint64_t totalPrice = result->getNumber<uint64_t>("price") * amount;'),
(n,'expiry: sweep rescheduled every checkExpiredMarketOffersEachMinutes',I,'202','checkExpiredMarketOffersEachMinutes * 60 * 1000'),
(n,'expiry: sweep runs once at startup',V,'244','tfs::iomarket::checkExpiredOffers();'),
(n,'config: sweep interval 60 minutes',K,'76','checkExpiredMarketOffersEachMinutes = 60'),
(n,'config: offer duration 30 days',K,'74','marketOfferDuration = 30 * 24 * 60 * 60'),
(n,'move: delete guarded by return value',I,'287','if (!db.executeQuery('),
(n,'active offers listed with no ORDER BY (no price-time matching)',I,'31','FROM `market_offers` WHERE `sale` = {:d} AND `itemtype` = {:d}'),
(n,'DB callbacks run on the main dispatcher thread',D,'67','g_dispatcher.addTask([=, callback = task.callback]() { callback(result, success); });'),
(n,'coins are items with worth, summed by removeMoney',G,'1538','const uint32_t worth = item->getWorth();'),
(n,'sell listing draws from inbox and depot chests',G,'5582','std::list<Container*> containers{player.getInbox().get()};'),
(n,'market-eligible items need market attributes',G,'5612','if (!item->hasMarketAttributes()) {'),
(n,'stats exposed to Lua scripts (buy side)',L,'13747','MarketStatistics* statistics = tfs::iomarket::getPurchaseStatistics(itemType->id);'),
(n,'stats recomputed from accepted history',I,'298','void updateStatistics()'),
(n,'listing fee 1 percent of gross, cross-check',G,'5251','uint64_t fee = (price / 100.) * amount;'),
(n,'fee cap 100000 (server)',V.replace('otserv.cpp','const.h') if False else '/mnt/frankendom-donors/otland-forgottenserver/src/const.h','9','inline constexpr int32_t MAX_MARKET_FEE = 100000;'),
]
with open('receipts.tsv','a') as f:
    for r in rows:
        assert '\t' not in r[4]
        f.write('\t'.join(r)+'\n')
print(len(rows))
