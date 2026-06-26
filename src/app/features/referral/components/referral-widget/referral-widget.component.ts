import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiButton, TuiIcon } from '@taiga-ui/core';
import { catchError, combineLatest, map, Observable, of, shareReplay, startWith, switchMap } from 'rxjs';
import { ReferralService } from '@entities/referral';
import { UserService } from '@entities/user';
import { TranslatePipe } from '@core/i18n';

/**
 * View-model виджета реферальной программы.
 */
interface IReferralWidgetViewModel {
    /**
     * Реферальный код текущего игрока.
     */
    code: string | null;

    /**
     * Количество приглашённых игроков.
     */
    totalReferrals: number;

    /**
     * Количество заработанных монет.
     */
    totalCoinsEarned: number;
}

/**
 * Виджет реферальной программы.
 *
 * Отображает персональный реферальный код, позволяет скопировать его или ссылку,
 * а также показывает статистику приглашённых игроков и заработанных монет.
 */
@Component({
    selector: 'app-referral-widget',
    standalone: true,
    imports: [CommonModule, AsyncPipe, TuiIcon, TuiButton, TranslatePipe],
    templateUrl: './referral-widget.component.html',
    styleUrl: './referral-widget.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReferralWidgetComponent {
    /**
     * Сервис реферальной программы.
     */
    private readonly referralService = inject(ReferralService);

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * Ссылка для автоматической отписки.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Признак успешного копирования кода.
     */
    protected readonly codeCopied = signal(false);

    /**
     * Признак успешного копирования ссылки.
     */
    protected readonly linkCopied = signal(false);

    /**
     * Данные для отображения в виджете.
     */
    protected readonly vm$: Observable<IReferralWidgetViewModel> = this.userService.authState$.pipe(
        switchMap((isAuth) => {
            if (!isAuth) {
                return of({ code: null, totalReferrals: 0, totalCoinsEarned: 0 });
            }

            return combineLatest([
                this.referralService.getMyCode$().pipe(
                    map((response) => response.code),
                    catchError(() => of(null)),
                    startWith(null)
                ),
                this.referralService.getMyStats$().pipe(
                    map((response) => ({
                        totalReferrals: this.parseNumeric(response.total_referrals),
                        totalCoinsEarned: this.parseNumeric(response.total_coins_earned),
                    })),
                    catchError(() => of({ totalReferrals: 0, totalCoinsEarned: 0 })),
                    startWith({ totalReferrals: 0, totalCoinsEarned: 0 })
                ),
            ]).pipe(
                map(([code, stats]) => ({
                    code,
                    totalReferrals: stats.totalReferrals,
                    totalCoinsEarned: stats.totalCoinsEarned,
                }))
            );
        }),
        shareReplay(1),
        takeUntilDestroyed(this.destroyRef)
    );

    /**
     * Возвращает реферальную ссылку для текущего хоста.
     *
     * @param code Реферальный код.
     * @returns Полная ссылка с параметром ?ref=.
     */
    protected buildReferralLink(code: string): string {
        return `${window.location.origin}?ref=${encodeURIComponent(code)}`;
    }

    /**
     * Копирует реферальный код в буфер обмена.
     *
     * @param code Реферальный код.
     */
    protected async copyCode(code: string): Promise<void> {
        await this.copyToClipboard(code, this.codeCopied);
    }

    /**
     * Копирует реферальную ссылку в буфер обмена.
     *
     * @param code Реферальный код.
     */
    protected async copyLink(code: string): Promise<void> {
        const link = this.buildReferralLink(code);
        await this.copyToClipboard(link, this.linkCopied);
    }

    /**
     * Универсальный метод копирования текста в буфер обмена с визуальной обратной связью.
     *
     * @param text Текст для копирования.
     * @param signalRef Сигнал, в который записывается состояние копирования.
     */
    private async copyToClipboard(text: string, signalRef: ReturnType<typeof signal<boolean>>): Promise<void> {
        try {
            await navigator.clipboard.writeText(text);
            signalRef.set(true);
            setTimeout(() => signalRef.set(false), 2000);
        } catch {
            // Если API буфера обмена недоступно, ничего не делаем.
        }
    }

    /**
     * Преобразует числовое значение из ответа бэкенда в number.
     *
     * @param value Значение, которое может быть числом или строкой.
     * @returns Числовое значение или 0.
     */
    private parseNumeric(value: number | string | undefined): number {
        if (value === undefined || value === null) {
            return 0;
        }

        const parsed = typeof value === 'string' ? Number(value) : value;

        return Number.isFinite(parsed) ? parsed : 0;
    }
}
