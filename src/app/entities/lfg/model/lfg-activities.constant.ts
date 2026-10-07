import { LfgActivity, LfgExperience, LfgKind, LfgPlayTime } from './lfg.types';

/**
 * Занятия в порядке показа: ключ перевода и иконка.
 */
export const LFG_ACTIVITIES: readonly { readonly value: LfgActivity; readonly key: string; readonly icon: string }[] = [
    { value: 'ACTIVITY_MINING', key: 'mining', icon: '@tui.pickaxe' },
    { value: 'ACTIVITY_EXPLORING', key: 'exploring', icon: '@tui.compass' },
    { value: 'ACTIVITY_BUILDING', key: 'building', icon: '@tui.hammer' },
    { value: 'ACTIVITY_HUNTING', key: 'hunting', icon: '@tui.crosshair' },
    { value: 'ACTIVITY_TRADING', key: 'trading', icon: '@tui.coins' },
    { value: 'ACTIVITY_FARMING', key: 'farming', icon: '@tui.wheat' },
    { value: 'ACTIVITY_COMBAT', key: 'combat', icon: '@tui.swords' },
    { value: 'ACTIVITY_OTHER', key: 'other', icon: '@tui.sparkles' },
];

/**
 * Ключ перевода и иконка занятия.
 *
 * @param activity Занятие.
 * @returns Описание занятия (для неизвестного — «другое»).
 */
export function lfgActivity(activity: LfgActivity): (typeof LFG_ACTIVITIES)[number] {
    return LFG_ACTIVITIES.find((item) => item.value === activity) ?? LFG_ACTIVITIES[LFG_ACTIVITIES.length - 1];
}

/**
 * Вкладки доски: поиск напарника первым — он главный.
 */
export const LFG_KINDS: readonly { readonly value: LfgKind; readonly key: string; readonly icon: string }[] = [
    { value: 'POST_KIND_TEAMMATE', key: 'teammate', icon: '@tui.handshake' },
    { value: 'POST_KIND_SESSION', key: 'session', icon: '@tui.zap' },
];

/**
 * Время суток в порядке показа.
 */
export const LFG_PLAY_TIMES: readonly { readonly value: LfgPlayTime; readonly key: string; readonly icon: string }[] = [
    { value: 'PLAY_TIME_MORNING', key: 'morning', icon: '@tui.sunrise' },
    { value: 'PLAY_TIME_DAY', key: 'day', icon: '@tui.sun' },
    { value: 'PLAY_TIME_EVENING', key: 'evening', icon: '@tui.sunset' },
    { value: 'PLAY_TIME_NIGHT', key: 'night', icon: '@tui.moon' },
];

/**
 * Опыт в порядке показа.
 */
export const LFG_EXPERIENCES: readonly {
    readonly value: LfgExperience;
    readonly key: string;
    readonly icon: string;
}[] = [
    { value: 'EXPERIENCE_NEWBIE', key: 'newbie', icon: '@tui.sprout' },
    { value: 'EXPERIENCE_EXPERIENCED', key: 'experienced', icon: '@tui.shield' },
    { value: 'EXPERIENCE_VETERAN', key: 'veteran', icon: '@tui.crown' },
];

/**
 * Дни недели: 1 — понедельник … 7 — воскресенье (как на сервере).
 */
export const LFG_WEEKDAYS: readonly number[] = [1, 2, 3, 4, 5, 6, 7];
