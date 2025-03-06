import { IMarketItem } from "./i-market-item";

export interface IPurchaseSale {
    isOpen: boolean,
    
    type: 'Купить:' | 'Продать:';

    items: IMarketItem[];
}