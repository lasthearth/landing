import { NgFor, AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, OutputEmitterRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { LHInputComponent } from '@app/components/lh-input/lh-input.component';
import { getBase64Files } from '@app/functions/get-base64-files.function';
import { getFileStatuses } from '@app/functions/get-file-statuses.function';
import { SettlementService } from '@app/services/settlement.service';
import { ICreateSettlement } from '@app/settlements/interfaces/i-create-settlement';
import { fileFields } from '@app/types/file-key-village.type';
import { FileKeyVillage } from '@app/types/file-key-village.type';
import { TuiFieldErrorPipe, TuiFiles } from '@taiga-ui/kit';
import { Subject, switchMap, Observable, forkJoin, map, tap, finalize } from 'rxjs';
import { LHHintComponent } from '@app/components/lh-hint-icon/lh-hint.component/lh-hint.component';
import { RequestStatusService } from '@app/services/request-status.service';
import { TuiError, TuiHintDirective, TuiLoader } from '@taiga-ui/core';
import { maxFileSizeValidator } from '@app/functions/file-max-size-validator.function';

/**
 * Форма деревни
 */
@Component({
    selector: 'app-village-form',
    templateUrl: './village-form.component.html',
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
        TuiHintDirective,
        TuiFieldErrorPipe,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VillageFormComponent {
    /**
     * Событие, которое будет эмитироваться после успешной отправки формы.
     */
    protected readonly submitEvent: OutputEmitterRef<void> = output<void>();

    /**
     * Массив всех ключей файлов, используемых в форме.
     */
    protected readonly fileFields = [...fileFields];

    /**
     * Варианты дипломатического поведения.
     */
    protected readonly diplomacy: string[] = ['Миролюбивый', 'Нейтральный', 'Агрессивный'];

    /**
     * Сервис уведомлений.
     */
    private readonly requestStatusService: RequestStatusService = inject(RequestStatusService);

    protected isLoading = false;

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
        playersDocuments: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        document: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        yardage: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        pit: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        roads: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        barn: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        seedbeds: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        house1: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        house2: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        house3: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        house4: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
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

    protected readonly onSubmit: Subject<void> = new Subject<void>();

    // Подписка на событие отправки формы:
    // 1. Берёт данные формы
    // 2. Конвертирует файлы в base64
    // 3. Формирует объект запроса
    // 4. Отправляет его на сервер
    // 5. По завершении вызывает submitEvent.emit()
    public constructor() {
        this.onSubmit
            .pipe(
                switchMap(() => {
                    const values = this.form.value;

                    // Собираем массив Observable<string> для всех файлов
                    const base64Files$: Observable<string | null>[] = getBase64Files(this.fileFields, this.form);

                    // Ждём когда все base64 загрузятся
                    return forkJoin(base64Files$).pipe(
                        map((base64Files) => {
                            const attachments = this.fileFields.map((key, i) => ({
                                data: base64Files[i] ?? '',
                                description: this.getLabelForKey(key),
                            }));

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
    protected removeFile(controlName: FileKeyVillage): void {
        this.form.controls[controlName].setValue(null);
    }

    /**
     * Получение подписи для каждого ключа файла
     * @param key - ключ файла
     */
    protected getLabelForKey(key: FileKeyVillage): string {
        return {
            preview: 'Заглавное изображение поселения',
            map: 'Вид с карты',
            monument: 'Монумент поселения',
            playersDocuments: 'Документы игроков',
            document: 'Подписанный патент на разрешение основании деревни',
            yardage: 'Деревенская площадь',
            pit: 'Колодец',
            roads: 'Дороги и тропы',
            warehouse: 'Склад или складское помещение',
            barn: 'Амбар',
            seedbeds: 'Грядки',
            house1: '1 этажный дом №1',
            house2: '1 этажный дом №2',
            house3: '1 этажный дом №3',
            house4: '1 этажный дом №4',
            beds: 'Кровати',
        }[key];
    }
    getControl(key: string): FormControl {
        return this.form.get(key) as FormControl;
    }
}
