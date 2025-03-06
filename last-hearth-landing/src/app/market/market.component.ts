import { CommonModule, NgForOf } from "@angular/common";
import { Component } from "@angular/core";
import { TuiExpand, TuiIcon } from "@taiga-ui/core/components";
import { IMarket } from "./interfaces/i-market";
import { MarketTypes } from "./enums/market-types";
import { getBaseBuyData, getBaseSaleData } from "./data/base-market";
import { getCommonsBuyData, getCommonsSaleData } from "./data/commons-market";
import { getCitiesBuyData, getCitiesSaleData } from "./data/cities-market";
import { getGuild1BuyData, getGuild1SaleData } from "./data/guild-1-market";
import { getGuild2BuyData, getGuild2SaleData } from "./data/guild-2-market";
import { getRegionalsBuyData, getRegionalsSaleData } from "./data/regionals-market";

@Component({
    selector: "app-market",
    imports: [TuiExpand, TuiIcon, CommonModule, NgForOf],
    templateUrl: "./market.component.html",
    styleUrl: "./market.component.less",
})
export class MarketComponent {
    protected readonly data: IMarket[] = [
        {
            isOpen: false,
            name: MarketTypes.base,
            purchaseSale: [
                {
                    isOpen: false,
                    type: "Купить:",
                    items: getBaseBuyData(),
                },
                {
                    isOpen: false,
                    type: "Продать:",
                    items: getBaseSaleData(),
                },
            ],
        },
        {
            isOpen: false,
            name: MarketTypes.commons,
            purchaseSale: [
                {
                    isOpen: false,
                    type: "Купить:",
                    items: getCommonsBuyData(),
                },
                {
                    isOpen: false,
                    type: "Продать:",
                    items: getCommonsSaleData(),
                },
            ],
        },
        {
            isOpen: false,
            name: MarketTypes.cities,
            purchaseSale: [
                {
                    isOpen: false,
                    type: "Купить:",
                    items: getCitiesBuyData(),
                },
                {
                    isOpen: false,
                    type: "Продать:",
                    items: getCitiesSaleData(),
                },
            ],
        },
        {
            isOpen: false,
            name: MarketTypes.regionals,
            purchaseSale: [
                {
                    isOpen: false,
                    type: "Купить:",
                    items: getRegionalsBuyData(),
                },
                {
                    isOpen: false,
                    type: "Продать:",
                    items: getRegionalsSaleData(),
                },
            ],
        },
        {
            isOpen: false,
            name: MarketTypes.guild1,
            purchaseSale: [
                {
                    isOpen: false,
                    type: "Купить:",
                    items: getGuild1BuyData(),
                },
                {
                    isOpen: false,
                    type: "Продать:",
                    items: getGuild1SaleData(),
                },
            ],
        },
        {
            isOpen: false,
            name: MarketTypes.guild2,
            purchaseSale: [
                {
                    isOpen: false,
                    type: "Купить:",
                    items: getGuild2BuyData(),
                },
                {
                    isOpen: false,
                    type: "Продать:",
                    items: getGuild2SaleData(),
                },
            ],
        },
    ];
}
