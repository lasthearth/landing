import { Component, DestroyRef, inject } from '@angular/core';
import {
    FormArray,
    FormBuilder,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiDialogContext, TuiIcon } from '@taiga-ui/core';
import { POLYMORPHEUS_CONTEXT } from '@taiga-ui/polymorpheus';
import { catchError, of, tap } from 'rxjs';

import { ISettlement, IUpdateSettlementRequest, SettlementService } from '@entities/settlement';
import { RequestStatusService } from '@core/services/request-status.service';
import { I18nService, TranslatePipe } from '@core/i18n';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';

/**
 * Компонент формы редактирования данных поселения.
 *
 * Позволяет лидеру изменить название, описание и вложения (изображения).
 */
@Component({
    selector: 'app-edit-settlement-form',
    standalone: true,
    imports: [ReactiveFormsModule, TuiIcon, LHInputComponent, TranslatePipe],
    templateUrl: './edit-settlement-form.component.html',
    styleUrl: './edit-settlement-form.component.less',
})
export class EditSettlementFormComponent {
    /**
     * Контекст открытого диалогового окна.
     */
    private readonly context: TuiDialogContext<void, { settlement: ISettlement }> =
        inject<TuiDialogContext<void, { settlement: ISettlement }>>(POLYMORPHEUS_CONTEXT);

    /**
     * Сервис поселений.
     */
    private readonly settlementService = inject(SettlementService);

    /**
     * Сервис статуса запросов.
     */
    private readonly requestStatus = inject(RequestStatusService);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Builder реактивных форм.
     */
    private readonly formBuilder = inject(FormBuilder);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Данные редактируемого поселения.
     */
    protected readonly settlement = this.context.data.settlement;

    /**
     * Форма редактирования поселения.
     */
    protected readonly form = this.formBuilder.group({
        name: [this.settlement.name, [Validators.required]],
        description: [this.settlement.description, [Validators.required]],
        attachments: this.formBuilder.array(
            this.settlement.attachments.map((attachment) =>
                this.createAttachmentGroup(attachment.url, attachment.desc, true)
            )
        ),
    });

    /**
     * Создаёт FormGroup для одного вложения.
     *
     * @param url URL изображения.
     * @param description Описание изображения.
     * @returns Группа полей вложения.
     */
    private createAttachmentGroup(
        url: string,
        description: string,
        isExisting: boolean = false
    ): FormGroup {
        return this.formBuilder.group({
            url: [url, [Validators.required]],
            description: [description],
            isExisting: [isExisting],
        });
    }

    /**
     * Возвращает FormArray вложений.
     */
    protected get attachmentsArray(): FormArray {
        return this.form.get('attachments') as FormArray;
    }

    /**
     * Добавляет пустое вложение в форму.
     */
    protected addAttachment(): void {
        this.attachmentsArray.push(
            this.createAttachmentGroup('', this.i18n.translate('settlements.editForm.architectureDescription'), false)
        );
    }

    /**
     * Удаляет вложение по индексу.
     *
     * @param index Индекс удаляемого вложения.
     */
    protected removeAttachment(index: number): void {
        this.attachmentsArray.removeAt(index);
    }

    /**
     * Возвращает FormControl поля вложения по индексу и имени.
     *
     * @param index Индекс вложения.
     * @param controlName Имя поля: 'url' или 'description'.
     * @returns FormControl указанного поля.
     */
    protected getAttachmentControl(index: number, controlName: string): FormControl {
        return (this.attachmentsArray.at(index) as FormGroup).get(controlName) as FormControl;
    }

    /**
     * Сохраняет изменения на сервере и закрывает диалог.
     */
    protected save(): void {
        if (this.form.invalid) {
            return;
        }

        const rawValue = this.form.getRawValue() as {
            name: string;
            description: string;
            attachments: { url: string; description: string; isExisting?: boolean }[];
        };

        const request: IUpdateSettlementRequest = {
            name: rawValue.name,
            description: rawValue.description,
            attachments: rawValue.attachments.map((attachment) => ({
                url: attachment.url,
                description: attachment.description,
            })),
        };

        this.settlementService.updateSettlement$(this.settlement.id, request)
            .pipe(
                this.requestStatus.handleSuccess(this.i18n.translate('settlements.editForm.success')),
                this.requestStatus.handleError(this.i18n.translate('settlements.editForm.error')),
                tap(() => this.context.completeWith()),
                catchError(() => of(null)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    /**
     * Закрывает диалог без сохранения.
     */
    protected cancel(): void {
        this.context.completeWith();
    }
}
