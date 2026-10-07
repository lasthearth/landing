import { PlayerBadge, PlayerBadgeInput } from '../model/player-badge';

/**
 * Пороги часов для значков стажа.
 */
const HOURS = { settler: 10, veteran: 100, oldTimer: 500 } as const;

/**
 * Пороги убийств.
 */
const KILLS = { warrior: 10, slayer: 50 } as const;

/**
 * Сколько часов нужно, чтобы «Живучий» что-то значил.
 */
const SURVIVOR_MIN_HOURS = 50;

/**
 * Не больше одной смерти на столько часов — «Живучий».
 */
const SURVIVOR_HOURS_PER_DEATH = 10;

/**
 * Считает значки игрока. Порядок — от самых редких к обычным.
 *
 * Значки стажа взаимоисключающие: показывается старший.
 *
 * @param input Статистика и роль игрока.
 * @returns Значки для показа.
 */
export function computePlayerBadges(input: PlayerBadgeInput): PlayerBadge[] {
    const badges: PlayerBadge[] = [];
    const { hours, kills, deaths, hoursRank, killsRank } = input;

    if (hoursRank !== null && hoursRank <= 10 && hours > 0) {
        badges.push({ key: 'topHours', icon: '@tui.trophy', tier: 'legendary' });
    }

    if (killsRank !== null && killsRank <= 10 && kills > 0) {
        badges.push({ key: 'topKills', icon: '@tui.crosshair', tier: 'legendary' });
    }

    if (input.hungerGamesWins > 0) {
        badges.push({ key: 'gladiator', icon: '@tui.flame', tier: 'rare' });
    }

    if (input.settlementRole === 'leader') {
        badges.push({ key: 'founder', icon: '@tui.crown', tier: 'rare' });
    } else if (input.settlementRole === 'resident') {
        badges.push({ key: 'resident', icon: '@tui.house', tier: 'common' });
    }

    if (hours >= HOURS.oldTimer) {
        badges.push({ key: 'oldTimer', icon: '@tui.hourglass', tier: 'legendary' });
    } else if (hours >= HOURS.veteran) {
        badges.push({ key: 'veteran', icon: '@tui.shield', tier: 'rare' });
    } else if (hours >= HOURS.settler) {
        badges.push({ key: 'settler', icon: '@tui.tent', tier: 'common' });
    } else if (input.verified) {
        badges.push({ key: 'newcomer', icon: '@tui.sprout', tier: 'common' });
    }

    if (kills >= KILLS.slayer) {
        badges.push({ key: 'slayer', icon: '@tui.skull', tier: 'rare' });
    } else if (kills >= KILLS.warrior) {
        badges.push({ key: 'warrior', icon: '@tui.swords', tier: 'common' });
    }

    if (hours >= SURVIVOR_MIN_HOURS && deaths * SURVIVOR_HOURS_PER_DEATH <= hours) {
        badges.push({ key: 'survivor', icon: '@tui.heart-pulse', tier: 'rare' });
    }

    if (input.verified) {
        badges.push({ key: 'verified', icon: '@tui.badge-check', tier: 'common' });
    }

    return badges;
}
