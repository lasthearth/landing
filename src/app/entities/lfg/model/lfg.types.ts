/**
 * Типы сущности «Ищу компанию».
 */

/**
 * Вид объявления (`lfg.v1.PostKind`): разовый поход или поиск постоянного
 * напарника.
 */
export type LfgKind = 'POST_KIND_SESSION' | 'POST_KIND_TEAMMATE';

/**
 * Чем собирается заняться компания (`lfg.v1.Activity`).
 */
export type LfgActivity =
    | 'ACTIVITY_MINING'
    | 'ACTIVITY_EXPLORING'
    | 'ACTIVITY_BUILDING'
    | 'ACTIVITY_HUNTING'
    | 'ACTIVITY_TRADING'
    | 'ACTIVITY_FARMING'
    | 'ACTIVITY_COMBAT'
    | 'ACTIVITY_OTHER';

/**
 * Время суток, когда напарник обычно играет (`lfg.v1.PlayTime`).
 */
export type LfgPlayTime = 'PLAY_TIME_MORNING' | 'PLAY_TIME_DAY' | 'PLAY_TIME_EVENING' | 'PLAY_TIME_NIGHT';

/**
 * Опыт в Vintage Story (`lfg.v1.Experience`).
 */
export type LfgExperience = 'EXPERIENCE_NEWBIE' | 'EXPERIENCE_EXPERIENCED' | 'EXPERIENCE_VETERAN';

/**
 * Объявление в ответе API (`lfg.v1.Post`). Даты — ISO 8601; пустые списки,
 * `false` и неуказанные перечисления API не присылает.
 */
export interface LfgPostDto {
    id: string;
    author_id: string;
    kind: LfgKind;
    activities?: LfgActivity[];
    title: string;
    description?: string;
    /**
     * Только у разового похода.
     */
    starts_at?: string;
    slots: number;
    responders?: string[];
    closed?: boolean;
    expires_at: string;
    created_at: string;
    bumped_at?: string;
    /**
     * 1 — понедельник … 7 — воскресенье.
     */
    play_days?: number[];
    play_times?: LfgPlayTime[];
    experience?: LfgExperience | 'EXPERIENCE_UNSPECIFIED';
    voice?: boolean;
    has_contact?: boolean;
}

/**
 * Объявление для интерфейса.
 */
export interface LfgPost {
    id: string;
    authorId: string;
    kind: LfgKind;
    activities: LfgActivity[];
    title: string;
    description: string;
    /**
     * Начало разового похода; у поиска напарника — `null`.
     */
    startsAt: Date | null;
    slots: number;
    /**
     * Присоединившиеся к походу или заинтересовавшиеся напарником.
     */
    responders: string[];
    closed: boolean;
    expiresAt: Date;
    createdAt: Date;
    /**
     * Когда опубликовано или продлено последний раз.
     */
    bumpedAt: Date;
    playDays: number[];
    playTimes: LfgPlayTime[];
    experience: LfgExperience | null;
    voice: boolean;
    hasContact: boolean;
}

/**
 * Новое объявление.
 */
export interface CreateLfgPostRequest {
    kind: LfgKind;
    activities: LfgActivity[];
    title: string;
    description: string;
    /**
     * ISO 8601; только для разового похода.
     */
    starts_at?: string;
    slots: number;
    play_days?: number[];
    play_times?: LfgPlayTime[];
    experience?: LfgExperience;
    voice?: boolean;
    contact?: string;
}

/**
 * Итог отклика.
 */
export interface LfgRespondResult {
    /**
     * В компании (или среди заинтересовавшихся) ли игрок после отклика.
     */
    joined: boolean;
    post: LfgPost;
}
