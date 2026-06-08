import { RuleQuestionDto, RuleQuestion } from './rule-question.types';

/**
 * Преобразует DTO вопроса правил в UI-модель.
 *
 * @param dto DTO, полученное от API.
 * @returns UI-модель вопроса.
 */
export function mapDtoToRuleQuestion(dto: RuleQuestionDto): RuleQuestion {
    return {
        id: dto.id,
        text: dto.question,
        createdBy: dto.created_by,
        createdAt: dto.created_at ? new Date(dto.created_at) : undefined,
    };
}
