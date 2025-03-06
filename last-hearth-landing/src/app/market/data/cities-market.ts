import { IMarketItem } from "../interfaces/i-market-item";

export function getCitiesBuyData(): IMarketItem[] {
    return [
        {
            image: "/images/market/cities/buy/meteorite-claymore.png",
            name: "Клеймор из метеоритного железа",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/buy/meteorite-battle-axe.png",
            name: "Боевой топор из метеоритного железа",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/buy/iron-khanjar.png",
            name: "Железный ханджар",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/buy/crossbow-with-latch.png",
            name: "Арбалет с защелкой",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/buy/leather.png",
            name: "Кожа (х64)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/buy/brigantine-helmet-iron.png",
            name: "Бригантинный шлем (железо)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/buy/brigantine-greaves-iron.png",
            name: "Бригантинный нагрудник (железо)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/buy/brigantine-breastplate-iron.png",
            name: "Бригантинные поножи (железо)",
            currency: "Валюта Короны",
        },
    ];
}

export function getCitiesSaleData(): IMarketItem[] {
    return [
        {
            image: "/images/market/cities/sell/ingot-iron.png",
            name: "Слиток железа (16х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/sell/ingot-silver.png",
            name: "Слиток серебра (16х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/sell/ingot-gold.png",
            name: "Слиток золота (16х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/sell/crushed-bauxite.png",
            name: "Измельченный боксит (128х)",
            currency: "Валюта Короны",
        },
        {
            image: "/images/market/cities/sell/crashed-quartz.png",
            name: "Измельченный кварц (128х)",
            currency: "Валюта Короны",
        },
    ];
}