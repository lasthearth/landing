import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { MyJoinRequestsStore } from '../model/my-join-requests.store';

/**
 * Кнопка подачи и отзыва заявки на вступление в поселение.
 *
 * Тихий элемент: штатный ghost-CTA без собственного визуального языка —
 * заявка не должна конкурировать по весу с содержимым карточки селения.
 * Показывает одно из трёх состояний: «Подать заявку», «Заявка отправлена»
 * с отзывом или подсказку о верификации. Ничего не рисует, если игрок
 * не авторизован или уже состоит в поселении.
 */
@Component({
    selector: 'app-join-request-button',
    standalone: true,
    imports: [TuiIcon, TranslatePipe],
    templateUrl: './join-request-button.component.html',
    styleUrl: './join-request-button.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JoinRequestButtonComponent {
    /**
     * Хранилище собственных заявок игрока.
     */
    private readonly store = inject(MyJoinRequestsStore);

    /**
     * Идентификатор поселения, в которое подаётся заявка.
     */
    public readonly settlementId: InputSignal<string> = input.required();

    /**
     * Признак отправленной заявки в это поселение.
     */
    protected readonly sent: Signal<boolean> = computed(() => this.store.hasRequest(this.settlementId()));

    /**
     * Признак выполняющегося запроса — кнопка блокируется.
     */
    protected readonly busy: Signal<boolean> = computed(() => this.store.isPending(this.settlementId()));

    /**
     * Признак возможности подать заявку.
     */
    protected readonly canApply: Signal<boolean> = this.store.canApply;

    /**
     * Признак необходимости пройти верификацию.
     */
    protected readonly needsVerification: Signal<boolean> = this.store.needsVerification;

    /**
     * Отправляет заявку на вступление.
     */
    protected apply(): void {
        this.store.apply(this.settlementId());
    }

    /**
     * Отзывает отправленную заявку.
     */
    protected cancel(): void {
        this.store.cancel(this.settlementId());
    }
}
