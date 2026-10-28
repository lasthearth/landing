import { KeyPointScheme } from '../model/key-point-scheme.interface';

/**
 * Схема прокачки точки «Воздушная гавань».
 *
 * ЧЕРНОВИК: структура, стоимость и бонусы — заглушки, пока владелец не распишет уровни.
 * Тексты узлов — в словаре `keyPoints.points.harbor.nodes`.
 */
export const HARBOR_SCHEME: KeyPointScheme = {
    id: 'harbor',
    icon: '@tui.wind',
    accent: 'var(--lh-tag-cyan)',
    lanes: 3,
    tiers: 5,
    draft: true,
    nodes: [
        {
            id: 'mast',
            kind: 'level',
            tier: 0,
            lane: 1,
            icon: '@tui.anchor',
            requires: [],
            cost: [
                { resource: 'coins', amount: 152 },
                { resource: 'timber', amount: 96 },
            ],
        },
        {
            id: 'beacon',
            kind: 'upgrade',
            tier: 1,
            lane: 0,
            icon: '@tui.flame',
            requires: ['mast'],
            cost: [
                { resource: 'coins', amount: 88 },
                { resource: 'timber', amount: 192 },
            ],
        },
        {
            id: 'hangar',
            kind: 'upgrade',
            tier: 1,
            lane: 2,
            icon: '@tui.warehouse',
            requires: ['mast'],
            cost: [
                { resource: 'coins', amount: 120 },
                { resource: 'stone', amount: 144 },
            ],
        },
        {
            id: 'harbor2',
            kind: 'level',
            tier: 2,
            lane: 1,
            icon: '@tui.ship-wheel',
            requires: ['beacon', 'hangar'],
            cost: [
                { resource: 'coins', amount: 376 },
                { resource: 'stone', amount: 384 },
                { resource: 'labor', amount: 3 },
            ],
        },
        {
            id: 'courier',
            kind: 'choice',
            tier: 3,
            lane: 0,
            icon: '@tui.scroll',
            requires: ['harbor2'],
            choiceGroup: 'spec',
            cost: [
                { resource: 'coins', amount: 300 },
                { resource: 'metal', amount: 72 },
            ],
        },
        {
            id: 'cargo',
            kind: 'choice',
            tier: 3,
            lane: 1,
            icon: '@tui.package',
            requires: ['harbor2'],
            choiceGroup: 'spec',
            cost: [
                { resource: 'coins', amount: 300 },
                { resource: 'metal', amount: 72 },
            ],
        },
        {
            id: 'shipyard',
            kind: 'upgrade',
            tier: 3,
            lane: 2,
            icon: '@tui.hammer',
            requires: ['harbor2'],
            cost: [
                { resource: 'coins', amount: 224 },
                { resource: 'timber', amount: 288 },
                { resource: 'metal', amount: 36 },
            ],
        },
        {
            id: 'harbor3',
            kind: 'level',
            tier: 4,
            lane: 1,
            icon: '@tui.wind',
            requires: ['shipyard'],
            requiresAny: ['courier', 'cargo'],
            cost: [
                { resource: 'coins', amount: 900 },
                { resource: 'stone', amount: 768 },
                { resource: 'metal', amount: 144 },
                { resource: 'labor', amount: 5 },
            ],
        },
    ],
};
