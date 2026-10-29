/**
 * Чем игрок хочет заниматься.
 */
export type FinderStyle = 'peace' | 'neutral' | 'war' | 'any';

/**
 * Каким по размеру видит надел.
 */
export type FinderSize = 'small' | 'medium' | 'large' | 'any';

/**
 * Важно ли, чтобы в наделе сейчас кто-то играл.
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
 * Надел в выдаче подбора.
 */
export interface FinderMatch {
    /**
     * Идентификатор надела.
     */
    id: string;

    /**
     * Название для показа.
     */
    name: string;

    /**
     * Тип надела (подпись).
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
