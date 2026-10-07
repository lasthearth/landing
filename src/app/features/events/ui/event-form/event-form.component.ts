import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    AbstractControl,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import { I18nService, TranslatePipe } from '@core/i18n';
import { RequestStatusService } from '@core/services/request-status.service';
import { CalendarEvent, EventApiService, SaveEventRequest } from '@entities/event';
import { MediaService } from '@entities/media';
import { MarkupEditorComponent } from '@shared/ui/markup-editor';
import { TuiIcon } from '@taiga-ui/core';
import { finalize, Observable } from 'rxjs';
import { toLocalInputValue } from '../../lib/to-local-input-value.function';

/**
 * Максимальная длина названия и места (как на сервере).
 */
const TEXT_MAX_LENGTH = 120;

/**
 * Максимальная длина описания (как на сервере).
 */
const DESCRIPTION_MAX_LENGTH = 20_000;

/**
 * Максимальный размер обложки, байт.
 */
const MAX_COVER_SIZE = 10 * 1024 * 1024;

/**
 * Проверяет, что окончание (если задано) не раньше начала.
 *
 * @param group Группа с полями `startsAt` и `endsAt`.
 * @returns Ошибка `endBeforeStart` или `null`.
 */
const endAfterStartValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    const { startsAt, endsAt } = group.value as { startsAt: string; endsAt: string };

    if (!startsAt || !endsAt) {
        return null;
    }

    return new Date(endsAt).getTime() < new Date(startsAt).getTime() ? { endBeforeStart: true } : null;
};

/**
 * Начало нового события по умолчанию: завтра в 19:00.
 *
 * @returns Значение для поля `datetime-local`.
 */
function defaultStart(): string {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(19, 0, 0, 0);
    return toLocalInputValue(date);
}

/**
 * Форма создания и изменения события (для администраторов).
 *
 * Описание пишется в том же редакторе, что и новости; обложка загружается
 * в медиасервис. Даты вводятся в часовом поясе браузера, на сервер уходят в UTC.
 */
@Component({
    selector: 'app-event-form',
    templateUrl: './event-form.component.html',
    styleUrl: './event-form.component.less',
    imports: [ReactiveFormsModule, TranslatePipe, TuiIcon, MarkupEditorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventFormComponent implements OnInit {
    private readonly api = inject(EventApiService);
    private readonly media = inject(MediaService);
    private readonly status = inject(RequestStatusService);
    private readonly i18n = inject(I18nService);
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Изменяемое событие; `null` — создание нового.
     */
    public readonly event = input<CalendarEvent | null>(null);

    /**
     * Событие сохранено.
     */
    public readonly saved = output<CalendarEvent>();

    /**
     * Нажата «Отмена».
     */
    public readonly cancelled = output<void>();

    /**
     * Ограничение длины названия и места.
     */
    protected readonly textMaxLength = TEXT_MAX_LENGTH;

    /**
     * Форма.
     */
    protected readonly form = new FormGroup(
        {
            title: new FormControl('', {
                nonNullable: true,
                validators: [Validators.required, Validators.maxLength(TEXT_MAX_LENGTH)],
            }),
            location: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(TEXT_MAX_LENGTH)] }),
            startsAt: new FormControl(defaultStart(), { nonNullable: true, validators: [Validators.required] }),
            endsAt: new FormControl('', { nonNullable: true }),
            description: new FormControl('', {
                nonNullable: true,
                validators: [Validators.maxLength(DESCRIPTION_MAX_LENGTH)],
            }),
        },
        { validators: endAfterStartValidator }
    );

    /**
     * Текущая обложка: URL уже загруженной или data URL выбранного файла.
     */
    protected readonly coverPreview = signal<string>('');

    /**
     * Выбранный, но ещё не загруженный файл обложки.
     */
    private coverFile: File | null = null;

    /**
     * Ошибка выбора обложки (ключ перевода).
     */
    protected readonly coverError = signal<string | null>(null);

    /**
     * Загрузка картинок в описание (те же права, что у новостей).
     */
    protected readonly uploadImage = (file: File): Promise<string> =>
        this.media.uploadFile(file, 'UPLOAD_PURPOSE_NEWS');

    /**
     * Идёт сохранение.
     */
    protected readonly submitting = signal(false);

    public ngOnInit(): void {
        const event = this.event();

        if (!event) {
            return;
        }

        this.form.setValue({
            title: event.title,
            location: event.location,
            startsAt: toLocalInputValue(event.startsAt),
            endsAt: event.endsAt ? toLocalInputValue(event.endsAt) : '',
            description: event.description,
        });
        this.coverPreview.set(event.cover);
    }

    /**
     * Принимает выбранный файл обложки.
     *
     * @param input Поле выбора файла.
     */
    protected onCoverSelected(input: HTMLInputElement): void {
        const file = input.files?.[0] ?? null;
        input.value = '';

        if (!file) {
            return;
        }

        if (file.size > MAX_COVER_SIZE) {
            this.coverError.set('events.admin.coverTooBig');
            return;
        }

        this.coverError.set(null);
        this.coverFile = file;

        const reader = new FileReader();
        reader.onload = () => this.coverPreview.set(reader.result as string);
        reader.readAsDataURL(file);
    }

    /**
     * Убирает обложку.
     */
    protected removeCover(): void {
        this.coverFile = null;
        this.coverPreview.set('');
        this.coverError.set(null);
    }

    /**
     * Сохраняет событие: загружает новую обложку, затем создаёт или изменяет событие.
     */
    protected async submit(): Promise<void> {
        if (this.submitting()) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.submitting.set(true);

        let cover = this.coverPreview();

        if (this.coverFile) {
            try {
                cover = await this.media.uploadFile(this.coverFile, 'UPLOAD_PURPOSE_NEWS');
            } catch {
                this.status.showError(this.i18n.translate('events.admin.coverUploadError'));
                this.submitting.set(false);
                return;
            }
        }

        const { title, location, startsAt, endsAt, description } = this.form.getRawValue();
        const request: SaveEventRequest = {
            title: title.trim(),
            location: location.trim(),
            description: description.trim(),
            cover,
            starts_at: new Date(startsAt).toISOString(),
            ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        };

        const existing = this.event();
        const request$: Observable<CalendarEvent | null> = existing
            ? this.api.update(existing.id, request)
            : this.api.create(request);

        request$
            .pipe(
                finalize(() => this.submitting.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (event) => {
                    this.coverFile = null;
                    this.status.showSuccess(
                        this.i18n.translate(existing ? 'events.admin.saved' : 'events.admin.created')
                    );

                    if (event) {
                        this.saved.emit(event);
                    }
                },
                // Текст ошибки показывает глобальный перехватчик; форма остаётся заполненной.
                error: () => undefined,
            });
    }
}
