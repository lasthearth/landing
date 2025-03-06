import { MarketTypes } from "../enums/market-types";
import { IPurchaseSale } from "./i-purchase-sale";

export interface IMarket {
    isOpen: boolean;

    name: MarketTypes;

    purchaseSale: IPurchaseSale[];
}