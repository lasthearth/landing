import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, Signal } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { JoinTargetKind, MyJoinRequestsStore } from '../model/my-join-requests.store';

/**
 * Кнопка подачи и отзыва заявки на вступление в надел или гильдию.
 *
 * Тихий элемент: штатный ghost-CTA без собственного визуального языка —
 * заявка не должна конкурировать по весу с содержимым карточки надела.
 * Показывает одно из трёх состояний: «Подать заявку», «Заявка отправлена»
 * с отзывом или подсказку о верификации. Ничего не рисует, если игрок
 * не авторизован или уже состоит в группе того же рода.
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
     * Идентификатор группы, в которую подаётся заявка.
     */
    public readonly settlementId: InputSignal<string> = input.required();

    /**
     * Цель заявки — гильдия, а не надел.
     *
     * Членство проверяется по роду группы: игрок в наделе может подать
     * заявку в гильдию, и наоборот.
     */
    public readonly isGuild: InputSignal<boolean> = input(false);

    /**
     * Род группы, в которую подаётся заявка.
     */
    protected readonly targetKind: Signal<JoinTargetKind> = computed(() =>
        this.isGuild() ? 'guild' : 'settlement'
    );

    /**
     * Признак отправленной заявки в эту группу.
     */
    protected readonly sent: Signal<boolean> = computed(() => this.store.hasRequest(this.settlementId()));

    /**
     * Признак выполняющегося запроса — кнопка блокируется.
     */
    protected readonly busy: Signal<boolean> = computed(() => this.store.isPending(this.settlementId()));

    /**
     * Признак возможности подать заявку в группу этого рода.
     */
    protected readonly canApply: Signal<boolean> = computed(() => this.store.canApplyTo(this.targetKind()));

    /**
     * Признак необходимости пройти верификацию.
     */
    protected readonly needsVerification: Signal<boolean> = computed(() =>
        this.store.needsVerificationFor(this.targetKind())
    );

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
