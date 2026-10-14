import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LocalStorageService } from '@core/services/local-storage.service';

/**
 * Ключ localStorage с решением пользователя об аналитических cookies.
 */
const ANALYTICS_CONSENT_STORAGE_KEY = 'lh-analytics-consent';

/**
 * Решение пользователя об аналитических cookies.
 *
 * Хранится в localStorage через {@link LocalStorageService}, который безопасен
 * в серверном окружении: на SSR и пререндере решение всегда null, и счётчики
 * не подключаются.
 */
@Injectable({ providedIn: 'root' })
export class ConsentService {
    /**
     * Сервис localStorage.
     */
    private readonly storage = inject(LocalStorageService);

    /**
     * Признак выполнения в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Текущее решение: true — аналитика разрешена, false — отказ,
     * null — пользователя ещё не спрашивали.
     */
    public readonly analytics = signal<boolean | null>(
        this.isBrowser ? (this.storage.getItem<boolean>(ANALYTICS_CONSENT_STORAGE_KEY) ?? null) : null
    );

    /**
     * Сохраняет решение пользователя.
     *
     * @param allowed Разрешена ли аналитика.
     */
    public setAnalytics(allowed: boolean): void {
        this.storage.setItem(ANALYTICS_CONSENT_STORAGE_KEY, allowed);
        this.analytics.set(allowed);
    }
}
