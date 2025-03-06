import { IMarketItem } from "../interfaces/i-market-item";

export function getRegionalsBuyData(): IMarketItem[] {
    return [
        {
            image: "/images/market/regionals/buy/ingot-silver.png",
            name: "Слиток серебра (16х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/regionals/buy/ingot-gold.png",
            name: "Слиток золота (16х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/regionals/buy/ingot-iron.png",
            name: "Слиток железа (16х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/regionals/buy/blue-cheese.png",
            name: "Голубой сыр (4 ломтика)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/regionals/buy/cheddar-cheese.png",
            name: "Сыр чеддер (4 ломтика) (2х)",
            currency: "Валюта Короны",
        },
    ];
}

export function getRegionalsSaleData(): IMarketItem[] {
    return [
        {
            image: "/images/market/regionals/sell/solidiers-fusil.png",
            name: "Солдатская фузея",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/regionals/sell/dragoon-rifle.png",
            name: "Драгунское ружье",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/regionals/sell/ingot-steel.png",
            name: "Слиток стали (16х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/regionals/sell/gunpowder.png",
            name: "Ружейный порох (128х)",
            currency: "Валюта Короны",
        },
    ];
}