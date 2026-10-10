import { PlayerLook, ProfileBanner, StyleLock, StyleRequirement, StyleStats } from '../model/player-style';
import { BANNER_NONE, PROFILE_BANNERS, PROFILE_FRAMES } from './player-style.constant';

/**
 * Место в таблице, начиная с которого открываются награды топа.
 */
const TOP_RANK = 10;

/**
 * Сколько не хватает до цели.
 */
function short(need: number, have: number | undefined, key: string): StyleLock | null {
    const value = have ?? 0;
    return value >= need ? null : { key, params: { need, left: Math.ceil(need - value) } };
}

/**
 * Почему элемент закрыт для игрока, или `null`, если открыт.
 *
 * Неизвестное (например, победы в «Голодных играх» другого игрока) считается
 * неоткрытым.
 *
 * @param requirement Условие.
 * @param stats Статистика игрока.
 * @param itemId Элемент — для покупок.
 * @returns Подсказка или `null`.
 */
export function styleLock(requirement: StyleRequirement, stats: StyleStats, itemId = ''): StyleLock | null {
    switch (requirement.kind) {
        case 'free':
            return null;
        case 'hours':
            return short(requirement.hours, stats.hours, 'player.style.locks.hours');
        case 'kills':
            return short(requirement.kills, stats.kills, 'player.style.locks.kills');
        case 'deaths':
            return short(requirement.deaths, stats.deaths, 'player.style.locks.deaths');
        case 'hgWins':
            return short(requirement.wins, stats.hgWins, 'player.style.locks.hgWins');
        case 'referrals':
            return short(requirement.count, stats.referrals, 'player.style.locks.referrals');
        case 'events':
            return short(requirement.count, stats.events, 'player.style.locks.events');
        case 'days':
            return short(requirement.days, stats.days, 'player.style.locks.days');
        case 'survivor': {
            const deaths = stats.deaths;
            const ok = stats.hours >= requirement.hours && deaths !== undefined && deaths * 10 <= stats.hours;
            return ok ? null : { key: 'player.style.locks.survivor', params: { need: requirement.hours } };
        }
        case 'purchase':
            return stats.purchased?.includes(itemId)
                ? null
                : { key: 'player.style.locks.purchase', params: { price: requirement.price } };
        case 'settlement':
            return stats.settlementRole ? null : { key: 'player.style.locks.settlement' };
        case 'leader':
            return stats.settlementRole === 'leader' ? null : { key: 'player.style.locks.leader' };
        case 'top': {
            const inTop = (rank: number): boolean => rank > 0 && rank <= TOP_RANK;
            return inTop(stats.hoursRank) || inTop(stats.killsRank)
                ? null
                : { key: 'player.style.locks.top', params: { rank: TOP_RANK } };
        }
    }
}

/**
 * Можно ли проверить условие по этой статистике. Для чужих игроков сайт знает
 * не всё; их сохранённый выбор по непроверяемым условиям уже проверил сервер.
 *
 * @param requirement Условие.
 * @param stats Статистика.
 * @returns `true`, если данных хватает.
 */
export function styleCheckable(requirement: StyleRequirement, stats: StyleStats): boolean {
    switch (requirement.kind) {
        case 'deaths':
        case 'survivor':
            return stats.deaths !== undefined;
        case 'hgWins':
            return stats.hgWins !== undefined;
        case 'referrals':
            return stats.referrals !== undefined;
        case 'events':
            return stats.events !== undefined;
        case 'days':
            return stats.days !== undefined;
        case 'purchase':
            return stats.purchased !== undefined;
        default:
            return true;
    }
}

/**
 * За что элемент открывается — подпись для уже открытых.
 *
 * @param requirement Условие.
 * @returns Ключ перевода и параметры.
 */
export function styleEarned(requirement: StyleRequirement): StyleLock {
    switch (requirement.kind) {
        case 'free':
            return { key: 'player.style.earned.free' };
        case 'hours':
            return { key: 'player.style.earned.hours', params: { need: requirement.hours } };
        case 'kills':
            return { key: 'player.style.earned.kills', params: { need: requirement.kills } };
        case 'deaths':
            return { key: 'player.style.earned.deaths', params: { need: requirement.deaths } };
        case 'survivor':
            return { key: 'player.style.earned.survivor', params: { need: requirement.hours } };
        case 'hgWins':
            return { key: 'player.style.earned.hgWins', params: { need: requirement.wins } };
        case 'referrals':
            return { key: 'player.style.earned.referrals', params: { need: requirement.count } };
        case 'events':
            return { key: 'player.style.earned.events', params: { need: requirement.count } };
        case 'days':
            return { key: 'player.style.earned.days', params: { need: requirement.days } };
        case 'purchase':
            return { key: 'player.style.earned.purchase', params: { price: requirement.price } };
        case 'settlement':
            return { key: 'player.style.earned.settlement' };
        case 'leader':
            return { key: 'player.style.earned.leader' };
        case 'top':
            return { key: 'player.style.earned.top', params: { rank: TOP_RANK } };
    }
}

/**
 * Вид по умолчанию: самые редкие из открытых баннер и рамка, без анимаций.
 * Так выглядят игроки, которые ничего не выбирали.
 *
 * @param stats Статистика игрока; `null` — игрока нет в статистике.
 * @returns Вид.
 */
export function defaultPlayerLook(stats: StyleStats | null): PlayerLook {
    const opened = <T extends { id: string; requirement: StyleRequirement }>(items: readonly T[]): T[] =>
        stats ? items.filter((item) => !styleLock(item.requirement, stats, item.id)) : [items[0]];

    return {
        bannerId: opened(PROFILE_BANNERS).at(-1)?.id ?? PROFILE_BANNERS[0].id,
        bannerEffect: 'none',
        frameId: stats ? (opened(PROFILE_FRAMES).at(-1)?.id ?? 'none') : 'none',
        frameEffect: 'none',
    };
}

/**
 * Баннер по идентификатору. `'none'` — осознанный выбор «без баннера»,
 * неизвестный идентификатор — первый реальный баннер.
 *
 * @param id Идентификатор.
 * @returns Баннер.
 */
export function bannerById(id: string): ProfileBanner {
    if (id === BANNER_NONE.id) {
        return BANNER_NONE;
    }

    return PROFILE_BANNERS.find((banner) => banner.id === id) ?? PROFILE_BANNERS[0];
}
