import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, output, OutputEmitterRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { getFileStatuses } from '@shared/lib/get-file-statuses.function';
import { uploadSettlementAttachments } from '@shared/lib/upload-settlement-attachments.function';
import { SettlementService } from '@entities/settlement';
import { ICreateSettlement } from '@entities/settlement';
import { MediaService } from '@entities/media';
import { fileFieldsTownship } from './township-form.types';
import { FileKeyTownship } from './township-form.types';
import { Subject, switchMap, Observable, map, tap, finalize } from 'rxjs';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { TuiFieldErrorPipe, TuiFiles } from '@taiga-ui/kit';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { LHHintComponent } from '@shared/ui/lh-hint/lh-hint.component/lh-hint.component';
import { RequestStatusService } from '@core/services/request-status.service';
import { LocalStorageService } from '@core/services/local-storage.service';
import { setupSettlementDraft, clearSettlementDraft } from '@shared/lib/setup-settlement-draft.function';
import { TuiError, TuiLoader } from '@taiga-ui/core';
import { maxFileSizeValidator } from '@shared/lib/file-max-size-validator.function';
import { I18nService, TranslatePipe } from '@core/i18n';

/**
 * Форма поселка
 */
@Component({
    selector: 'app-township-form',
    templateUrl: './township-form.component.html',
    imports: [
        LHInputComponent,
        FormsModule,
        ReactiveFormsModule,
        NgFor,
        AsyncPipe,
        NgIf,
        TuiFiles,
        LHHintComponent,
        TuiLoader,
        TuiError,
        TuiFieldErrorPipe,
        TranslatePipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TownshipFormComponent {
    /**
     * Событие, которое будет эмитироваться после успешной отправки формы.
     */
    protected readonly submitEvent: OutputEmitterRef<void> = output<void>();

    /**
     * Массив всех ключей файлов, используемых в форме.
     */
    protected readonly fileFields = [...fileFieldsTownship];

    /**
     * Варианты дипломатического поведения.
     */
    protected readonly diplomacy = computed(() => [
        this.i18n.translate('settlements.diplomacy.peaceful'),
        this.i18n.translate('settlements.diplomacy.neutral'),
        this.i18n.translate('settlements.diplomacy.aggressive'),
    ]);

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис интернационализации.
     */
    private readonly i18n = inject(I18nService);

    /**
     * Сервис локального хранилища.
     */
    private readonly localStorageService: LocalStorageService = inject(LocalStorageService);

    protected isLoading = false;

    /**
     * Основная форма создания.
     */
    protected readonly form = new FormGroup({
        preview: new FormControl<File | null>(null, Validators.required),
        name: new FormControl<string | null>(null, [Validators.required, Validators.minLength(6)]),
        x: new FormControl<number | null>(null, [Validators.required]),
        z: new FormControl<number | null>(null, [Validators.required]),
        diplomacy: new FormControl<string | null>(null, [Validators.required]),
        description: new FormControl<string | null>(null, [Validators.required, Validators.minLength(6)]),
        map: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        monument: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        playersDocuments: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        yardage: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        pit: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        roads: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        warehouse: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        barn: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        seedbeds: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        oneFloorHouse1: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        oneFloorHouse2: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        oneFloorHouse3: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        oneFloorHouse4: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        doubleFloorHouse1: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        workshop: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        blacksmithShop: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        religionOrCultureOrEconomicHouse: new FormControl<File | null>(null, [
            Validators.required,
            maxFileSizeValidator(2),
        ]),
    });

    /**
     * Статусы файлов (например, загружен/не загружен)
     * Используется для UI, чтобы отображать состояние загрузки каждого файла.
     */
    protected readonly fileStatus: {
        loading: Record<string, Subject<File | null>>;
        failed: Record<string, Subject<File | null>>;
        loaded: Record<string, Observable<File | null>>;
    } = getFileStatuses(this.fileFields, this.form);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Сервис поселенний.
     */
    private readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * Сервис загрузки медиафайлов.
     */
    private readonly mediaService: MediaService = inject(MediaService);

    /**
     * Триггер отправки формы — запускает обработку данных и загрузку файлов
     */
    protected readonly onSubmit: Subject<void> = new Subject<void>();

    // Подписка на событие отправки формы:
    // 1. Берёт данные формы
    // 2. Загружает файлы через MediaService
    // 3. Формирует объект запроса
    // 4. Отправляет его на сервер
    // 5. По завершении вызывает submitEvent.emit()
    public constructor() {
        setupSettlementDraft(this.form, this.fileFields, 'settlement-draft-township', this.destroyRef, this.localStorageService);

        this.onSubmit
            .pipe(
                switchMap(() => {
                    const values = this.form.value;

                    return uploadSettlementAttachments(this.fileFields, this.form, this.mediaService, (key) =>
                        this.getLabelForKey(key)
                    ).pipe(
                        map((attachments) => {
                            const request: ICreateSettlement = {
                                type: 'CAMP',
                                name: values.name ?? '',
                                description: values.description ?? '',
                                diplomacy: values.diplomacy ?? '',
                                coordinates: {
                                    x: values.x ?? 0,
                                    y: values.z ?? 0,
                                },
                                attachments,
                            };

                            return request;
                        })
                    );
                }),
                tap((request) => {
                    clearSettlementDraft('settlement-draft-township', this.localStorageService);

                    this.settlementService
                        .postRequestSettlement$(request)
                        .pipe(
                            this.requestStatusService.handleError(),
                            this.requestStatusService.handleSuccess(this.i18n.translate('settlements.form.success')),
                            finalize(() => {
                                this.isLoading = false;
                            }),
                            takeUntilDestroyed(this.destroyRef)
                        )
                        .subscribe(() => {
                            this.submitEvent.emit();
                        });
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    /**
     * Метод для удаления файла из формы
     * @param controlName - имя поля файла
     */
    protected removeFile(controlName: FileKeyTownship): void {
        this.form.controls[controlName].setValue(null);
    }

    /**
     * Получение подписи для каждого ключа файла
     * @param key - ключ файла
     */
    protected getLabelForKey(key: FileKeyTownship): string {
        return this.i18n.translate(`settlements.attachments.${key}`);
    }
    protected getControl(key: string): FormControl {
        return this.form.get(key) as FormControl;
    }
}
