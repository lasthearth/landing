import { FinderAnswers, FinderSize, FinderStyle } from './settlement-finder.model';

/**
 * Дипломатия поселения как стиль игры.
 */
const DIPLOMACY_STYLE: Record<string, Exclude<FinderStyle, 'any'>> = {
    Миролюбивый: 'peace',
    Нейтральный: 'neutral',
    Агрессивный: 'war',
};

/**
 * Порядок стилей: соседние — частичное совпадение.
 */
const STYLE_ORDER: Exclude<FinderStyle, 'any'>[] = ['peace', 'neutral', 'war'];

/**
 * Порядок размеров.
 */
const SIZE_ORDER: Exclude<FinderSize, 'any'>[] = ['small', 'medium', 'large'];

/**
 * Размер поселения по числу жителей.
 *
 * @param members Жителей.
 * @returns Размер.
 */
export function sizeOf(members: number): Exclude<FinderSize, 'any'> {
    if (members <= 5) {
        return 'small';
    }

    return members <= 15 ? 'medium' : 'large';
}

/**
 * Оценивает, насколько поселение подходит под ответы. Максимум — 100.
 *
 * Стиль — 45 баллов, размер — 30, активность — 15, свежесть (обновлялось за неделю) — 10.
 * Соседние варианты (мирный ↔ нейтральный, маленькое ↔ среднее) дают половину.
 *
 * @param answers Ответы игрока.
 * @param settlement Данные поселения.
 * @param now Текущий момент, мс.
 * @returns Баллы 0–100.
 */
export function scoreSettlement(
    answers: FinderAnswers,
    settlement: { diplomacy: string; members: number; online: number; updatedAt: number | null },
    now: number
): number {
    let score = 0;

    const style = DIPLOMACY_STYLE[settlement.diplomacy];
    if (answers.style === 'any') {
        score += 30;
    } else if (style) {
        const distance = Math.abs(STYLE_ORDER.indexOf(style) - STYLE_ORDER.indexOf(answers.style));
        score += distance === 0 ? 45 : distance === 1 ? 22 : 0;
    }

    if (answers.size === 'any') {
        score += 20;
    } else {
        const distance = Math.abs(SIZE_ORDER.indexOf(sizeOf(settlement.members)) - SIZE_ORDER.indexOf(answers.size));
        score += distance === 0 ? 30 : distance === 1 ? 15 : 0;
    }

    score += answers.activity === 'online' ? Math.min(settlement.online, 3) * 5 : 10;

    if (settlement.updatedAt && now - settlement.updatedAt < 7 * 24 * 3600 * 1000) {
        score += 10;
    }

    return Math.min(100, score);
}
