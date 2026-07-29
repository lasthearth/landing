import { AsyncPipe, NgFor, NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, OutputEmitterRef, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { I18nService, TranslatePipe } from '@core/i18n';
import { LocalStorageService } from '@core/services/local-storage.service';
import { RequestStatusService } from '@core/services/request-status.service';
import { buildGuildName, ICreateSettlement, SettlementService } from '@entities/settlement';
import { MediaService } from '@entities/media';
import { getFileStatuses } from '@shared/lib/get-file-statuses.function';
import { uploadSettlementAttachments } from '@shared/lib/upload-settlement-attachments.function';
import { setupSettlementDraft, clearSettlementDraft } from '@shared/lib/setup-settlement-draft.function';
import { maxFileSizeValidator } from '@shared/lib/file-max-size-validator.function';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { LHHintComponent } from '@shared/ui/lh-hint/lh-hint.component/lh-hint.component';
import { TuiError, TuiLoader } from '@taiga-ui/core';
import { TuiFieldErrorPipe, TuiFiles } from '@taiga-ui/kit';
import { Subject, switchMap, map, finalize, timeout } from 'rxjs';
import { fileFields, FileKeyGuild } from './guild-form.types';

/**
 * Форма гильдии.
 *
 * Отправляет заявку на основание гильдии как обычный лагерь со скрытым
 * маркером в названии, поскольку бэкенд не поддерживает отдельный тип
 * "Гильдия".
 */
@Component({
    selector: 'app-guild-form',
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
    templateUrl: './guild-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuildFormComponent {
    /**
     * Событие, которое будет эмитироваться после успешной отправки формы.
     */
    protected readonly submitEvent: OutputEmitterRef<void> = output<void>();

    /**
     * Массив всех ключей файлов, используемых в форме.
     */
    protected readonly fileFields = [...fileFields];

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

    protected readonly isLoading = signal(false);

    /**
     * Основная форма создания.
     */
    protected readonly form = new FormGroup({
        name: new FormControl<string | null>(null, [Validators.required, Validators.minLength(4)]),
        x: new FormControl<number | null>(null, [Validators.required]),
        z: new FormControl<number | null>(null, [Validators.required]),
        description: new FormControl<string | null>(null, [Validators.required, Validators.minLength(6)]),
        preview: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        map: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        monument: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildPatentDocument: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildLibertiesDocument: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildSquare: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildWell: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildPaths: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildStorage: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildBarn: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildFarm: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildAdditionalBuilding1: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildAdditionalBuilding2: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
        guildAdditionalBuilding3: new FormControl<File | null>(null, [Validators.required, maxFileSizeValidator(2)]),
    });

    /**
     * Статусы файлов (например, загружен/не загружен).
     * Используется для UI, чтобы отображать состояние загрузки каждого файла.
     */
    protected readonly fileStatus = getFileStatuses(this.fileFields, this.form);

    /**
     * Ссылка уничтожения на компонент.
     */
    private readonly destroyRef: DestroyRef = inject(DestroyRef);

    /**
     * Сервис поселений.
     */
    private readonly settlementService: SettlementService = inject(SettlementService);

    /**
     * Сервис загрузки медиафайлов.
     */
    private readonly mediaService: MediaService = inject(MediaService);

    /**
     * Триггер отправки формы — запускает обработку данных и загрузку файлов.
     */
    protected readonly onSubmit: Subject<void> = new Subject<void>();

    public constructor() {
        setupSettlementDraft(this.form, this.fileFields, 'settlement-draft-guild', this.destroyRef, this.localStorageService);

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
                                name: buildGuildName((values.name ?? '').trimEnd()),
                                description: (values.description ?? '').trimEnd(),
                                diplomacy: this.i18n.translate('settlements.diplomacy.peaceful'),
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
                    clearSettlementDraft('settlement-draft-guild', this.localStorageService);

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
     * Метод для удаления файла из формы.
     *
     * @param controlName Имя поля файла.
     */
    protected removeFile(controlName: FileKeyGuild): void {
        this.form.controls[controlName].setValue(null);
    }

    /**
     * Получение подписи для каждого ключа файла.
     *
     * @param key Ключ файла.
     */
    protected getLabelForKey(key: FileKeyGuild): string {
        return this.i18n.translate(`settlements.attachments.${key}`);
    }

    protected getControl(key: string): FormControl {
        return this.form.get(key) as FormControl;
    }
}
