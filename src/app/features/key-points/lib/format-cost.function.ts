import { formatAmount, Language } from '@core/i18n';
import { UpgradeCost } from '../model/upgrade-cost.interface';
import { resourceUnitKey } from './resource-unit-key.function';
import { splitCost } from './split-cost.function';

/**
 * Готовит строку стоимости: «1 дукат 10 серебряных» или кратко «1 зол. 10 сер.».
 *
 * @param cost Строка стоимости.
 * @param language Язык интерфейса.
 * @param translate Перевод ключа словаря.
 * @param short Краткая форма — для бирки под узлом.
 * @returns Текст стоимости.
 */
export function formatCost(
    cost: UpgradeCost,
    language: Language,
    translate: (key: string) => string,
    short = false
): string {
    return splitCost(cost)
        .map(({ amount, unit }) => {
            const key = short ? `keyPoints.short.${unit}` : resourceUnitKey(unit, amount, language);
            return `${formatAmount(amount, language)} ${translate(key)}`;
        })
        .join(' ');
}
