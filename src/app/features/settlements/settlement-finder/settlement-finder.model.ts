/**
 * Чем игрок хочет заниматься.
 */
export type FinderStyle = 'peace' | 'neutral' | 'war' | 'any';

/**
 * Каким по размеру видит поселение.
 */
export type FinderSize = 'small' | 'medium' | 'large' | 'any';

/**
 * Важно ли, чтобы в поселении сейчас кто-то играл.
 */
export type FinderActivity = 'online' | 'any';

/**
 * Ответы игрока.
 */
export interface FinderAnswers {
    style: FinderStyle;
    size: FinderSize;
    activity: FinderActivity;
}

/**
 * Поселение в выдаче подбора.
 */
export interface FinderMatch {
    /**
     * Идентификатор поселения.
     */
    id: string;

    /**
     * Название для показа.
     */
    name: string;

    /**
     * Тип поселения (подпись).
     */
    typeLabel: string;

    /**
     * Дипломатия как её хранит бэкенд.
     */
    diplomacy: string;

    /**
     * Жителей.
     */
    members: number;

    /**
     * Сейчас в игре.
     */
    online: number;

    /**
     * Совпадение, 0–100.
     */
    percent: number;
}
