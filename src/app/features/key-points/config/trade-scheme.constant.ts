import { KeyPointScheme } from '../model/key-point-scheme.interface';

/**
 * Схема прокачки точки «Торговая».
 *
 * ЧЕРНОВИК: структура, стоимость и бонусы — заглушки, пока владелец не распишет уровни.
 * Тексты узлов — в словаре `keyPoints.points.trade.nodes`.
 */
export const TRADE_SCHEME: KeyPointScheme = {
    id: 'trade',
    icon: '@tui.store',
    accent: 'var(--lh-medal-gold)',
    lanes: 3,
    tiers: 5,
    draft: true,
    nodes: [
        {
            id: 'post',
            kind: 'level',
            tier: 0,
            lane: 1,
            icon: '@tui.store',
            requires: [],
            cost: [
                { resource: 'coins', amount: 112 },
                { resource: 'timber', amount: 72 },
            ],
        },
        {
            id: 'scales',
            kind: 'upgrade',
            tier: 1,
            lane: 0,
            icon: '@tui.scale',
            requires: ['post'],
            cost: [
                { resource: 'coins', amount: 64 },
                { resource: 'timber', amount: 140 },
            ],
        },
        {
            id: 'caravan',
            kind: 'upgrade',
            tier: 1,
            lane: 2,
            icon: '@tui.truck',
            requires: ['post'],
            cost: [
                { resource: 'coins', amount: 88 },
                { resource: 'stone', amount: 104 },
            ],
        },
        {
            id: 'fair',
            kind: 'level',
            tier: 2,
            lane: 1,
            icon: '@tui.coins',
            requires: ['scales', 'caravan'],
            cost: [
                { resource: 'coins', amount: 276 },
                { resource: 'stone', amount: 280 },
                { resource: 'labor', amount: 3 },
            ],
        },
        {
            id: 'guild',
            kind: 'choice',
            tier: 3,
            lane: 0,
            icon: '@tui.handshake',
            requires: ['fair'],
            choiceGroup: 'spec',
            cost: [
                { resource: 'coins', amount: 220 },
                { resource: 'metal', amount: 52 },
            ],
        },
        {
            id: 'exchange',
            kind: 'choice',
            tier: 3,
            lane: 1,
            icon: '@tui.hand-coins',
            requires: ['fair'],
            choiceGroup: 'spec',
            cost: [
                { resource: 'coins', amount: 220 },
                { resource: 'metal', amount: 52 },
            ],
        },
        {
            id: 'depot',
            kind: 'upgrade',
            tier: 3,
            lane: 2,
            icon: '@tui.package',
            requires: ['fair'],
            cost: [
                { resource: 'coins', amount: 164 },
                { resource: 'timber', amount: 212 },
                { resource: 'metal', amount: 28 },
            ],
        },
        {
            id: 'chamber',
            kind: 'level',
            tier: 4,
            lane: 1,
            icon: '@tui.landmark',
            requires: ['depot'],
            requiresAny: ['guild', 'exchange'],
            cost: [
                { resource: 'coins', amount: 660 },
                { resource: 'stone', amount: 564 },
                { resource: 'metal', amount: 104 },
                { resource: 'labor', amount: 5 },
            ],
        },
    ],
};
