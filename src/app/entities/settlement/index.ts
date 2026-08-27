/**
 * Публичный API сущности "Поселение".
 */

export * from './model/i-create-settlement';
export * from './model/i-member';
export * from './model/i-request-settlement';
export * from './model/i-settlement-invitation';
export * from './model/i-settlement';
export * from './model/i-update-settlement';
export { SettlementsTypes } from './model/settlements-types';
export type { SettlementBadgeTone } from './model/settlement-badge-tone';
export { SettlementService } from './api/settlement.service';
export { getSettlementTypeByKey } from './lib/get-settlement-type-by-key.function';
export { getSettlementTypeTone } from './lib/get-settlement-type-tone.function';
export { getSettlementTypeIcon } from './lib/get-settlement-type-icon.function';
export { getSettlementTier } from './lib/get-settlement-tier.function';
export { getDiplomacyTone } from './lib/get-diplomacy-tone.function';
export { GUILD_MARKER } from './lib/guild-marker.constant';
export { isGuildSettlement } from './lib/is-guild-settlement.function';
export { isGuildName } from './lib/is-guild-name.function';
export { getSettlementDisplayName } from './lib/get-settlement-display-name.function';
export { buildGuildName } from './lib/build-guild-name.function';
export { SettlementDisplayNamePipe } from './lib/settlement-display-name.pipe';
export { SettlementBadgeComponent } from './ui/settlement-badge/settlement-badge.component';
