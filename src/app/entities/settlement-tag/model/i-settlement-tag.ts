import { IColor } from './i-color';

/**
 * UI-модель тега поселения (camelCase).
 */
export interface ISettlementTag {
    /**
     * Идентификатор тега.
     */
    id: string;

    /**
     * Название тега.
     */
    name: string;

    /**
     * Цвет тега.
     */
    color: IColor;

    /**
     * Описание тега.
     */
    description?: string;
}
