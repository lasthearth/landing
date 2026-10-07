import { ReactionEmoji } from './reaction.types';

/**
 * Реакции в порядке показа и их символы.
 *
 * Порядок совпадает с серверным: счётчики приходят в нём же.
 */
export const REACTION_EMOJIS: readonly { readonly key: ReactionEmoji; readonly glyph: string }[] = [
    { key: 'like', glyph: '👍' },
    { key: 'heart', glyph: '❤️' },
    { key: 'fire', glyph: '🔥' },
    { key: 'laugh', glyph: '😂' },
    { key: 'swords', glyph: '⚔️' },
];

/**
 * Проверяет, что строка — известная реакция.
 *
 * @param value Строка из API.
 * @returns Признак известной реакции.
 */
export function isReactionEmoji(value: string): value is ReactionEmoji {
    return REACTION_EMOJIS.some((emoji) => emoji.key === value);
}
