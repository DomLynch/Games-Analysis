G='/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp'
I='/mnt/frankendom-donors/otland-forgottenserver/src/iomarket.cpp'
n='otland-forgottenserver'
rows=[
(n,'create sell: fee must be covered before any item is removed',G,'5260','if (fee > (playerMoney + player->bankBalance)) {'),
(n,'accept: amount may not exceed remaining amount',G,'5401','if (amount > offer.amount) {'),
(n,'accept: both parties get a history row',G,'5537','tfs::iomarket::appendHistory(player->getGUID(),'),
(n,'expiry: sell rows return items to inbox without a capacity limit',I,'144','g_game.internalAddItem(player->getInbox().get(), item, INDEX_WHEREEVER, FLAG_NOLIMIT)'),
(n,'expiry: recreated items use the type default charges',I,'155','subType = itemType.charges;'),
(n,'expiry: buy rows credit the bank with price x remaining amount',I,'179','player->setBankBalance(player->getBankBalance() + totalPrice);'),
]
with open('receipts.tsv','a') as f:
    for r in rows:
        assert '\t' not in r[4]
        f.write('\t'.join(r)+'\n')
print(len(rows))
