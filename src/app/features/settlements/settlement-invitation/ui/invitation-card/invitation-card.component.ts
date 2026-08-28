import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    input,
    InputSignal,
    output,
    OutputEmitterRef,
    Signal,
    signal,
} from '@angular/core';
import { catchError, of, tap } from 'rxjs';
import { TuiIcon } from '@taiga-ui/core';
import {
    getDiplomacyTone,
    getSettlementDisplayName,
    getSettlementTypeByKey,
    getSettlementTypeIcon,
    getSettlementTypeTone,
    isGuildSettlement,
    ISettlement,
    SettlementBadgeComponent,
    SettlementBadgeTone,
    SettlementService,
} from '@entities/settlement';
import { ImageLoaderComponent } from '@shared/ui/image-loader';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';

/**
 * Карточка входящего приглашения в поселение.
 *
 * Показывает то же, что и карточка селения в списке — изображение, название,
 * тип и дипломатию: решение «вступать или нет» нельзя принять по одному имени.
 * Данные селения подгружаются по идентификатору из приглашения.
 */
@Component({
    selector: 'app-invitation-card',
    standalone: true,
    imports: [TuiIcon, TranslatePipe, ImageLoaderComponent, SettlementBadgeComponent],
    templateUrl: './invitation-card.component.html',
    styleUrl: './invitation-card.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvitationCardComponent {
    /**
     * Сервис поселений.
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис уведомлений о результате запроса.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Идентификатор приглашения.
     */
    public readonly invitationId: InputSignal<string> = input.required();

    /**
     * Идентификатор приглашающего поселения.
     */
    public readonly settlementId: InputSignal<string> = input.required();

    /**
     * Сообщает, что приглашение обработано и данные страницы устарели.
     */
    public readonly resolved: OutputEmitterRef<void> = output();

    /**
     * Данные приглашающего поселения.
     */
    protected readonly settlement = signal<ISettlement | null>(null);

    /**
     * Признак выполняющегося запроса.
     */
    protected readonly busy = signal(false);

    /**
     * Отображаемое название поселения.
     */
    protected readonly displayName: Signal<string> = computed(() => {
        const settlement = this.settlement();

        return settlement ? getSettlementDisplayName(settlement) : '';
    });

    /**
     * Ссылка на изображение селения с заглушкой.
     */
    protected readonly imageUrl: Signal<string> = computed(
        () => this.settlement()?.attachments?.[0]?.url || '/images/screenshots/screen_1.png'
    );

    constructor() {
        // Приглашение приходит без данных селения — только с его идентификатором.
        queueMicrotask(() => this.load());
    }

    /**
     * Возвращает локализованный тип селения.
     *
     * @param settlement Селение.
     * @returns Название типа.
     */
    protected typeLabel(settlement: ISettlement): string {
        return isGuildSettlement(settlement)
            ? this.i18n.translate('settlements.types.guild')
            : getSettlementTypeByKey(settlement.type);
    }

    /**
     * Возвращает тон бейджа типа селения.
     *
     * @param settlement Селение.
     * @returns Тон бейджа.
     */
    protected typeTone(settlement: ISettlement): SettlementBadgeTone {
        return getSettlementTypeTone(settlement);
    }

    /**
     * Возвращает иконку типа селения.
     *
     * @param settlement Селение.
     * @returns Имя иконки Taiga UI.
     */
    protected typeIcon(settlement: ISettlement): string {
        return getSettlementTypeIcon(settlement);
    }

    /**
     * Возвращает тон бейджа дипломатии.
     *
     * @param diplomacy Статус дипломатии.
     * @returns Тон бейджа.
     */
    protected diplomacyTone(diplomacy: string | undefined): SettlementBadgeTone {
        return getDiplomacyTone(diplomacy);
    }

    /**
     * Принимает приглашение и сообщает о необходимости обновить данные.
     */
    protected accept(): void {
        if (this.busy()) {
            return;
        }

        this.busy.set(true);

        this.settlementService
            .inviteAccept(this.invitationId())
            .pipe(
                tap(() => {
                    this.requestStatus.showSuccess(this.i18n.translate('settlements.invitation.accepted'));
                    this.resolved.emit();
                }),
                catchError(() => {
                    this.requestStatus.showError(this.i18n.translate('settlements.invitation.acceptError'));
                    return of(null);
                })
            )
            .subscribe({ complete: () => this.busy.set(false) });
    }

    /**
     * Отклоняет приглашение и сообщает о необходимости обновить данные.
     */
    protected reject(): void {
        if (this.busy()) {
            return;
        }

        this.busy.set(true);

        this.settlementService
            .rejectAccept(this.invitationId())
            .pipe(
                tap(() => {
                    this.requestStatus.showSuccess(this.i18n.translate('settlements.invitation.rejected'));
                    this.resolved.emit();
                }),
                catchError(() => {
                    this.requestStatus.showError(this.i18n.translate('settlements.invitation.rejectError'));
                    return of(null);
                })
            )
            .subscribe({ complete: () => this.busy.set(false) });
    }

    /**
     * Загружает данные приглашающего поселения.
     */
    private load(): void {
        this.settlementService
            .getSettlementById(this.settlementId())
            .pipe(catchError(() => of(null)))
            .subscribe((settlement) => this.settlement.set(settlement));
    }
}
