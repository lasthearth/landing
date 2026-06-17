import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { LocalStorageService } from '@core/services/local-storage.service';
import { ALL_TRANSLATIONS } from './translations';
import { Language, Translations, TranslationParams, TranslationValue } from './i18n.types';

/**
 * Ключ для хранения выбранного языка в localStorage.
 */
const LANGUAGE_STORAGE_KEY = 'lh-language';

/**
 * Язык по умолчанию.
 */
const DEFAULT_LANGUAGE: Language = 'ru';

/**
 * Сервис интернационализации.
 *
 * Управляет текущим языком, хранит его в localStorage и предоставляет
 * перевод строк по ключу с поддержкой вложенных ключей и параметров.
 */
@Injectable({
    providedIn: 'root',
})
export class I18nService {
    /**
     * Идентификатор платформы.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Сервис локального хранилища.
     */
    private readonly localStorageService = inject(LocalStorageService);

    /**
     * Текущий язык интерфейса.
     */
    public readonly language = signal<Language>(DEFAULT_LANGUAGE);

    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            const savedLanguage = this.localStorageService.getItem<Language>(LANGUAGE_STORAGE_KEY);
            if (savedLanguage && savedLanguage in ALL_TRANSLATIONS) {
                this.language.set(savedLanguage);
            }
        }
    }

    /**
     * Возвращает перевод по ключу.
     *
     * Ключ может быть вложенным через точку, например `header.nav.home`.
     * Если перевод не найден, возвращается ключ.
     *
     * @param key Ключ перевода.
     * @param params Параметры для интерполяции в формате {{name}}.
     * @returns Переведённая строка.
     */
    public translate(key: string | null | undefined, params?: TranslationParams): string {
        if (key == null) {
            return '';
        }
        const value = this.getNestedValue(ALL_TRANSLATIONS[this.language()], key);
        if (typeof value !== 'string') {
            return key;
        }
        return this.interpolate(value, params);
    }

    /**
     * Меняет текущий язык интерфейса.
     *
     * @param language Новый язык.
     */
    public setLanguage(language: Language): void {
        if (!(language in ALL_TRANSLATIONS)) {
            return;
        }
        this.language.set(language);
        if (isPlatformBrowser(this.platformId)) {
            this.localStorageService.setItem(LANGUAGE_STORAGE_KEY, language);
        }
    }

    /**
     * Извлекает вложенное значение из словаря по ключу.
     *
     * @param translations Словарь переводов.
     * @param key Ключ через точку.
     * @returns Значение перевода или undefined.
     */
    private getNestedValue(translations: Translations, key: string): TranslationValue | undefined {
        const parts = key.split('.');
        let current: TranslationValue | undefined = translations;
        for (const part of parts) {
            if (current === null || typeof current !== 'object') {
                return undefined;
            }
            current = current[part];
        }
        return current;
    }

    /**
     * Подставляет параметры в строку перевода.
     *
     * @param value Исходная строка.
     * @param params Параметры.
     * @returns Строка с подставленными значениями.
     */
    private interpolate(value: string, params?: TranslationParams): string {
        if (!params) {
            return value;
        }
        return value.replace(/\{\{(\s*\w+\s*)\}\}/g, (_, name: string) => {
            const trimmed = name.trim();
            if (!(trimmed in params)) {
                return `{{${trimmed}}}`;
            }
            const param = params[trimmed];
            return param == null ? '' : String(param);
        });
    }
}
