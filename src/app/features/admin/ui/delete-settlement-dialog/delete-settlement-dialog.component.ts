import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@core/i18n';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';

/**
 * Диалог подтверждения удаления поселения.
 *
 * Удаление необратимо и стирает приглашения и заявки, поэтому одного «Да»
 * мало: кнопка активируется только после точного ввода названия поселения.
 */
@Component({
    selector: 'app-delete-settlement-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, TranslatePipe, LHInputComponent],
    templateUrl: './delete-settlement-dialog.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteSettlementDialogComponent {
    /**
     * Контекст диалога: название удаляемого поселения.
     */
    protected readonly context: TuiDialogContext<boolean, { name: string }> =
        inject<TuiDialogContext<boolean, { name: string }>>(POLYMORPHEUS_CONTEXT);

    /**
     * Название удаляемого поселения.
     */
    protected readonly name: string = this.context.data.name;

    /**
     * Поле подтверждающего ввода названия.
     */
    protected readonly control = new FormControl<string>('', { nonNullable: true });

    /**
     * Введённое значение.
     */
    private readonly typed = signal<string>('');

    /**
     * Признак совпадения ввода с названием поселения.
     */
    protected readonly matches: Signal<boolean> = computed(() => this.typed().trim() === this.name);

    constructor() {
        this.control.valueChanges.subscribe((value) => this.typed.set(value ?? ''));
    }

    /**
     * Подтверждает удаление.
     */
    protected confirm(): void {
        if (!this.matches()) {
            return;
        }

        this.context.completeWith(true);
    }

    /**
     * Отменяет удаление.
     */
    protected cancel(): void {
        this.context.completeWith(false);
    }
}
