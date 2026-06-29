import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, output, OutputEmitterRef, signal } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { fileFieldsCamp, FileKeyCamp } from './camp-form.types';
import { Subject, switchMap, map, finalize, timeout } from 'rxjs';
import { NgFor, AsyncPipe, NgIf } from '@angular/common';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { TuiFiles } from '@taiga-ui/kit';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ICreateSettlement } from '@entities/settlement';
import { SettlementService } from '@entities/settlement';
import { MediaService } from '@entities/media';
import { getFileStatuses } from '@shared/lib/get-file-statuses.function'; // Функция для работы со статусом файлов
import { uploadSettlementAttachments } from '@shared/lib/upload-settlement-attachments.function';
import { LHHintComponent } from '@shared/ui/lh-hint/lh-hint.component/lh-hint.component';
import { RequestStatusService } from '@core/services/request-status.service';
import { LocalStorageService } from '@core/services/local-storage.service';
import { setupSettlementDraft, clearSettlementDraft } from '@shared/lib/setup-settlement-draft.function';
import { TuiLoader, TuiError } from '@taiga-ui/core';
import { maxFileSizeValidator } from '@shared/lib/file-max-size-validator.function';
import { I18nService, TranslatePipe } from '@core/i18n';
import { TuiFieldErrorPipe } from '@taiga-ui/kit';
/**
 * Форма лагеря
 */
@Component({
    selector: 'app-camp-form',
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
    templateUrl: './camp-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampFormComponent {
    /**
     * Событие, которое будет эмитироваться после успешной отправки формы.
     */
    protected readonly submitEvent: OutputEmitterRef<void> = output<void>();

    /**
     * Массив всех ключей файлов, используемых в форме.
     */
    protected readonly fileFields = [...fileFieldsCamp];

    /**
     * Варианты дипломатического поведения.
     */
    private readonly i18n = inject(I18nService);
    protected readonly diplomacy = computed(() => [
        this.i18n.translate('settlements.diplomacy.peaceful'),
        this.i18n.translate('settlements.diplomacy.neutral'),
        this.i18n.translate('settlements.diplomacy.aggressive'),
    ]);

    /**
     * Основная форма создания.
     */
    protected readonly form = new FormGroup({
        name: new FormControl<string | null>(null, [Validators.required, Validators.minLength(6)]),
        x: new FormControl<number | null>(null, [Validators.required]),
        z: new FormControl<number | null>(null, [Validators.required]),
        diplomacy: new FormControl<string | null>(null, [Validators.required]),
        description: new FormControl<string | null>(null, [Validators.required, Validators.minLength(6)]),
        preview: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        map: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        monument: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        fireplace: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        warehouse: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        beds: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
    });

    /**
     * Статусы файлов (например, загружен/не загружен)
     * Используется для UI, чтобы отображать состояние загрузки каждого файла.
     */
    protected readonly fileStatus = getFileStatuses(this.fileFields, this.form);

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
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    /**
     * Сервис локального хранилища.
     */
    private readonly localStorageService: LocalStorageService = inject(LocalStorageService);

    protected readonly isLoading = signal(false);

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
        setupSettlementDraft(this.form, this.fileFields, 'settlement-draft-camp', this.destroyRef, this.localStorageService);

        this.onSubmit
            .pipe(
                switchMap(() => {
                    this.isLoading.set(true);
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
                switchMap((request) => {
                    clearSettlementDraft('settlement-draft-camp', this.localStorageService);

                    return this.settlementService.postRequestSettlement$(request).pipe(
                        timeout(30_000),
                        this.requestStatusService.handleError(),
                        this.requestStatusService.handleSuccess(this.i18n.translate('settlements.form.success'))
                    );
                }),
                finalize(() => {
                    this.isLoading.set(false);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: () => this.submitEvent.emit(),
                error: () => {},
            });
    }
    /**
     * Метод для удаления файла из формы
     * @param controlName - имя поля файла
     */
    protected removeFile(controlName: FileKeyCamp): void {
        this.form.controls[controlName].setValue(null);
    }
    /**
     * Получение подписи для каждого ключа файла
     * @param key - ключ файла
     */
    protected getLabelForKey(key: FileKeyCamp): string {
        return this.i18n.translate(`settlements.attachments.${key}`);
    }

    protected getControl(key: string): FormControl {
        return this.form.get(key) as FormControl;
    }
}
