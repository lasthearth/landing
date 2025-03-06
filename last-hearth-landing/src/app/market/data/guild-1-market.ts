import { IMarketItem } from "../interfaces/i-market-item";

export function getGuild1BuyData(): IMarketItem[] {
    return [
        {
            image: "/images/market/guild-1/buy/sailing-boat.png",
            name: "Парусная лодка",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/guild-1/buy/borax.png",
            name: "Бура (16х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/guild-1/buy/anthracite.png",
            name: "Антрацит",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/guild-1/buy/metall-parts.png",
            name: "Металлические части (10х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/guild-1/buy/temporal-gear.png",
            name: "Темпоральная шестеренка",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/guild-1/buy/fireproof-clay.png",
            name: "Огнеупорная глина (64х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/guild-1/buy/gun.png",
            name: "Пистолет",
            currency: "Валюта Короны",
        },
    ]    
}

export function getGuild1SaleData(): IMarketItem[] {
    return [
        {
            image: "/images/market/guild-1/sell/salt.png",
            name: "Соль (32х)",
            currency: "Валюта Короны",
        },
    ];
}