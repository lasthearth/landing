import { KeyPointScheme } from '../model/key-point-scheme.interface';

/**
 * Схема прокачки точки «Форт».
 *
 * ЧЕРНОВИК: структура, стоимость и бонусы — заглушки, пока владелец не распишет уровни.
 * Тексты узлов — в словаре `keyPoints.points.fort.nodes`.
 */
export const FORT_SCHEME: KeyPointScheme = {
    id: 'fort',
    icon: '@tui.castle',
    accent: 'var(--lh-danger-strong)',
    lanes: 3,
    tiers: 5,
    draft: true,
    nodes: [
        {
            id: 'outpost',
            kind: 'level',
            tier: 0,
            lane: 1,
            icon: '@tui.flag',
            requires: [],
            cost: [
                { resource: 'coins', amount: 120 },
                { resource: 'timber', amount: 76 },
            ],
        },
        {
            id: 'palisade',
            kind: 'upgrade',
            tier: 1,
            lane: 0,
            icon: '@tui.fence',
            requires: ['outpost'],
            cost: [
                { resource: 'coins', amount: 72 },
                { resource: 'timber', amount: 152 },
            ],
        },
        {
            id: 'watchtower',
            kind: 'upgrade',
            tier: 1,
            lane: 2,
            icon: '@tui.tower-control',
            requires: ['outpost'],
            cost: [
                { resource: 'coins', amount: 96 },
                { resource: 'stone', amount: 116 },
            ],
        },
        {
            id: 'fort2',
            kind: 'level',
            tier: 2,
            lane: 1,
            icon: '@tui.shield',
            requires: ['palisade', 'watchtower'],
            cost: [
                { resource: 'coins', amount: 300 },
                { resource: 'stone', amount: 308 },
                { resource: 'labor', amount: 3 },
            ],
        },
        {
            id: 'garrison',
            kind: 'choice',
            tier: 3,
            lane: 0,
            icon: '@tui.swords',
            requires: ['fort2'],
            choiceGroup: 'spec',
            cost: [
                { resource: 'coins', amount: 240 },
                { resource: 'metal', amount: 56 },
            ],
        },
        {
            id: 'walls',
            kind: 'choice',
            tier: 3,
            lane: 1,
            icon: '@tui.brick-wall',
            requires: ['fort2'],
            choiceGroup: 'spec',
            cost: [
                { resource: 'coins', amount: 240 },
                { resource: 'metal', amount: 56 },
            ],
        },
        {
            id: 'armory',
            kind: 'upgrade',
            tier: 3,
            lane: 2,
            icon: '@tui.sword',
            requires: ['fort2'],
            cost: [
                { resource: 'coins', amount: 180 },
                { resource: 'timber', amount: 232 },
                { resource: 'metal', amount: 28 },
            ],
        },
        {
            id: 'citadel',
            kind: 'level',
            tier: 4,
            lane: 1,
            icon: '@tui.castle',
            requires: ['armory'],
            requiresAny: ['garrison', 'walls'],
            cost: [
                { resource: 'coins', amount: 720 },
                { resource: 'stone', amount: 616 },
                { resource: 'metal', amount: 116 },
                { resource: 'labor', amount: 5 },
            ],
        },
    ],
};
