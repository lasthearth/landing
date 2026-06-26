import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, inject, Injectable, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { combineLatest, filter, of, take } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ReferralService } from '@entities/referral';
import { UserService } from '@entities/user';
import { LocalStorageService } from '@core/services/local-storage.service';
import { TuiAlertService } from '@taiga-ui/core';
import { I18nService } from '@core/i18n';

/**
 * Ключ локального хранилища, по которому отмечается факт применения реферального кода.
 */
const REFERRAL_CODE_USED_KEY = 'referralCodeUsed';

/**
 * Сервис автоматического применения реферального кода из URL (?ref=).
 *
 * Срабатывает один раз после успешной авторизации пользователя:
 * читает параметр `ref`, вызывает `/v1/referral/use`,
 * сохраняет флаг в localStorage и убирает параметр из адресной строки.
 */
@Injectable({
    providedIn: 'root',
})
export class ReferralApplierService {
    /**
     * Сервис реферальной программы.
     */
    private readonly referralService = inject(ReferralService);

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * Локальное хранилище.
     */
    private readonly localStorageService = inject(LocalStorageService);

    /**
     * Сервис уведомлений.
     */
    private readonly alertService = inject(TuiAlertService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Идентификатор платформы.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Ссылка для автоматической отписки.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Флаг, предотвращающий повторные попытки применения кода.
     */
    private attempted = false;

    /**
     * Запускает отслеживание авторизации и применяет код, если он есть в URL.
     */
    constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.init();
        }
    }

    /**
     * Подписывается на завершение проверки авторизации и пытается применить код.
     *
     * Реагирует как на первоначальный вход, так и на последующую авторизацию
     * (например, после редиректа от OIDC-провайдера).
     */
    private init(): void {
        combineLatest([this.userService.authState$, this.userService.isAuthChecked$])
            .pipe(
                filter(([isAuth, checked]) => isAuth && checked),
                filter(() => !this.attempted),
                take(1),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe(() => this.applyIfNeeded());
    }

    /**
     * Проверяет наличие параметра `ref` в URL и применяет реферальный код.
     */
    private applyIfNeeded(): void {
        this.attempted = true;

        const params = new URLSearchParams(window.location.search);
        const code = params.get('ref');

        if (!code) {
            return;
        }

        if (this.localStorageService.getItem<boolean>(REFERRAL_CODE_USED_KEY)) {
            this.removeRefQueryParam();
            return;
        }

        this.referralService
            .useCode$(code)
            .pipe(
                take(1),
                catchError((error: HttpErrorResponse) => {
                    if (error.status === 409) {
                        this.localStorageService.setItem(REFERRAL_CODE_USED_KEY, true);
                    } else if (error.status === 404) {
                        this.alertService
                            .open(this.i18n.translate('referral.apply.notFound'), {
                                label: 'Ошибка',
                                appearance: 'negative',
                            })
                            .subscribe();
                    }

                    this.removeRefQueryParam();
                    return of(null);
                })
            )
            .subscribe(() => {
                this.localStorageService.setItem(REFERRAL_CODE_USED_KEY, true);
                this.alertService
                    .open(this.i18n.translate('referral.apply.success'), {
                        label: 'Успех',
                        appearance: 'positive',
                    })
                    .subscribe();
                this.removeRefQueryParam();
            });
    }

    /**
     * Убирает параметр `ref` из адресной строки без перезагрузки страницы.
     */
    private removeRefQueryParam(): void {
        const url = new URL(window.location.href);

        url.searchParams.delete('ref');

        window.history.replaceState({}, document.title, url.toString());
    }
}
