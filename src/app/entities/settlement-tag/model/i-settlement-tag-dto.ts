import { IColor } from './i-color';

/**
 * DTO тега поселения, приходящее с бэкенда (snake_case).
 */
export interface ISettlementTagDto {
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
