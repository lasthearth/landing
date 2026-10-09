import { BannerEffect, FrameEffect, ProfileBanner, ProfileFrame } from '../model/player-style';

/**
 * Цена баннеров, которые продаются за осколки.
 */
export const BANNER_SHARD_PRICE = 3000;

/**
 * Баннеры: сразу открыт только один, большинство — за достижения в игре и на
 * сайте, три — за осколки. Тот же список и те же условия — на сервере
 * (vsservice, internal/appearance/internal/model/catalog.go и appearance.proto).
 */
export const PROFILE_BANNERS: readonly ProfileBanner[] = [
    { id: 'procession', key: 'procession', image: '/covers/procession.webp', focus: '50%', requirement: { kind: 'free' } },
    { id: 'jesters', key: 'jesters', image: '/covers/jesters.webp', focus: '30%', requirement: { kind: 'hours', hours: 5 } },
    { id: 'wrestlers', key: 'wrestlers', image: '/covers/wrestlers.webp', focus: '4%', requirement: { kind: 'kills', kills: 3 } },
    { id: 'merry-company', key: 'merryCompany', image: '/covers/merry-company.webp', focus: '30%', requirement: { kind: 'events', count: 3 } },
    { id: 'unicorn-tapestry', key: 'unicornTapestry', image: '/covers/unicorn-tapestry.webp', focus: '55%', requirement: { kind: 'days', days: 30 } },
    { id: 'shot-monkey', key: 'shotMonkey', image: '/covers/shot-monkey.webp', focus: '18%', requirement: { kind: 'deaths', deaths: 10 } },
    { id: 'mummers', key: 'mummers', image: '/covers/mummers.webp', focus: '25%', requirement: { kind: 'referrals', count: 1 } },
    { id: 'scholar-cat', key: 'scholarCat', image: '/covers/scholar-cat.webp', focus: '35%', requirement: { kind: 'settlement' } },
    { id: 'duel', key: 'duel', image: '/covers/duel.webp', focus: '30%', requirement: { kind: 'kills', kills: 10 } },
    { id: 'monk-lion', key: 'monkLion', image: '/covers/monk-lion.webp', focus: '40%', requirement: { kind: 'days', days: 90 } },
    { id: 'odd-joust', key: 'oddJoust', image: '/covers/odd-joust.webp', focus: '30%', requirement: { kind: 'hgWins', wins: 1 } },
    { id: 'bad-manners', key: 'badManners', image: '/covers/bad-manners.webp', focus: '50%', requirement: { kind: 'deaths', deaths: 25 } },
    { id: 'bestiary', key: 'bestiary', image: '/covers/bestiary.webp', focus: '45%', requirement: { kind: 'survivor', hours: 50 } },
    { id: 'war-horse', key: 'warHorse', image: '/covers/war-horse.webp', focus: '40%', requirement: { kind: 'leader' } },
    { id: 'gallows', key: 'gallows', image: '/covers/gallows.webp', focus: '25%', requirement: { kind: 'kills', kills: 25 } },
    { id: 'temptation', key: 'temptation', image: '/covers/temptation.webp', focus: '25%', requirement: { kind: 'hours', hours: 300 } },
    { id: 'battle-courtrai', key: 'battleCourtrai', image: '/covers/battle-courtrai.webp', focus: '35%', requirement: { kind: 'kills', kills: 50 } },
    { id: 'wonder-city', key: 'wonderCity', image: '/covers/wonder-city.webp', focus: '40%', requirement: { kind: 'top' } },
    { id: 'azure-goat', key: 'azureGoat', image: '/covers/azure-goat.webp', focus: '35%', requirement: { kind: 'purchase', price: BANNER_SHARD_PRICE } },
    { id: 'three-dead', key: 'threeDead', image: '/covers/three-dead.webp', focus: '28%', requirement: { kind: 'purchase', price: BANNER_SHARD_PRICE } },
    { id: 'piper', key: 'piper', image: '/covers/piper.webp', focus: '20%', requirement: { kind: 'purchase', price: BANNER_SHARD_PRICE } },
];

/**
 * Анимации баннера: от спокойных (пыль, облака) к редким (гроза).
 */
export const BANNER_EFFECTS: readonly BannerEffect[] = [
    { id: 'none', requirement: { kind: 'free' } },
    { id: 'dust', requirement: { kind: 'free' } },
    { id: 'clouds', requirement: { kind: 'hours', hours: 10 } },
    { id: 'leaves', requirement: { kind: 'hours', hours: 30 } },
    { id: 'rain', requirement: { kind: 'hours', hours: 60 }, tint: 'overcast' },
    { id: 'fog', requirement: { kind: 'hours', hours: 100 }, tint: 'overcast' },
    { id: 'snow', requirement: { kind: 'kills', kills: 10 } },
    { id: 'fireflies', requirement: { kind: 'settlement' }, tint: 'night' },
    { id: 'embers', requirement: { kind: 'hours', hours: 250 }, tint: 'dusk' },
    { id: 'lightning', requirement: { kind: 'kills', kills: 50 }, tint: 'storm' },
    { id: 'starfall', requirement: { kind: 'days', days: 60 }, tint: 'night' },
    { id: 'aurora', requirement: { kind: 'hours', hours: 150 }, tint: 'night' },
];

/**
 * Рамки аватара: эпохи металла по часам в игре, «Кровь врага» — за убийства,
 * золото — только для топ-10.
 */
export const PROFILE_FRAMES: readonly ProfileFrame[] = [
    { id: 'none', requirement: { kind: 'free' } },
    { id: 'wood', requirement: { kind: 'free' } },
    { id: 'copper', requirement: { kind: 'hours', hours: 10 } },
    { id: 'bronze', requirement: { kind: 'hours', hours: 100 } },
    { id: 'iron', requirement: { kind: 'hours', hours: 500 } },
    { id: 'blood', requirement: { kind: 'kills', kills: 50 } },
    { id: 'gold', requirement: { kind: 'top' } },
];

/**
 * Анимации рамки: огонь, ветер, туман, мороз и гроза. Подходят к любой рамке.
 */
export const FRAME_EFFECTS: readonly FrameEffect[] = [
    { id: 'none', requirement: { kind: 'free' } },
    { id: 'wind', requirement: { kind: 'hours', hours: 20 } },
    { id: 'fire', requirement: { kind: 'hours', hours: 50 } },
    { id: 'fog', requirement: { kind: 'settlement' } },
    { id: 'frost', requirement: { kind: 'kills', kills: 25 } },
    { id: 'storm', requirement: { kind: 'top' } },
    { id: 'comet', requirement: { kind: 'kills', kills: 30 } },
    { id: 'aurora', requirement: { kind: 'survivor', hours: 50 } },
];
