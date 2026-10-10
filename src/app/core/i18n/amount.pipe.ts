import { inject, Pipe, PipeTransform } from '@angular/core';

import { I18nService } from './i18n.service';
import { formatAmount } from './lib/format-amount.function';

/**
 * Пайп для чисел в шаблонах: суммы, цены, баланс, статистика.
 * Разделяет разряды по правилам языка сайта («5 000» / «5,000») и
 * переключается вместе с языком. Встроенный `number` всегда форматировал
 * по-английски («5,000»), а большинство чисел выводилось вовсе без разрядов.
 *
 * Пример: `{{ balance | amount }}`, с дробной частью: `{{ hours | amount: 1 }}`.
 */
@Pipe({
    name: 'amount',
    standalone: true,
    pure: false,
})
export class AmountPipe implements PipeTransform {
    /**
     * Сервис интернационализации — источник текущего языка.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Форматирует число по текущему языку.
     *
     * @param value Число или числовая строка.
     * @param maxFractionDigits Сколько знаков после запятой оставлять.
     * @returns Отформатированная строка.
     */
    public transform(value: number | string | null | undefined, maxFractionDigits = 0): string {
        return formatAmount(value, this.i18n.language(), maxFractionDigits);
    }
}
