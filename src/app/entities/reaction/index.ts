/**
 * Публичный API сущности «Реакция».
 */
export type {
    ReactionCounts,
    ReactionEmoji,
    ReactionTarget,
    ReactionTargetKind,
    ToggleReactionResult,
} from './model/reaction.types';
export type { ReactionEmojiDef, ReactionGroupKey } from './model/reaction-emojis.constant';
export { REACTION_EMOJIS, REACTION_GROUPS, isReactionEmoji, reactionGlyph } from './model/reaction-emojis.constant';
export { ReactionApiService, REACTION_TARGETS_LIMIT } from './api/reaction.api';
