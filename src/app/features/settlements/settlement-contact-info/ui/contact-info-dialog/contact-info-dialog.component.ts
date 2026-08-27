import { ChangeDetectionStrategy, Component, computed, inject, signal, Signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TuiDialogContext } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { TranslatePipe } from '@core/i18n';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { CONTACT_INFO_MAX_LENGTH } from '../../config/contact-info-max-length.constant';

/**
 * Диалог редактирования контактной информации поселения.
 *
 * Лимит 512 символов повторяет бэкенд. Символы `<` и `>` запрещены:
 * сервер хранит текст как есть и не экранирует его при выдаче.
 */
@Component({
    selector: 'app-contact-info-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, TranslatePipe, LHInputComponent],
    templateUrl: './contact-info-dialog.component.html',
    styles: [':host { display: block; padding-top: 32px; }'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactInfoDialogComponent {
    /**
     * Контекст диалога: текущий текст контактов.
     */
    protected readonly context: TuiDialogContext<string | null, { contactInfo: string }> =
        inject<TuiDialogContext<string | null, { contactInfo: string }>>(POLYMORPHEUS_CONTEXT);

    /**
     * Максимальная длина текста контактов.
     */
    protected readonly maxLength = CONTACT_INFO_MAX_LENGTH;

    /**
     * Поле ввода контактной информации.
     */
    protected readonly control = new FormControl<string>(this.context.data.contactInfo ?? '', {
        nonNullable: true,
    });

    /**
     * Текущее значение поля для подсчёта длины и проверки символов.
     */
    private readonly value = signal<string>(this.control.value);

    /**
     * Длина введённого текста.
     */
    protected readonly length: Signal<number> = computed(() => this.value().length);

    /**
     * Признак наличия запрещённых символов `<` и `>`.
     */
    protected readonly hasForbiddenChars: Signal<boolean> = computed(() => /[<>]/.test(this.value()));

    /**
     * Признак допустимого значения для отправки.
     */
    protected readonly valid: Signal<boolean> = computed(
        () => this.length() <= this.maxLength && !this.hasForbiddenChars()
    );

    constructor() {
        this.control.valueChanges.subscribe((value) => this.value.set(value ?? ''));
    }

    /**
     * Закрывает диалог, возвращая новый текст контактов.
     */
    protected save(): void {
        if (!this.valid()) {
            return;
        }

        this.context.completeWith(this.control.value.trim());
    }

    /**
     * Закрывает диалог без изменений.
     */
    protected cancel(): void {
        this.context.completeWith(null);
    }
}
