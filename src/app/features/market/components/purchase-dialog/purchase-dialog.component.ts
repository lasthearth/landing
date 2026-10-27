import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { TuiButton, TuiIcon, TuiDialogContext, TuiAlertService, TuiDialogService } from '@taiga-ui/core';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { AbilityTagComponent } from '@shared/ui/ability-tag/ability-tag.component';
import { POLYMORPHEUS_CONTEXT, PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';
import { DonateService } from '@entities/donate';
import { UserService } from '@entities/user';
import { RequestStatusService } from '@core/services/request-status.service';
import { I18nService, TranslatePipe, AmountPipe } from '@core/i18n';
import { KitItemComponent } from '../../ui/kit-item/kit-item.component';
import { HowToBuyComponent } from '../how-to-buy/how-to-buy.component';

/**
 * Данные для диалога покупки товара.
 */
export interface PurchaseDialogData {
    /**
     * Идентификатор товара магазина.
     */
    itemId?: string;

    /**
     * Название товара.
     */
    title: string;

    /**
     * URL изображения товара.
     */
    image: string;

    /**
     * Цена товара за месяц.
     */
    monthPrice?: string;

    /**
     * Цена товара навсегда (за сезон).
     */
    seasonPrice?: string;

    /**
     * Изначально выбранный срок при открытии диалога.
     */
    initialTerm?: 'month' | 'season';

    /**
     * Валюта цены: коины или рубли.
     */
    currency: 'coins' | 'rubles';

    /**
     * Описание товара (для динамических товаров магазина).
     */
    description?: string;

    /**
     * Список игровых предметов в комплекте (для титулов/наборов).
     */
    kitItems?: Array<{ hint: string; count: number; image?: string }>;

    /**
     * Список ежедневных предметов (для титулов).
     */
    dailyKitItems?: Array<{ hint: string; count: number; image?: string }>;

    /**
     * Список способностей/бонусов (для титулов).
     */
    privileges?: Array<{ icon: string; text: string }>;
}

/**
 * Состояние баланса в диалоге покупки.
 *
 * `idle` — запрос ещё не шёл; `unauthenticated` — гость, покупке нужен вход;
 * `loading` — запрос в полёте; `ready` — баланс известен; `error` — запрос упал,
 * покупку не блокируем: итоговую проверку средств сделает сервер.
 */
type BalanceState = 'idle' | 'unauthenticated' | 'loading' | 'ready' | 'error';

/**
 * Диалог подтверждения покупки товара.
 *
 * Отображает информацию о товаре, его содержимое
 * и кнопки подтверждения/отмены.
 */
@Component({
    selector: 'app-purchase-dialog',
    standalone: true,
    imports: [AmountPipe, TuiButton, TuiIcon, ImageLoaderComponent, AbilityTagComponent, KitItemComponent, TranslatePipe],
    templateUrl: './purchase-dialog.component.html',
    styleUrl: './purchase-dialog.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseDialogComponent {
    /**
     * Контекст диалога Taiga UI.
     */
    protected readonly context = inject<TuiDialogContext<void, PurchaseDialogData>>(POLYMORPHEUS_CONTEXT);

    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис пользователя: состояние авторизации и запуск входа.
     */
    private readonly userService = inject(UserService);

    /**
     * Сервис статуса запросов.
     */
    private readonly requestStatusService = inject(RequestStatusService);

    /**
     * Сервис уведомлений.
     */
    private readonly alertService = inject(TuiAlertService);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис диалогов — для перехода к пополнению баланса.
     */
    private readonly dialogs = inject(TuiDialogService);

    /**
     * Данные товара для отображения.
     */
    protected readonly data = this.context.data;

    /**
     * Выбранный срок подписки: месяц или навсегда.
     */
    protected readonly selectedTerm = signal<'month' | 'season'>(this.data.initialTerm ?? 'month');

    /**
     * Текущий баланс осколков игрока.
     *
     * `null`, если баланс недоступен (неавторизован или ошибка запроса).
     */
    protected readonly balance = signal<string | null>(null);

    /**
     * Состояние баланса: по нему шаблон выбирает доступные действия.
     */
    protected readonly balanceState = signal<BalanceState>('idle');

    /**
     * Покупка доступна вошедшему пользователю, когда баланс известен или не загрузился.
     */
    protected readonly canBuy = computed(() => this.balanceState() === 'ready' || this.balanceState() === 'error');

    constructor() {
        this.userService.authState$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isAuthed) => {
            if (!isAuthed) {
                this.balance.set(null);
                this.balanceState.set('unauthenticated');

                return;
            }

            // authState$ переизлучается при продлении токена: повторный запрос баланса не нужен.
            if (this.balanceState() === 'ready' || this.balanceState() === 'loading') {
                return;
            }

            this.loadBalance();
        });
    }

    /**
     * Запрашивает баланс осколков и переводит диалог в соответствующее состояние.
     *
     * Ошибку GET `errorInterceptor` заменяет на `EMPTY`, поэтому состояние `error`
     * выставляется и в обработчике `complete`, если `next` так и не пришёл.
     */
    private loadBalance(): void {
        this.balanceState.set('loading');

        this.donateService
            .getMyBalance$()
            .pipe(catchError(() => of(null)), takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.balance.set(response?.coins ?? null);
                    this.balanceState.set(response ? 'ready' : 'error');
                },
                complete: () => {
                    if (this.balanceState() === 'loading') {
                        this.balanceState.set('error');
                    }
                },
            });
    }

    /**
     * Повторяет запрос баланса после сбоя.
     */
    protected onRetryBalance(): void {
        this.loadBalance();
    }

    /**
     * Закрывает диалог и запускает вход через Logto.
     *
     * Диалог закрывается до перехода: после входа пользователь попадает на страницу
     * магазина, а не на модальное окно поверх неё.
     */
    protected onSignIn(): void {
        this.context.completeWith();
        this.userService.signIn();
    }

    /**
     * Возвращает актуальную цену в зависимости от выбранного срока.
     */
    protected get activePrice(): string {
        return this.selectedTerm() === 'season' && this.data.seasonPrice
            ? this.data.seasonPrice
            : (this.data.monthPrice ?? '');
    }

    /**
     * Возвращает нехватку осколков для покупки.
     *
     * @returns Количество недостающих осколков, 0 если средств достаточно
     * либо баланс неизвестен.
     */
    protected missingAmount(): number {
        const balance = this.balance();
        if (balance === null) {
            return 0;
        }
        const available = parseInt(balance.replace(/\D/g, ''), 10) || 0;
        const price = parseInt(this.activePrice.replace(/\D/g, ''), 10) || 0;
        return Math.max(0, price - available);
    }

    /**
     * Закрывает диалог покупки и открывает диалог пополнения осколков.
     */
    protected onTopUp(): void {
        this.context.completeWith();
        this.dialogs.open(new PolymorpheusComponent(HowToBuyComponent), { size: 'auto' }).subscribe();
    }

    /**
     * Обрабатывает нажатие кнопки «Купить».
     *
     * Отправляет запрос покупки товара на бэкенд.
     * При успехе показывает уведомление и закрывает диалог.
     */
    protected onBuy(): void {
        // Кнопка заблокирована в шаблоне; проверка страхует от программного вызова.
        if (!this.canBuy()) {
            return;
        }

        const itemId = this.data.itemId;
        if (!itemId) {
            this.requestStatusService.showError(this.i18n.translate('market.purchaseDialog.unknownItemError'));
            return;
        }

        this.donateService
            .buyItem$(itemId)
            .pipe(
                this.requestStatusService.handleError(this.i18n.translate('market.purchaseDialog.purchaseError')),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => {
                    this.alertService
                        .open('', {
                            label: this.i18n.translate('market.purchaseDialog.successMessage'),
                            appearance: 'positive',
                        })
                        .subscribe();
                    this.context.completeWith();
                },
            });
    }

    /**
     * Закрывает диалог без покупки.
     */
    protected onCancel(): void {
        this.context.completeWith();
    }
}
