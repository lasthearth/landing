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
export { REACTION_EMOJIS, isReactionEmoji } from './model/reaction-emojis.constant';
export { ReactionApiService, REACTION_TARGETS_LIMIT } from './api/reaction.api';
