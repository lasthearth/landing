import { KeyPointScheme } from '../model/key-point-scheme.interface';
import { KeyPointVariant } from '../model/key-point-variant.interface';

/**
 * Три шахты сервера: у каждой свой набор руд и своя схема прокачки.
 *
 * Шахта — масштабная подземная точка: различные руды в крупном объёме без поиска
 * и геологической разведки. Общие шаги у всех: открытие (вся руда средняя),
 * увеличение количества руды, повышение качества (богатая), сокращение времени
 * восстановления руды на 4 и на 6 часов. Метеоритное железо по решению владельца
 * перенесено из «Рудника Северной равнины» в конец «Чёрного кургана» — чтобы всё
 * железо не было в одной шахте.
 *
 * Цены — в серебряных (1 дукат = 100), подняты над числами владельца
 * (см. «Удорожание ключевых точек» в docs/history.md). Тексты — в словаре
 * `keyPoints.points.mine.variants.<key>.nodes`.
 */
const MINE_VARIANTS: readonly KeyPointVariant[] = [
    // north: вся ветка — 2325 серебряных (23.25 дуката).
    {
        key: 'north',
        lanes: 3,
        tiers: 8,
        nodes: [
            {
                id: 'open',
                kind: 'level',
                tier: 0,
                lane: 1,
                icon: '@tui.pickaxe',
                requires: [],
                cost: [
                    { resource: 'money', amount: 130 },
                    { resource: 'frames', amount: 304 },
                    { resource: 'stone', amount: 232 },
                    { resource: 'rope', amount: 48 },
                    { resource: 'metal', amount: 60 },
                    { resource: 'charcoal', amount: 64 },
                ],
            },
            {
                id: 'coal',
                kind: 'upgrade',
                tier: 1,
                lane: 1,
                icon: '@tui.flame',
                requires: ['open'],
                cost: [
                    { resource: 'money', amount: 70 },
                    { resource: 'frames', amount: 152 },
                    { resource: 'stone', amount: 112 },
                    { resource: 'rope', amount: 20 },
                    { resource: 'metal', amount: 28 },
                    { resource: 'charcoal', amount: 32 },
                ],
            },
            {
                id: 'amount',
                kind: 'upgrade',
                tier: 2,
                lane: 1,
                icon: '@tui.trending-up',
                requires: ['coal'],
                cost: [
                    { resource: 'money', amount: 110 },
                    { resource: 'frames', amount: 264 },
                    { resource: 'stone', amount: 192 },
                    { resource: 'rope', amount: 36 },
                    { resource: 'metal', amount: 52 },
                    { resource: 'bronze', amount: 16 },
                    { resource: 'charcoal', amount: 56 },
                ],
            },
            {
                id: 'sulfur',
                kind: 'upgrade',
                tier: 3,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['amount'],
                cost: [
                    { resource: 'money', amount: 120 },
                    { resource: 'frames', amount: 344 },
                    { resource: 'stone', amount: 264 },
                    { resource: 'rope', amount: 56 },
                    { resource: 'metal', amount: 72 },
                    { resource: 'bronze', amount: 24 },
                    { resource: 'charcoal', amount: 80 },
                    { resource: 'rustyGear', amount: 8 },
                ],
            },
            {
                id: 'olivine',
                kind: 'upgrade',
                tier: 4,
                lane: 1,
                icon: '@tui.gem',
                requires: ['sulfur'],
                cost: [
                    { resource: 'money', amount: 85 },
                    { resource: 'frames', amount: 368 },
                    { resource: 'stone', amount: 288 },
                    { resource: 'rope', amount: 60 },
                    { resource: 'metal', amount: 80 },
                    { resource: 'bronze', amount: 24 },
                    { resource: 'charcoal', amount: 80 },
                    { resource: 'rustyGear', amount: 8 },
                ],
            },
            {
                id: 'limonite',
                kind: 'upgrade',
                tier: 5,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['olivine'],
                cost: [
                    { resource: 'money', amount: 140 },
                    { resource: 'frames', amount: 568 },
                    { resource: 'stone', amount: 432 },
                    { resource: 'rope', amount: 96 },
                    { resource: 'metal', amount: 128 },
                    { resource: 'bronze', amount: 40 },
                    { resource: 'blackBronze', amount: 28 },
                    { resource: 'charcoal', amount: 128 },
                    { resource: 'rustyGear', amount: 13 },
                ],
            },
            {
                id: 'regen4',
                kind: 'upgrade',
                tier: 5,
                lane: 0,
                icon: '@tui.timer',
                requires: ['limonite'],
                cost: [
                    { resource: 'money', amount: 900 },
                    { resource: 'frames', amount: 1776 },
                    { resource: 'stone', amount: 1352 },
                    { resource: 'rope', amount: 272 },
                    { resource: 'metal', amount: 360 },
                    { resource: 'bronze', amount: 120 },
                    { resource: 'blackBronze', amount: 80 },
                    { resource: 'charcoal', amount: 376 },
                    { resource: 'rustyGear', amount: 40 },
                ],
            },
            {
                id: 'quality',
                kind: 'upgrade',
                tier: 6,
                lane: 1,
                icon: '@tui.sparkles',
                requires: ['limonite'],
                cost: [
                    { resource: 'money', amount: 380 },
                    { resource: 'frames', amount: 1440 },
                    { resource: 'stone', amount: 1056 },
                    { resource: 'rope', amount: 208 },
                    { resource: 'metal', amount: 288 },
                    { resource: 'bronze', amount: 96 },
                    { resource: 'blackBronze', amount: 60 },
                    { resource: 'charcoal', amount: 304 },
                    { resource: 'rustyGear', amount: 32 },
                ],
            },
            {
                id: 'hematite',
                kind: 'upgrade',
                tier: 7,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['quality'],
                cost: [
                    { resource: 'money', amount: 400 },
                    { resource: 'frames', amount: 1760 },
                    { resource: 'stone', amount: 1320 },
                    { resource: 'rope', amount: 264 },
                    { resource: 'metal', amount: 360 },
                    { resource: 'bronze', amount: 112 },
                    { resource: 'blackBronze', amount: 80 },
                    { resource: 'charcoal', amount: 376 },
                    { resource: 'rustyGear', amount: 40 },
                    { resource: 'temporalGear', amount: 1 },
                ],
            },
            {
                id: 'regen6',
                kind: 'upgrade',
                tier: 7,
                lane: 2,
                icon: '@tui.timer',
                requires: ['hematite'],
                cost: [
                    { resource: 'money', amount: 2000 },
                    { resource: 'frames', amount: 2800 },
                    { resource: 'stone', amount: 2080 },
                    { resource: 'rope', amount: 424 },
                    { resource: 'metal', amount: 560 },
                    { resource: 'bronze', amount: 176 },
                    { resource: 'blackBronze', amount: 120 },
                    { resource: 'charcoal', amount: 592 },
                    { resource: 'rustyGear', amount: 60 },
                    { resource: 'temporalGear', amount: 1 },
                ],
            },
        ],
    },
    // slope: вся ветка — 2675 серебряных (26.75 дуката).
    {
        key: 'slope',
        lanes: 3,
        tiers: 9,
        nodes: [
            {
                id: 'open',
                kind: 'level',
                tier: 0,
                lane: 1,
                icon: '@tui.pickaxe',
                requires: [],
                cost: [
                    { resource: 'money', amount: 130 },
                    { resource: 'frames', amount: 304 },
                    { resource: 'stone', amount: 232 },
                    { resource: 'rope', amount: 48 },
                    { resource: 'metal', amount: 60 },
                    { resource: 'charcoal', amount: 64 },
                ],
            },
            {
                id: 'malachite',
                kind: 'upgrade',
                tier: 1,
                lane: 1,
                icon: '@tui.gem',
                requires: ['open'],
                cost: [
                    { resource: 'money', amount: 70 },
                    { resource: 'frames', amount: 144 },
                    { resource: 'stone', amount: 104 },
                    { resource: 'rope', amount: 20 },
                    { resource: 'metal', amount: 28 },
                    { resource: 'charcoal', amount: 32 },
                ],
            },
            {
                id: 'amount',
                kind: 'upgrade',
                tier: 2,
                lane: 1,
                icon: '@tui.trending-up',
                requires: ['malachite'],
                cost: [
                    { resource: 'money', amount: 110 },
                    { resource: 'frames', amount: 256 },
                    { resource: 'stone', amount: 184 },
                    { resource: 'rope', amount: 36 },
                    { resource: 'metal', amount: 52 },
                    { resource: 'bronze', amount: 16 },
                    { resource: 'charcoal', amount: 52 },
                ],
            },
            {
                id: 'zinc',
                kind: 'upgrade',
                tier: 3,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['amount'],
                cost: [
                    { resource: 'money', amount: 80 },
                    { resource: 'frames', amount: 272 },
                    { resource: 'stone', amount: 216 },
                    { resource: 'rope', amount: 40 },
                    { resource: 'metal', amount: 56 },
                    { resource: 'bronze', amount: 20 },
                    { resource: 'charcoal', amount: 60 },
                ],
            },
            {
                id: 'quality',
                kind: 'upgrade',
                tier: 3,
                lane: 0,
                icon: '@tui.sparkles',
                requires: ['zinc'],
                cost: [
                    { resource: 'money', amount: 160 },
                    { resource: 'frames', amount: 392 },
                    { resource: 'stone', amount: 304 },
                    { resource: 'rope', amount: 60 },
                    { resource: 'metal', amount: 88 },
                    { resource: 'bronze', amount: 28 },
                    { resource: 'charcoal', amount: 88 },
                ],
            },
            {
                id: 'bismuthinite',
                kind: 'upgrade',
                tier: 4,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['zinc'],
                cost: [
                    { resource: 'money', amount: 85 },
                    { resource: 'frames', amount: 352 },
                    { resource: 'stone', amount: 272 },
                    { resource: 'rope', amount: 56 },
                    { resource: 'metal', amount: 72 },
                    { resource: 'bronze', amount: 24 },
                    { resource: 'charcoal', amount: 80 },
                    { resource: 'rustyGear', amount: 8 },
                ],
            },
            {
                id: 'cassiterite',
                kind: 'upgrade',
                tier: 5,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['bismuthinite'],
                cost: [
                    { resource: 'money', amount: 130 },
                    { resource: 'frames', amount: 544 },
                    { resource: 'stone', amount: 408 },
                    { resource: 'rope', amount: 88 },
                    { resource: 'metal', amount: 120 },
                    { resource: 'bronze', amount: 36 },
                    { resource: 'blackBronze', amount: 24 },
                    { resource: 'charcoal', amount: 120 },
                    { resource: 'rustyGear', amount: 12 },
                ],
            },
            {
                id: 'regen4',
                kind: 'upgrade',
                tier: 5,
                lane: 2,
                icon: '@tui.timer',
                requires: ['cassiterite'],
                cost: [
                    { resource: 'money', amount: 860 },
                    { resource: 'frames', amount: 1704 },
                    { resource: 'stone', amount: 1296 },
                    { resource: 'rope', amount: 256 },
                    { resource: 'metal', amount: 344 },
                    { resource: 'bronze', amount: 112 },
                    { resource: 'blackBronze', amount: 72 },
                    { resource: 'charcoal', amount: 360 },
                    { resource: 'rustyGear', amount: 36 },
                ],
            },
            {
                id: 'sulfur',
                kind: 'upgrade',
                tier: 6,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['cassiterite'],
                cost: [
                    { resource: 'money', amount: 140 },
                    { resource: 'frames', amount: 688 },
                    { resource: 'stone', amount: 504 },
                    { resource: 'rope', amount: 112 },
                    { resource: 'metal', amount: 144 },
                    { resource: 'bronze', amount: 44 },
                    { resource: 'blackBronze', amount: 32 },
                    { resource: 'charcoal', amount: 144 },
                    { resource: 'rustyGear', amount: 15 },
                ],
            },
            {
                id: 'emeraldLow',
                kind: 'upgrade',
                tier: 7,
                lane: 1,
                icon: '@tui.gem',
                requires: ['sulfur'],
                cost: [
                    { resource: 'money', amount: 390 },
                    { resource: 'frames', amount: 1672 },
                    { resource: 'stone', amount: 1256 },
                    { resource: 'rope', amount: 248 },
                    { resource: 'metal', amount: 344 },
                    { resource: 'bronze', amount: 112 },
                    { resource: 'blackBronze', amount: 72 },
                    { resource: 'charcoal', amount: 352 },
                    { resource: 'rustyGear', amount: 36 },
                ],
            },
            {
                id: 'emeraldMid',
                kind: 'upgrade',
                tier: 7,
                lane: 0,
                icon: '@tui.gem',
                requires: ['emeraldLow'],
                cost: [
                    { resource: 'money', amount: 200 },
                    { resource: 'frames', amount: 1032 },
                    { resource: 'stone', amount: 760 },
                    { resource: 'rope', amount: 152 },
                    { resource: 'metal', amount: 216 },
                    { resource: 'bronze', amount: 72 },
                    { resource: 'blackBronze', amount: 44 },
                    { resource: 'charcoal', amount: 216 },
                    { resource: 'rustyGear', amount: 24 },
                ],
            },
            {
                id: 'regen6',
                kind: 'upgrade',
                tier: 7,
                lane: 2,
                icon: '@tui.timer',
                requires: ['emeraldLow'],
                cost: [
                    { resource: 'money', amount: 1910 },
                    { resource: 'frames', amount: 2664 },
                    { resource: 'stone', amount: 1976 },
                    { resource: 'rope', amount: 400 },
                    { resource: 'metal', amount: 536 },
                    { resource: 'bronze', amount: 168 },
                    { resource: 'blackBronze', amount: 112 },
                    { resource: 'charcoal', amount: 560 },
                    { resource: 'rustyGear', amount: 56 },
                ],
            },
            {
                id: 'chromite',
                kind: 'upgrade',
                tier: 8,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['emeraldLow'],
                cost: [
                    { resource: 'money', amount: 200 },
                    { resource: 'frames', amount: 1200 },
                    { resource: 'stone', amount: 920 },
                    { resource: 'rope', amount: 184 },
                    { resource: 'metal', amount: 240 },
                    { resource: 'bronze', amount: 80 },
                    { resource: 'blackBronze', amount: 52 },
                    { resource: 'charcoal', amount: 256 },
                    { resource: 'rustyGear', amount: 28 },
                    { resource: 'temporalGear', amount: 1 },
                ],
            },
            {
                id: 'emeraldHigh',
                kind: 'upgrade',
                tier: 8,
                lane: 0,
                icon: '@tui.gem',
                requires: ['emeraldMid'],
                cost: [
                    { resource: 'money', amount: 400 },
                    { resource: 'frames', amount: 2000 },
                    { resource: 'stone', amount: 1520 },
                    { resource: 'rope', amount: 304 },
                    { resource: 'metal', amount: 400 },
                    { resource: 'bronze', amount: 128 },
                    { resource: 'blackBronze', amount: 88 },
                    { resource: 'charcoal', amount: 424 },
                    { resource: 'rustyGear', amount: 44 },
                    { resource: 'temporalGear', amount: 1 },
                ],
            },
        ],
    },
    // barrow: вся ветка — 2975 серебряных (29.75 дуката).
    {
        key: 'barrow',
        lanes: 3,
        tiers: 10,
        nodes: [
            {
                id: 'open',
                kind: 'level',
                tier: 0,
                lane: 1,
                icon: '@tui.pickaxe',
                requires: [],
                cost: [
                    { resource: 'money', amount: 130 },
                    { resource: 'frames', amount: 304 },
                    { resource: 'stone', amount: 232 },
                    { resource: 'rope', amount: 48 },
                    { resource: 'metal', amount: 60 },
                    { resource: 'charcoal', amount: 64 },
                ],
            },
            {
                id: 'cassiterite',
                kind: 'upgrade',
                tier: 1,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['open'],
                cost: [
                    { resource: 'money', amount: 70 },
                    { resource: 'frames', amount: 144 },
                    { resource: 'stone', amount: 104 },
                    { resource: 'rope', amount: 20 },
                    { resource: 'metal', amount: 28 },
                    { resource: 'charcoal', amount: 32 },
                ],
            },
            {
                id: 'amount',
                kind: 'upgrade',
                tier: 2,
                lane: 1,
                icon: '@tui.trending-up',
                requires: ['cassiterite'],
                cost: [
                    { resource: 'money', amount: 110 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },
                ],
            },
            {
                id: 'nativeCopper',
                kind: 'upgrade',
                tier: 3,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['amount'],
                cost: [
                    { resource: 'money', amount: 75 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },
                ],
            },
            {
                id: 'quality',
                kind: 'upgrade',
                tier: 3,
                lane: 0,
                icon: '@tui.sparkles',
                requires: ['nativeCopper'],
                cost: [
                    { resource: 'money', amount: 150 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },
                ],
            },
            {
                id: 'gold',
                kind: 'upgrade',
                tier: 4,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['nativeCopper'],
                cost: [
                    { resource: 'money', amount: 80 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },

                    { resource: 'rustyGear', amount: 1 },
                ],
            },
            {
                id: 'lead',
                kind: 'upgrade',
                tier: 5,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['gold'],
                cost: [
                    { resource: 'money', amount: 130 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },

                    { resource: 'rustyGear', amount: 1 },
                ],
            },
            {
                id: 'regen4',
                kind: 'upgrade',
                tier: 5,
                lane: 2,
                icon: '@tui.timer',
                requires: ['lead'],
                cost: [
                    { resource: 'money', amount: 840 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },

                    { resource: 'rustyGear', amount: 1 },
                ],
            },
            {
                id: 'silver',
                kind: 'upgrade',
                tier: 6,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['lead'],
                cost: [
                    { resource: 'money', amount: 140 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'blackBronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },

                    { resource: 'rustyGear', amount: 1 },
                ],
            },
            {
                id: 'diamondLow',
                kind: 'upgrade',
                tier: 7,
                lane: 1,
                icon: '@tui.gem',
                requires: ['silver'],
                cost: [
                    { resource: 'money', amount: 370 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'blackBronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },

                    { resource: 'rustyGear', amount: 1 },
                ],
            },
            {
                id: 'diamondMid',
                kind: 'upgrade',
                tier: 7,
                lane: 0,
                icon: '@tui.gem',
                requires: ['diamondLow'],
                cost: [
                    { resource: 'money', amount: 190 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'blackBronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },

                    { resource: 'rustyGear', amount: 1 },
                ],
            },
            {
                id: 'regen6',
                kind: 'upgrade',
                tier: 7,
                lane: 2,
                icon: '@tui.timer',
                requires: ['diamondLow'],
                cost: [
                    { resource: 'money', amount: 1840 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'blackBronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },

                    { resource: 'rustyGear', amount: 1 },
                ],
            },
            {
                id: 'titanium',
                kind: 'upgrade',
                tier: 8,
                lane: 1,
                icon: '@tui.mountain',
                requires: ['diamondLow'],
                cost: [
                    { resource: 'money', amount: 200 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'blackBronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },

                    { resource: 'rustyGear', amount: 1 },
                ],
            },
            {
                id: 'diamondHigh',
                kind: 'upgrade',
                tier: 8,
                lane: 0,
                icon: '@tui.gem',
                requires: ['diamondMid'],
                cost: [
                    { resource: 'money', amount: 390 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'blackBronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },

                    { resource: 'rustyGear', amount: 1 },
                ],
            },
            {
                id: 'meteoricIron',
                kind: 'upgrade',
                tier: 9,
                lane: 1,
                icon: '@tui.sparkle',
                requires: ['titanium'],
                cost: [
                    { resource: 'money', amount: 600 },

                    { resource: 'bronze', amount: 1 },

                    { resource: 'blackBronze', amount: 1 },

                    { resource: 'charcoal', amount: 1 },

                    { resource: 'rustyGear', amount: 1 },

                    { resource: 'temporalGear', amount: 1 },
                ],
            },
        ],
    },
];

/**
 * Схема типа «Шахта»: узлы и размер берутся из выбранной шахты (`variants`).
 */
export const MINE_SCHEME: KeyPointScheme = {
    id: 'mine',
    icon: '@tui.pickaxe',
    accent: 'var(--lh-rank-iron)',
    lanes: MINE_VARIANTS[0].lanes,
    tiers: MINE_VARIANTS[0].tiers,
    draft: false,
    nodes: MINE_VARIANTS[0].nodes,
    variants: MINE_VARIANTS,
};
