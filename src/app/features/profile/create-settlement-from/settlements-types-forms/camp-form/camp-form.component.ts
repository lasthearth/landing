import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, OutputEmitterRef } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { fileFieldsCamp, FileKeyCamp } from './camp-form.types';
import { Subject, switchMap, map, tap, finalize } from 'rxjs';
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
    protected readonly diplomacy: string[] = ['Миролюбивый', 'Нейтральный', 'Агрессивный'];

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

    protected isLoading = false;

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
                    this.isLoading = true;
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
                    clearSettlementDraft('settlement-draft-camp', this.localStorageService);

                    this.settlementService
                        .postRequestSettlement$(request)
                        .pipe(
                            this.requestStatusService.handleError(),
                            this.requestStatusService.handleSuccess('Отправлено!'),
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
    protected removeFile(controlName: FileKeyCamp): void {
        this.form.controls[controlName].setValue(null);
    }
    /**
     * Получение подписи для каждого ключа файла
     * @param key - ключ файла
     */
    protected getLabelForKey(key: FileKeyCamp): string {
        return {
            preview: 'Заглавное изображение вашего селения',
            map: 'Вид с карты',
            monument: 'Монумент поселения',
            fireplace: 'Место костра',
            warehouse: 'Склад или складское помещение',
            beds: 'Кровати 3 шт.',
        }[key];
    }

    protected getControl(key: string): FormControl {
        return this.form.get(key) as FormControl;
    }
}
