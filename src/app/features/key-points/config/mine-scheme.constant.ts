import { KeyPointScheme } from '../model/key-point-scheme.interface';

/**
 * Схема прокачки точки «Шахта».
 *
 * ЧЕРНОВИК: структура, стоимость и бонусы — заглушки, пока владелец не распишет уровни.
 * Тексты узлов — в словаре `keyPoints.points.mine.nodes`.
 */
export const MINE_SCHEME: KeyPointScheme = {
    id: 'mine',
    icon: '@tui.pickaxe',
    accent: 'var(--lh-rank-iron)',
    lanes: 3,
    tiers: 5,
    draft: true,
    nodes: [
        {
            id: 'adit',
            kind: 'level',
            tier: 0,
            lane: 1,
            icon: '@tui.shovel',
            requires: [],
            cost: [
                { resource: 'coins', amount: 100 },
                { resource: 'timber', amount: 64 },
            ],
        },
        {
            id: 'props',
            kind: 'upgrade',
            tier: 1,
            lane: 0,
            icon: '@tui.fence',
            requires: ['adit'],
            cost: [
                { resource: 'coins', amount: 60 },
                { resource: 'timber', amount: 128 },
            ],
        },
        {
            id: 'lift',
            kind: 'upgrade',
            tier: 1,
            lane: 2,
            icon: '@tui.cable-car',
            requires: ['adit'],
            cost: [
                { resource: 'coins', amount: 80 },
                { resource: 'stone', amount: 96 },
            ],
        },
        {
            id: 'mine2',
            kind: 'level',
            tier: 2,
            lane: 1,
            icon: '@tui.pickaxe',
            requires: ['props', 'lift'],
            cost: [
                { resource: 'coins', amount: 248 },
                { resource: 'stone', amount: 256 },
                { resource: 'labor', amount: 3 },
            ],
        },
        {
            id: 'deep',
            kind: 'choice',
            tier: 3,
            lane: 0,
            icon: '@tui.drill',
            requires: ['mine2'],
            choiceGroup: 'spec',
            cost: [
                { resource: 'coins', amount: 200 },
                { resource: 'metal', amount: 48 },
            ],
        },
        {
            id: 'sorting',
            kind: 'choice',
            tier: 3,
            lane: 1,
            icon: '@tui.gem',
            requires: ['mine2'],
            choiceGroup: 'spec',
            cost: [
                { resource: 'coins', amount: 200 },
                { resource: 'metal', amount: 48 },
            ],
        },
        {
            id: 'carts',
            kind: 'upgrade',
            tier: 3,
            lane: 2,
            icon: '@tui.truck',
            requires: ['mine2'],
            cost: [
                { resource: 'coins', amount: 152 },
                { resource: 'timber', amount: 192 },
                { resource: 'metal', amount: 24 },
            ],
        },
        {
            id: 'mine3',
            kind: 'level',
            tier: 4,
            lane: 1,
            icon: '@tui.mountain',
            requires: ['carts'],
            requiresAny: ['deep', 'sorting'],
            cost: [
                { resource: 'coins', amount: 600 },
                { resource: 'stone', amount: 512 },
                { resource: 'metal', amount: 96 },
                { resource: 'labor', amount: 5 },
            ],
        },
    ],
};
