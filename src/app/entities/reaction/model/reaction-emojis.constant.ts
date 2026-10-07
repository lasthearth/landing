/**
 * Реакции, сгруппированные для выбора.
 *
 * Ключи совпадают с серверным списком (`internal/reaction/internal/model`):
 * сервер принимает только их. Добавляя реакцию, добавьте её и туда.
 * Глифы — эмодзи не новее Unicode 12, чтобы они были и в Windows 10.
 */
export const REACTION_GROUPS = [
    {
        key: 'emotions',
        emojis: [
            { key: 'like', glyph: '👍' },
            { key: 'heart', glyph: '❤️' },
            { key: 'laugh', glyph: '😂' },
            { key: 'wow', glyph: '😮' },
            { key: 'sad', glyph: '😢' },
            { key: 'think', glyph: '🤔' },
            { key: 'angry', glyph: '😡' },
            { key: 'clap', glyph: '👏' },
        ],
    },
    {
        key: 'battle',
        emojis: [
            { key: 'swords', glyph: '⚔️' },
            { key: 'shield', glyph: '🛡️' },
            { key: 'dagger', glyph: '🗡️' },
            { key: 'bow', glyph: '🏹' },
            { key: 'axe', glyph: '🪓' },
            { key: 'skull', glyph: '💀' },
            { key: 'castle', glyph: '🏰' },
            { key: 'trophy', glyph: '🏆' },
        ],
    },
    {
        key: 'court',
        emojis: [
            { key: 'crown', glyph: '👑' },
            { key: 'scroll', glyph: '📜' },
            { key: 'scales', glyph: '⚖️' },
            { key: 'deal', glyph: '🤝' },
            { key: 'thanks', glyph: '🙏' },
            { key: 'bell', glyph: '🔔' },
            { key: 'horn', glyph: '📯' },
            { key: 'key', glyph: '🗝️' },
        ],
    },
    {
        key: 'feast',
        emojis: [
            { key: 'fire', glyph: '🔥' },
            { key: 'ale', glyph: '🍺' },
            { key: 'wine', glyph: '🍷' },
            { key: 'feast', glyph: '🍖' },
            { key: 'bread', glyph: '🍞' },
            { key: 'honey', glyph: '🍯' },
            { key: 'party', glyph: '🎉' },
            { key: 'candle', glyph: '🕯️' },
        ],
    },
    {
        key: 'craft',
        emojis: [
            { key: 'smith', glyph: '⚒️' },
            { key: 'pick', glyph: '⛏️' },
            { key: 'brick', glyph: '🧱' },
            { key: 'pottery', glyph: '🏺' },
            { key: 'gold', glyph: '💰' },
            { key: 'gem', glyph: '💎' },
            { key: 'harvest', glyph: '🌾' },
            { key: 'compass', glyph: '🧭' },
        ],
    },
    {
        key: 'wilds',
        emojis: [
            { key: 'dragon', glyph: '🐉' },
            { key: 'wolf', glyph: '🐺' },
            { key: 'bear', glyph: '🐻' },
            { key: 'horse', glyph: '🐎' },
            { key: 'drifter', glyph: '🧟' },
            { key: 'storm', glyph: '🌀' },
            { key: 'winter', glyph: '❄️' },
            { key: 'mushroom', glyph: '🍄' },
        ],
    },
] as const;

/**
 * Группа реакций в выборе.
 */
export type ReactionGroupKey = (typeof REACTION_GROUPS)[number]['key'];

/**
 * Реакция, которую может поставить игрок.
 */
export type ReactionEmoji = (typeof REACTION_GROUPS)[number]['emojis'][number]['key'];

/**
 * Реакция с её символом.
 */
export interface ReactionEmojiDef {
    readonly key: ReactionEmoji;
    readonly glyph: string;
}

/**
 * Все реакции в порядке показа (по группам).
 */
export const REACTION_EMOJIS: readonly ReactionEmojiDef[] = REACTION_GROUPS.flatMap(
    (group): readonly ReactionEmojiDef[] => group.emojis
);

/**
 * Символ реакции по ключу.
 */
const GLYPHS = new Map<string, string>(REACTION_EMOJIS.map((emoji) => [emoji.key, emoji.glyph]));

/**
 * Проверяет, что строка — известная реакция.
 *
 * @param value Строка из API.
 * @returns Признак известной реакции.
 */
export function isReactionEmoji(value: string): value is ReactionEmoji {
    return GLYPHS.has(value);
}

/**
 * Возвращает символ реакции.
 *
 * @param emoji Реакция.
 * @returns Эмодзи.
 */
export function reactionGlyph(emoji: ReactionEmoji): string {
    return GLYPHS.get(emoji) ?? '';
}
