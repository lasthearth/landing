import { IMarketItem } from "../interfaces/i-market-item";

export function getGuild2BuyData(): IMarketItem[] {
    return [
        {
            image: "/images/market/guild-2/buy/gunpowder.png",
            name: "Ружейный порох (128х)",
            currency: "Валюта Короны",
        },
    ];
}

export function getGuild2SaleData(): IMarketItem[] {
    return [
        {
            image: "/images/market/guild-2/sell/untreated-peridot.png",
            name: "Необработанный перидот",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/guild-2/sell/untreated-emerald.png",
            name: "Необработанный изумруд",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/guild-2/sell/untreated-diamond.png",
            name: "Необработанный алмаз",
            currency: "Валюта Короны",
        },
    ];
}