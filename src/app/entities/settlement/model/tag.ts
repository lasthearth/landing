/**
 * Тип ключа тега поселения.
 */
export type TagKey = 'east' | 'west' | 'suzerain';

/**
 * Интерфейс тега поселения.
 */
export interface Tag {
    /**
     * Идентификатор тега.
     */
    id: string;

    /**
     * Отображаемый текст тега.
     */
    text: string;

    /**
     * Действие с тегом.
     */
    action: 'add' | 'remove' | 'custom';

    /**
     * Тип тега.
     */
    type: TagKey;

    /**
     * Признак уникальности тега.
     */
    unique?: boolean;

    /**
     * Признак отключения тега.
     */
    disabled: boolean;
}
