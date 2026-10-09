/**
 * Что нужно, чтобы открыть элемент оформления.
 */
export type StyleRequirement =
    | { readonly kind: 'free' }
    | { readonly kind: 'hours'; readonly hours: number }
    | { readonly kind: 'kills'; readonly kills: number }
    | { readonly kind: 'settlement' }
    | { readonly kind: 'leader' }
    | { readonly kind: 'top' }
    | { readonly kind: 'deaths'; readonly deaths: number }
    /** Наиграть столько часов и умирать не чаще раза в 10 часов. */
    | { readonly kind: 'survivor'; readonly hours: number }
    | { readonly kind: 'hgWins'; readonly wins: number }
    | { readonly kind: 'referrals'; readonly count: number }
    | { readonly kind: 'events'; readonly count: number }
    | { readonly kind: 'days'; readonly days: number }
    /** Купить за осколки. */
    | { readonly kind: 'purchase'; readonly price: number };

/**
 * Баннер — шапка страницы игрока.
 */
export interface ProfileBanner {
    readonly id: string;
    /**
     * Ключ подписи `player.style.banners.<key>`.
     */
    readonly key: string;
    readonly image: string;
    /**
     * Какая высота картинки попадает в узкую полосу: `background-position` по
     * вертикали (`0%` — верх, `100%` — низ). Подбирается под каждую картинку,
     * чтобы в кадре было главное.
     */
    readonly focus: string;
    readonly requirement: StyleRequirement;
}

/**
 * Анимация поверх баннера: частицы, туман, облака, молнии.
 */
export type BannerEffectId =
    | 'none'
    | 'dust'
    | 'clouds'
    | 'leaves'
    | 'rain'
    | 'fog'
    | 'snow'
    | 'fireflies'
    | 'embers'
    | 'lightning'
    | 'starfall'
    | 'aurora';

/**
 * Анимация баннера и как её открыть.
 */
export interface BannerEffect {
    readonly id: BannerEffectId;
    readonly requirement: StyleRequirement;
    /**
     * Затемнение картинки под анимацию: сумерки, ночь, пасмурно или гроза.
     */
    readonly tint?: BannerTint;
}

export type BannerTint = 'dusk' | 'night' | 'overcast' | 'storm';

/**
 * Анимация вокруг рамки аватара.
 */
export type FrameEffectId = 'none' | 'fire' | 'wind' | 'fog' | 'frost' | 'storm' | 'comet' | 'aurora';

/**
 * Анимация рамки и как её открыть.
 */
export interface FrameEffect {
    readonly id: FrameEffectId;
    readonly requirement: StyleRequirement;
}

/**
 * Рамка аватара.
 */
export interface ProfileFrame {
    readonly id: ProfileFrameId;
    readonly requirement: StyleRequirement;
}

/**
 * Рамки от простой к редкой.
 */
export type ProfileFrameId = 'none' | 'wood' | 'copper' | 'bronze' | 'iron' | 'blood' | 'gold';

/**
 * Как выглядит игрок: баннер, рамка аватара и их анимации.
 */
export interface PlayerLook {
    readonly bannerId: string;
    readonly bannerEffect: BannerEffectId;
    readonly frameId: ProfileFrameId;
    readonly frameEffect: FrameEffectId;
}

/**
 * Что из статистики игрока открывает оформление.
 */
export interface StyleStats {
    readonly hours: number;
    readonly kills: number;
    /**
     * Место по часам и по убийствам (0 — нет места).
     */
    readonly hoursRank: number;
    readonly killsRank: number;
    readonly settlementRole: 'leader' | 'resident' | null;
    /*
     * Остальное известно не для всех: смерти — из таблицы лидеров, прочее —
     * только о себе (с сервера). `undefined` — неизвестно.
     */
    readonly deaths?: number;
    readonly hgWins?: number;
    readonly referrals?: number;
    readonly events?: number;
    readonly days?: number;
    /**
     * Купленные за осколки элементы.
     */
    readonly purchased?: readonly string[];
}

/**
 * Почему элемент закрыт: ключ перевода подсказки и её параметры.
 */
export interface StyleLock {
    readonly key: string;
    readonly params?: Record<string, number>;
}
