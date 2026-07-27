import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { LocalStorageService } from './local-storage.service';

/**
 * Ключ хранения темы в localStorage.
 */
const THEME_STORAGE_KEY = 'lh-theme';

/**
 * Тема оформления сайта.
 */
export type Theme = 'light' | 'dark';

/**
 * Сервис темы оформления.
 *
 * Управляет атрибутом `data-theme` на корневом элементе `<html>`
 * и сохраняет выбор пользователя в localStorage.
 */
@Injectable({
    providedIn: 'root',
})
export class ThemeService {
    /**
     * Сервис локального хранилища.
     */
    private readonly localStorage = inject(LocalStorageService);

    /**
     * Идентификатор платформы (браузер/сервер).
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Ссылка на document.
     */
    private readonly document = inject(DOCUMENT);

    /**
     * Текущая тема оформления.
     */
    public readonly theme: WritableSignal<Theme> = signal('light');

    /**
     * Инициализирует тему из localStorage (только в браузере).
     */
    public constructor() {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const saved = this.localStorage.getItem<Theme>(THEME_STORAGE_KEY);

        if (saved === 'dark' || saved === 'light') {
            this.theme.set(saved);
        }

        this.apply();
    }

    /**
     * Переключает тему на противоположную.
     */
    public toggle(): void {
        this.theme.update((current) => (current === 'light' ? 'dark' : 'light'));
        this.localStorage.setItem(THEME_STORAGE_KEY, this.theme());
        this.apply();
    }

    /**
     * Применяет текущую тему к корневому элементу.
     */
    private apply(): void {
        this.document.documentElement.setAttribute('data-theme', this.theme());
    }
}
