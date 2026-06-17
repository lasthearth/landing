import { inject, Pipe, PipeTransform } from '@angular/core';

import { I18nService } from './i18n.service';
import { TranslationParams } from './i18n.types';

/**
 * Пайп для перевода строк в шаблонах.
 *
 * Пример: `{{ 'header.nav.home' | translate }}`
 * С параметрами: `{{ 'market.howToBuy.sbp.warning' | translate:{amount: 500, nickname: 'Ivan'} }}`
 */
@Pipe({
    name: 'translate',
    standalone: true,
    pure: false,
})
export class TranslatePipe implements PipeTransform {
    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Возвращает перевод по ключу.
     *
     * @param key Ключ перевода.
     * @param params Параметры интерполяции.
     * @returns Переведённая строка.
     */
    public transform(key: string | null | undefined, params?: TranslationParams): string {
        return this.i18n.translate(key, params);
    }
}
