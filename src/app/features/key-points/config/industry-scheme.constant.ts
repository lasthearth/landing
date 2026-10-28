import { KeyPointScheme } from '../model/key-point-scheme.interface';

/**
 * Схема прокачки точки «Промышленная».
 *
 * ЧЕРНОВИК: структура, стоимость и бонусы — заглушки, пока владелец не распишет уровни.
 * Тексты узлов — в словаре `keyPoints.points.industry.nodes`.
 */
export const INDUSTRY_SCHEME: KeyPointScheme = {
    id: 'industry',
    icon: '@tui.factory',
    accent: 'var(--lh-tag-coral)',
    lanes: 3,
    tiers: 5,
    draft: true,
    nodes: [
        {
            id: 'forge',
            kind: 'level',
            tier: 0,
            lane: 1,
            icon: '@tui.anvil',
            requires: [],
            cost: [
                { resource: 'coins', amount: 128 },
                { resource: 'timber', amount: 84 },
            ],
        },
        {
            id: 'bloomery',
            kind: 'upgrade',
            tier: 1,
            lane: 0,
            icon: '@tui.flame',
            requires: ['forge'],
            cost: [
                { resource: 'coins', amount: 80 },
                { resource: 'timber', amount: 168 },
            ],
        },
        {
            id: 'sawmill',
            kind: 'upgrade',
            tier: 1,
            lane: 2,
            icon: '@tui.construction',
            requires: ['forge'],
            cost: [
                { resource: 'coins', amount: 104 },
                { resource: 'stone', amount: 124 },
            ],
        },
        {
            id: 'works2',
            kind: 'level',
            tier: 2,
            lane: 1,
            icon: '@tui.cog',
            requires: ['bloomery', 'sawmill'],
            cost: [
                { resource: 'coins', amount: 324 },
                { resource: 'stone', amount: 332 },
                { resource: 'labor', amount: 3 },
            ],
        },
        {
            id: 'foundry',
            kind: 'choice',
            tier: 3,
            lane: 0,
            icon: '@tui.layers',
            requires: ['works2'],
            choiceGroup: 'spec',
            cost: [
                { resource: 'coins', amount: 260 },
                { resource: 'metal', amount: 64 },
            ],
        },
        {
            id: 'mechanics',
            kind: 'choice',
            tier: 3,
            lane: 1,
            icon: '@tui.gauge',
            requires: ['works2'],
            choiceGroup: 'spec',
            cost: [
                { resource: 'coins', amount: 260 },
                { resource: 'metal', amount: 64 },
            ],
        },
        {
            id: 'storehouse',
            kind: 'upgrade',
            tier: 3,
            lane: 2,
            icon: '@tui.warehouse',
            requires: ['works2'],
            cost: [
                { resource: 'coins', amount: 196 },
                { resource: 'timber', amount: 248 },
                { resource: 'metal', amount: 32 },
            ],
        },
        {
            id: 'works3',
            kind: 'level',
            tier: 4,
            lane: 1,
            icon: '@tui.factory',
            requires: ['storehouse'],
            requiresAny: ['foundry', 'mechanics'],
            cost: [
                { resource: 'coins', amount: 780 },
                { resource: 'stone', amount: 664 },
                { resource: 'metal', amount: 124 },
                { resource: 'labor', amount: 5 },
            ],
        },
    ],
};
