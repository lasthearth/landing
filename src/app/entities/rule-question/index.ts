/**
 * Публичный API сущности "Вопрос правил".
 *
 * Экспортирует типы и API-сервис для работы с вопросами правил.
 */

export * from './model/rule-question.types';
export { mapDtoToRuleQuestion } from './model/rule-question.mapper';
export { RuleQuestionApiService } from './api/rule-question.api';
export type { RuleQuestionDto as IVerificationQuestion } from './model/rule-question.types';
