/**
 * Публичный API сущности "Реферальная программа".
 *
 * Экспортирует типы и API-сервис для работы с реферальными кодами.
 */

export * from './model/referral-code-response.interface';
export * from './model/referral-stats-response.interface';
export * from './model/use-referral-code-request.interface';
export { ReferralService } from './api/referral.service';
