import csv
N="endless-sky-endless-sky"
D="/mnt/frankendom-donors/endless-sky-endless-sky/source/"
rows=[
("theirs: docstring of Full() fraction", D+"Depreciation.cpp", 58, "// What fraction of its cost a fully depreciated item has left:"),
("theirs: Full() returns the floor", D+"Depreciation.cpp", 59, "double Depreciation::Full()"),
("theirs: floor from gamerules", D+"Depreciation.cpp", 34, "return GameData::GetGamerules().DepreciationMin();"),
("theirs: max age includes grace", D+"Depreciation.cpp", 49, "return GameData::GetGamerules().DepreciationMaxAge() + GracePeriod();"),
("theirs: init fleet with no depreciation (purchase day = today)", D+"Depreciation.cpp", 157, "++ships[base][day];"),
("claim: buy takes the source record's purchase day", D+"Depreciation.cpp", 183, "day = source->Sell(it->second);"),
("claim: buyer that is stock with no source record: fully depreciated", D+"Depreciation.cpp", 191, "day -= MaxAge();"),
("claim: buy adds record on purchase day", D+"Depreciation.cpp", 196, "++ships[base][day];"),
("claim: non-installable outfits are not depreciated (value)", D+"Depreciation.cpp", 204, "if(outfit->Get(\"installable\") < 0.)"),
("claim: ship value uses record, default when none", D+"Depreciation.cpp", 276, "return DefaultDepreciation() * count * ship->ChassisCost();"),
("claim: ship value with record", D+"Depreciation.cpp", 278, "return Depreciate(recordIt->second, day, count) * ship->ChassisCost();"),
("claim: sell picks oldest for stock, newest for fleet", D+"Depreciation.cpp", 305, "auto it = (isStock ? record.begin() : --record.end());"),
("claim: sold item leaves record", D+"Depreciation.cpp", 312, "record.erase(it);"),
("claim: stock walks from oldest, fleet from newest", D+"Depreciation.cpp", 327, "map<int, int>::const_iterator it = (isStock ? record.begin() : --record.end());"),
("claim: items in a bin used up to count", D+"Depreciation.cpp", 335, "int used = min(it->second, count);"),
("claim: sum of depreciation per bin by age", D+"Depreciation.cpp", 337, "sum += used * Depreciate(day - it->first);"),
("claim: remaining items at default", D+"Depreciation.cpp", 357, "return sum + count * DefaultDepreciation();"),
("claim: grace period returns full value", D+"Depreciation.cpp", 365, "if(age <= GracePeriod())"),
("claim: at max age returns floor", D+"Depreciation.cpp", 368, "if(age >= MaxAge())"),
("claim: effective age after grace", D+"Depreciation.cpp", 371, "int effectiveAge = age - GracePeriod();"),
("claim: daily decay power", D+"Depreciation.cpp", 372, "double daily = pow(Daily(), effectiveAge);"),
("claim: linear taper over max age", D+"Depreciation.cpp", 373, "double linear = static_cast<double>(MaxAge() - effectiveAge) / MaxAge();"),
("claim: value = floor + (1-floor) x decay x taper", D+"Depreciation.cpp", 374, "return Min() + (1. - Min()) * daily * linear;"),
("claim: default: stock full, fleet floor", D+"Depreciation.cpp", 383, "return (isStock ? 1. : Min());"),
("theirs constant: depreciation min .25", D+"Gamerules.h", 162, "double depreciationMin = .25;"),
("theirs constant: depreciation daily .997", D+"Gamerules.h", 163, "double depreciationDaily = .997;"),
("theirs constant: grace period 7", D+"Gamerules.h", 164, "int depreciationGracePeriod = 7;"),
("theirs constant: max age 1000", D+"Gamerules.h", 165, "int depreciationMaxAge = 1000;"),
("claim: data override clamped to 0..1", D+"Gamerules.cpp", 62, "storage.depreciationMin = min(1., max(0., child.Value(1)));"),
("claim: save prunes fleet records past max age", D+"Depreciation.cpp", 114, "if(isStock || (it.second && it.first > day - MaxAge()))"),
("caller: BuyShip price = stock value", D+"PlayerInfo.cpp", 1337, "int64_t cost = stockDepreciation.Value(*model, day);"),
("caller: BuyShip checks credits first", D+"PlayerInfo.cpp", 1338, "if(accounts.Credits() < cost)"),
("caller: BuyShip charges credits", D+"PlayerInfo.cpp", 1343, "accounts.AddCredits(-cost);"),
("caller: BuyShip moves record from stock to fleet", D+"PlayerInfo.cpp", 1346, "depreciation.Buy(*model, day, &stockDepreciation);"),
("caller: SellShip price = fleet value", D+"PlayerInfo.cpp", 1388, "cost = depreciation.Value(selected, day);"),
("caller: SellShip moves record from fleet to stock", D+"PlayerInfo.cpp", 1393, "stockDepreciation.Buy(*selected, day, &depreciation, storeOutfits);"),
("caller: SellShip pays credits", D+"PlayerInfo.cpp", 1406, "accounts.AddCredits(cost);"),
]
rows2=[[N,c,f,str(l),q] for c,f,l,q in rows]
for n_,c,f,l,q in rows2:
    assert "\t" not in q and 15<=len(q)<=90, (c,len(q),q)
with open("receipts.tsv","a",newline="") as f:
    for r in rows2:
        f.write("\t".join(r)+"\n")
print(len(rows2))
