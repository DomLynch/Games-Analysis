import csv
A="/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Managers/AuctionManager.cs"
C="/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Char/Character.cs"
rows=[
("AAEmu-AAEmu","Listing fee = buyout x 1% x (duration tier + 1), in PostLotOnAuction",A,619,"var auctionFee = lot.DirectMoney * .01 * ((int)duration + 1);"),
("AAEmu-AAEmu","Listing fee capped at MaxListingFee",A,621,"if (auctionFee > MaxListingFee)"),
("AAEmu-AAEmu","MaxListingFee is 1000000",A,29,"private static int MaxListingFee => 1000000;"),
("AAEmu-AAEmu","Fee is charged through ChangeMoney(SlotType.Inventory, -fee)",A,627,"if (!player.ChangeMoney(SlotType.Inventory, -(int)auctionFee))"),
("AAEmu-AAEmu","Lot is added only after the fee call and item move",A,635,"AddAuctionLot(lot);"),
("AAEmu-AAEmu","ChangeMoney(slot, amount) passes SlotType.None as the source",C,1503,"=> ChangeMoney(SlotType.None, moneyLocation, amount, itemTaskType);"),
("AAEmu-AAEmu","Balance check runs only inside the typeFrom switch",C,1508,"switch (typeFrom)"),
("AAEmu-AAEmu","Inventory balance check (only when typeFrom is Inventory)",C,1511,"if (amount > Money)"),
("AAEmu-AAEmu","Inventory credit adds the signed amount",C,1532,"Money += amount;"),
("AAEmu-AAEmu","SubtractMoney routes to ChangeMoney with SlotType.None",C,1555,"return ChangeMoney(SlotType.None, moneyLocation, -amount, itemTaskType);"),
("AAEmu-AAEmu","Buy-now branch: bid at or above buyout ends the lot",A,146,"if (bid.Money >= auctionLot.DirectMoney && auctionLot.DirectMoney != 0)"),
("AAEmu-AAEmu","Buy-now pays the buyout price through SubtractMoney",A,155,"player.SubtractMoney(SlotType.Inventory, auctionLot.DirectMoney);"),
("AAEmu-AAEmu","Bid branch: only a bid above the current top bid is accepted",A,158,"else if (bid.Money > auctionLot.BidMoney) // Bid"),
("AAEmu-AAEmu","Outbid previous bidder gets money back by mail",A,167,"cancelMail.FinalizeForBidFail(auctionLot.BidderId, auctionLot.BidMoney);"),
("AAEmu-AAEmu","New bid is debited through SubtractMoney",A,181,"player.SubtractMoney(SlotType.Inventory, bid.Money, ItemTaskType.Auction);"),
("AAEmu-AAEmu","Sale: seller share is 90 percent of the sale price",A,38,"var moneyAfterFee = soldAmount * .9;"),
("AAEmu-AAEmu","Seller mail carries the 90 percent share and the remainder as tax",A,46,"sellMail.FinalizeForSaleSeller((int)moneyAfterFee, (int)(soldAmount - moneyAfterFee));"),
("AAEmu-AAEmu","Expiry sweep selects lots whose end time has passed",A,287,"AuctionLots.Values.Where(c => DateTime.UtcNow > c.EndTime)"),
("AAEmu-AAEmu","Sweep scheduled every 5 s after a 5 s delay",A,388,"taskManager.Schedule(auctionTask, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(5));"),
("AAEmu-AAEmu","Lot end time is now plus the duration in hours",A,322,"EndTime = DateTime.UtcNow.AddHours(timeLeft),"),
("AAEmu-AAEmu","Duration tiers 0-3 mapped to 6/12/24/48 h (comment)","/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Models/Game/Auction/AuctionLot.cs",14,"0 is 6 hours, 1 is 12 hours, 2 is 24 hours, 3 is 48 hours"),
("AAEmu-AAEmu","Cancel path mails the item back and does not call ChangeMoney",A,115,"var cancelMail = new MailForAuction(newItem, auctionLot.ClientId"),
("AAEmu-AAEmu","Cancel path sends the cancel mail",A,117,"cancelMail.FinalizeForCancel();"),
("AAEmu-AAEmu","In-game post enters PostLotOnAuction",
 "/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Packets/C2G/CSAuctionPostPacket.cs",21,"AuctionManager.Instance.PostLotOnAuction(Connection.ActiveChar"),
("AAEmu-AAEmu","In-game bid enters BidOnAuctionLot (only caller read)",
 "/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Core/Packets/C2G/CSBidAuctionPacket.cs",23,"AuctionManager.Instance.BidOnAuctionLot(Connection.ActiveChar"),
("AAEmu-AAEmu","Web API creates and adds a lot with no fee call",
 "/mnt/frankendom-donors/AAEmu-AAEmu/AAEmu.Game/Services/WebApi/Controllers/AuctionController.cs",57,"AuctionManager.Instance.AddAuctionLot(newAuctionItem);"),
("AAEmu-AAEmu","Licence: README states LGPL v3 wording",
 "/mnt/frankendom-donors/AAEmu-AAEmu/README.md",36,"GNU Lesser General Public License as published by"),
("AAEmu-AAEmu","Licence file LICENSE.GPL is GPL v3 text",
 "/mnt/frankendom-donors/AAEmu-AAEmu/LICENSE.GPL",1,"GNU GENERAL PUBLIC LICENSE"),
("AAEmu-AAEmu","Licence file LICENSE.MIT names a 2019 copyright holder",
 "/mnt/frankendom-donors/AAEmu-AAEmu/LICENSE.MIT",3,"Copyright (c) 2019 Rain0Ash"),
]
import sys
out=sys.argv[1]
with open(out,"w",newline="") as f:
    f.write("note\tclaim\tdonor_file\tline\tquote\n")
    for r in rows:
        assert all("\t" not in str(x) for x in r), r
        f.write("\t".join(str(x) for x in r)+"\n")
print(len(rows),"rows")
