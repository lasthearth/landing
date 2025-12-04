import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, OutputEmitterRef } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { fileFieldsCamp, FileKeyCamp } from '@app/types/file-key-camp.type';
import { Subject, switchMap, Observable, map, forkJoin, tap } from 'rxjs';
import { NgFor, AsyncPipe, NgIf } from '@angular/common';
import { LHInputComponent } from '@app/components/lh-input/lh-input.component';
import { TuiFiles } from '@taiga-ui/kit';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ICreateSettlement } from '@app/settlements/interfaces/i-create-settlement';
import { SettlementService } from '@app/services/settlement.service';
import { getFileStatuses } from '@app/functions/get-file-statuses.function'; // Функция для работы со статусом файлов
import { getBase64Files } from '@app/functions/get-base64-files.function'; // Функция для перевода файла в Base64

/**
 * Форма лагеря
 */
@Component({
    selector: 'app-camp-form',
    imports: [LHInputComponent, FormsModule, ReactiveFormsModule, NgFor, AsyncPipe, NgIf, TuiFiles],
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
        preview: new FormControl<File | null>(null, Validators.required),
        map: new FormControl<File | null>(null, Validators.required),
        monument: new FormControl<File | null>(null, Validators.required),
        fireplace: new FormControl<File | null>(null, Validators.required),
        warehouse: new FormControl<File | null>(null, Validators.required),
        beds: new FormControl<File | null>(null, Validators.required),
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
                        .pipe(takeUntilDestroyed(this.destroyRef))
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
            monument: 'Ваш монумент',
            fireplace: 'Место костра',
            warehouse: 'Склад или складское помещение',
            beds: 'Кровати 3 шт.',
        }[key];
    }
}
