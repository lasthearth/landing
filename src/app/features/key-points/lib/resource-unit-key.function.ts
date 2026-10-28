import { Language } from '@core/i18n';
import { CostUnit } from '../model/cost-unit.type';

/**
 * Ключ словаря для названия единицы в нужной форме числа: «1 дукат», «3 дуката», «28 дукатов».
 *
 * Формы берутся из `Intl.PluralRules`; в словаре у каждой единицы есть все четыре
 * (`one`, `few`, `many`, `other`) в обеих локалях — иначе не сойдётся паритет.
 *
 * @param unit Единица.
 * @param amount Количество.
 * @param language Язык интерфейса.
 * @returns Ключ вида `keyPoints.resources.ducats.few`.
 */
export function resourceUnitKey(unit: CostUnit, amount: number, language: Language): string {
    const form = new Intl.PluralRules(language).select(amount);
    const known = form === 'one' || form === 'few' || form === 'many' ? form : 'other';

    return `keyPoints.resources.${unit}.${known}`;
}
