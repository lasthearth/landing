import { ChangeDetectionStrategy, Component, computed, inject, input, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { I18nService } from '@core/i18n';
import { ClockService } from '@shared/lib/clock';
import { formatFullDate, formatRelativeTime, parseDateInput } from '@shared/lib/relative-time';

/**
 * Относительное время публикации: «только что», «5 минут назад», «вчера», «12 сентября».
 *
 * Вешается на элемент `<time>`: `<time [appRelativeTime]="date">`. Сам выставляет
 * `datetime` и подсказку с полной датой, обновляется раз в минуту. Содержимое
 * элемента (например, иконка) выводится перед подписью.
 *
 * При серверном рендере выводит полную дату: относительное время в пререндере
 * навсегда осталось бы на момент сборки.
 */
@Component({
    standalone: true,
    selector: 'time[appRelativeTime]',
    template: '<ng-content />{{ label() }}',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[attr.datetime]': 'iso()',
        '[attr.title]': 'fullDate()',
    },
})
export class RelativeTimeComponent {
    /**
     * Переводы.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Текущее время, обновляемое раз в минуту.
     */
    private readonly clock = inject(ClockService);

    /**
     * Признак выполнения в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Момент события: Date, ISO-строка или миллисекунды.
     */
    public readonly date = input<Date | string | number | null | undefined>(null, { alias: 'appRelativeTime' });

    /**
     * Текст, если дата не задана или некорректна.
     */
    public readonly fallback = input<string>('—');

    /**
     * Дата в виде объекта или null.
     */
    private readonly parsed = computed(() => parseDateInput(this.date()));

    /**
     * Значение атрибута `datetime`.
     */
    protected readonly iso = computed(() => this.parsed()?.toISOString() ?? null);

    /**
     * Полная дата для подсказки.
     */
    protected readonly fullDate = computed(() => {
        const date = this.parsed();
        return date ? formatFullDate(date, this.i18n.language()) : null;
    });

    /**
     * Подпись.
     */
    protected readonly label = computed(() => {
        const date = this.parsed();

        if (!date) {
            return this.fallback();
        }

        const locale = this.i18n.language();

        if (!this.isBrowser) {
            return formatFullDate(date, locale);
        }

        return formatRelativeTime(date, this.clock.now(), locale, {
            justNow: this.i18n.translate('shared.relativeTime.justNow'),
            minuteAgo: this.i18n.translate('shared.relativeTime.minuteAgo'),
            hourAgo: this.i18n.translate('shared.relativeTime.hourAgo'),
            weekAgo: this.i18n.translate('shared.relativeTime.weekAgo'),
        });
    });
}
