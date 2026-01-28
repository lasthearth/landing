import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, OutputEmitterRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { getBase64Files } from '@app/functions/get-base64-files.function';
import { getFileStatuses } from '@app/functions/get-file-statuses.function';
import { SettlementService } from '@app/services/settlement.service';
import { ICreateSettlement } from '@app/settlements/interfaces/i-create-settlement';
import { fileFieldsRegion, FileKeyRegion } from '@app/types/file-key-region.type';
import { Subject, switchMap, Observable, forkJoin, map, tap, finalize } from 'rxjs';
import { TuiFieldErrorPipe, TuiFiles } from '@taiga-ui/kit';
import { LHInputComponent } from '@app/components/lh-input/lh-input.component';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { LHHintComponent } from '@app/components/lh-hint-icon/lh-hint.component/lh-hint.component';
import { RequestStatusService } from '@app/services/request-status.service';
import { TuiError, TuiHintDirective, TuiLoader } from '@taiga-ui/core';
import { maxFileSizeValidator } from '@app/functions/file-max-size-validator.function';

/**
 * Форма провинции
 */
@Component({
    selector: 'app-region-form',
    templateUrl: './region-form.component.html',
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
export class RegionFormComponent {
    /**
     * Событие, которое будет эмитироваться после успешной отправки формы.
     */
    protected readonly submitEvent: OutputEmitterRef<void> = output<void>();

    /**
     * Массив всех ключей файлов, используемых в форме.
     */
    protected readonly fileFields = [...fileFieldsRegion];

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
        playersDocuments: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        loreBooks: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        yardage: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        bigYardage: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        pit: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        localRoads: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        globalRoads: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        warehouse: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        barn: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        seedbeds: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        oneFloorHouse1: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        oneFloorHouse2: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        oneFloorHouse3: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        oneFloorHouse4: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        doubleFloorHouse1: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        doubleFloorHouse2: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        doubleFloorHouse3: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        doubleFloorHouse4: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        doubleFloorHouse5: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        doubleFloorHouse6: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        thirdFloorHouse1: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        workshop1: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        workshop2: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        blacksmithShop: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        religionOrCultureOrEconomicHouse1: new FormControl<File | null>(null, [
            Validators.required,
            maxFileSizeValidator(2),
        ]),
        religionOrCultureOrEconomicHouse2: new FormControl<File | null>(null, [
            Validators.required,
            maxFileSizeValidator(2),
        ]),
        marketPlace1: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        marketPlace2: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        marketPlace3: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        marketPlace4: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        marketPlace5: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        stablesOrHarbor: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        tavern: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        importantBuilding: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        greateBuilding: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        steelBuilding: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
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
     * Триггер отправки формы — запускает обработку данных и загрузку файлов
     */
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
    protected removeFile(controlName: FileKeyRegion): void {
        this.form.controls[controlName].setValue(null);
    }

    /**
     * Получение подписи для каждого ключа файла
     * @param key - ключ файла
     */
    protected getLabelForKey(key: FileKeyRegion): string {
        return {
            preview: 'Заглавное изображение поселения',
            map: 'Вид с карты',
            monument: 'Монумент поселения',
            playersDocuments: 'Документы игроков',
            loreBooks: '10-лорных книг',
            yardage: 'Малая городская площадь',
            bigYardage: 'Большая городская площадь',
            pit: 'Колодец',
            localRoads: 'Локальные дороги',
            globalRoads: 'Глобальные дороги региона',
            warehouse: 'Склад или складское помещение',
            barn: 'Амбар',
            seedbeds: 'Грядки',
            oneFloorHouse1: '1-этажный дом №1',
            oneFloorHouse2: '1-этажный дом №2',
            oneFloorHouse3: '1-этажный дом №3',
            oneFloorHouse4: '1-этажный дом №4',
            doubleFloorHouse1: '2-этажный дом №1',
            doubleFloorHouse2: '2-этажный дом №2',
            doubleFloorHouse3: '2-этажный дом №3',
            doubleFloorHouse4: '2-этажный дом №4',
            doubleFloorHouse5: '2-этажный дом №5',
            doubleFloorHouse6: '2-этажный дом №6',
            thirdFloorHouse1: '3-этажный дом №1',
            workshop1: 'Мастерская №1',
            workshop2: 'Мастерская №2',
            blacksmithShop: 'Кузница',
            religionOrCultureOrEconomicHouse1:
                'Здание религиозного,научного,культурного или экономического направления №1',
            religionOrCultureOrEconomicHouse2:
                'Здание религиозного,научного,культурного или экономического направления №2',
            marketPlace1: 'Рыночный прилавок №1',
            marketPlace2: 'Рыночный прилавок №2',
            marketPlace3: 'Рыночный прилавок №3',
            marketPlace4: 'Рыночный прилавок №4',
            marketPlace5: 'Рыночный прилавок №5',
            stablesOrHarbor: 'Конюшни / Гавань',
            tavern: 'Таверна',
            importantBuilding:
                'Любое из: колизей, ипподром, арена, тренировочный плац, университет, библиотека, обсерватория, музей, пирамида и прочее подходящее по смыслу перечисленных строений и имеющее площадь не менее 33х33 блока. ',
            greateBuilding: 'Великое строение',
            steelBuilding: 'Сталелитейное здание',
        }[key];
    }
    protected getControl(key: string): FormControl {
        return this.form.get(key) as FormControl;
    }
}
