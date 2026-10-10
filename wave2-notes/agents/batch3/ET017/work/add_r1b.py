import csv
G='/mnt/frankendom-donors/otland-forgottenserver/src/game.cpp'
K='/mnt/frankendom-donors/otland-forgottenserver/config.lua.dist'
n='opentibiabr-otclient'
rows=[
(n,'server buy affordability check covers total plus fee, cash and bank',G,'5293','if (totalPrice > (playerMoney + player->bankBalance)) {'),
(n,'server premium gate for creating offers',G,'5227','if (getBoolean(ConfigManager::MARKET_PREMIUM) && !player->isPremium()) {'),
(n,'server premium-to-create flag default true',K,'75','premiumToCreateMarketOffer = true'),
]
with open('receipts.tsv','a',newline='') as f:
    w=csv.writer(f,delimiter='\t',quoting=csv.QUOTE_NONE,lineterminator='\n')
    for r in rows: w.writerow(r)
print(len(rows))
