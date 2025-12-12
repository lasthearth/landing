import { NgFor, AsyncPipe, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, OutputEmitterRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup, FormControl, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LHInputComponent } from '@app/components/lh-input/lh-input.component';
import { getBase64Files } from '@app/functions/get-base64-files.function';
import { getFileStatuses } from '@app/functions/get-file-statuses.function';
import { SettlementService } from '@app/services/settlement.service';
import { ICreateSettlement } from '@app/settlements/interfaces/i-create-settlement';
import { fileFieldsCity, FileKeyCity } from '@app/types/file-key-city.type'; //Получения типов для формы
import { TuiFiles } from '@taiga-ui/kit';
import { Subject, switchMap, Observable, forkJoin, map, tap, finalize } from 'rxjs';
import { LHHintComponent } from '@app/components/lh-hint-icon/lh-hint.component/lh-hint.component';
import { RequestStatusService } from '@app/services/request-status.service';
import { TuiLoader } from '@taiga-ui/core';

/**
 * Форма города
 */
@Component({
    selector: 'app-city-form',
    templateUrl: './city-form.component.html',
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
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CityFormComponent {
    /**
     * Событие, которое будет эмитироваться после успешной отправки формы.
     */
    protected readonly submitEvent: OutputEmitterRef<void> = output<void>();

    /**
     * Массив всех ключей файлов, используемых в форме.
     */
    protected readonly fileFields = [...fileFieldsCity];

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
        preview: new FormControl<File | null>(null, Validators.required),
        map: new FormControl<File | null>(null, Validators.required),
        monument: new FormControl<File | null>(null, Validators.required),
        playersDocuments: new FormControl<File | null>(null, Validators.required),
        document: new FormControl<File | null>(null, Validators.required),
        yardage: new FormControl<File | null>(null, Validators.required),
        pit: new FormControl<File | null>(null, Validators.required),
        localRoads: new FormControl<File | null>(null, Validators.required),
        globalRoads: new FormControl<File | null>(null, Validators.required),
        warehouse: new FormControl<File | null>(null, Validators.required),
        barn: new FormControl<File | null>(null, Validators.required),
        seedbeds: new FormControl<File | null>(null, Validators.required),
        oneFloorHouse1: new FormControl<File | null>(null, Validators.required),
        oneFloorHouse2: new FormControl<File | null>(null, Validators.required),
        oneFloorHouse3: new FormControl<File | null>(null, Validators.required),
        oneFloorHouse4: new FormControl<File | null>(null, Validators.required),
        doubleFloorHouse1: new FormControl<File | null>(null, Validators.required),
        doubleFloorHouse2: new FormControl<File | null>(null, Validators.required),
        doubleFloorHouse3: new FormControl<File | null>(null, Validators.required),
        doubleFloorHouse4: new FormControl<File | null>(null, Validators.required),
        doubleFloorHouse5: new FormControl<File | null>(null, Validators.required),
        workshop: new FormControl<File | null>(null, Validators.required),
        blacksmithShop: new FormControl<File | null>(null, Validators.required),
        religionOrCultureOrEconomicHouse: new FormControl<File | null>(null, Validators.required),
        marketPlace1: new FormControl<File | null>(null, Validators.required),
        marketPlace2: new FormControl<File | null>(null, Validators.required),
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
    protected removeFile(controlName: FileKeyCity): void {
        this.form.controls[controlName].setValue(null);
    }
    /**
     * Получение подписи для каждого ключа файла
     * @param key - ключ файла
     */
    protected getLabelForKey(key: FileKeyCity): string {
        return {
            preview: 'Заглавное изображение города',
            map: 'Вид с карты',
            monument: 'Монумент поселения',
            playersDocuments: 'Документы игроков',
            document: 'Основной документ поселения',
            yardage: 'Площадь участка',
            pit: 'Колодец',
            localRoads: 'Локальные дороги',
            globalRoads: 'Глобальные дороги',
            warehouse: 'Склад или складское помещение',
            barn: 'Амбар',
            seedbeds: 'Грядки / рассадник',
            oneFloorHouse1: '1-этажный дом №1',
            oneFloorHouse2: '1-этажный дом №2',
            oneFloorHouse3: '1-этажный дом №3',
            oneFloorHouse4: '1-этажный дом №4',
            doubleFloorHouse1: '2-этажный дом №1',
            doubleFloorHouse2: '2-этажный дом №2',
            doubleFloorHouse3: '2-этажный дом №3',
            doubleFloorHouse4: '2-этажный дом №4',
            doubleFloorHouse5: '2-этажный дом №5',
            workshop: 'Мастерская',
            blacksmithShop: 'Кузница',
            religionOrCultureOrEconomicHouse: 'Здание религии/культуры/экономики',
            marketPlace1: 'Торговая площадь №1',
            marketPlace2: 'Торговая площадь №2',
        }[key];
    }
}
