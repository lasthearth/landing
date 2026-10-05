import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
    AbstractControl,
    FormControl,
    FormGroup,
    ReactiveFormsModule,
    ValidationErrors,
    Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { appendNewsBanner, NewsApiService, CreateNewsRequest, NewsDto, parseNewsBanner } from '@entities/news';
import { AnnouncementBarComponent, Announcement } from '@features/announcement';
import { MediaService } from '@entities/media';
import { UserService } from '@entities/user';
import { DiscordWebhookService } from '@shared/lib/discord-webhook/discord-webhook.service';
import { RequestStatusService } from '@core/services/request-status.service';
import { LocalStorageService } from '@core/services/local-storage.service';
import { TuiError, TuiIcon } from '@taiga-ui/core';
import { TuiFieldErrorPipe, TuiFile, TuiFilesComponent, TuiFiles } from '@taiga-ui/kit';
import { debounceTime, finalize, map, merge, Observable, of, startWith, Subject, switchMap, timer } from 'rxjs';
import { NewsCardComponent } from '@app/features/news/ui/news-card/news-card.component';
import { NewsContentEditorComponent } from '@app/features/news/ui/news-content-editor/news-content-editor.component';
import { I18nService, TranslatePipe } from '@core/i18n';
import { LHInputComponent } from '@shared/ui/lh-input/lh-input.component';
import { newsMarkdownToDiscord, renderNewsMarkdown } from '@shared/lib/news-markdown';
import { NewsPreviewMode } from './news-preview-mode';
import { NewsDraft } from './news-draft';
import { bannerUntilDefault } from './banner-until-default.function';

/**
 * Проверяет, что дата из `datetime-local` в будущем.
 *
 * @param control Поле формы.
 * @returns Ошибка `past` или `null`.
 */
function futureDateValidator(control: AbstractControl<string>): ValidationErrors | null {
    const time = new Date(control.value).getTime();
    return Number.isNaN(time) || time <= Date.now() ? { past: true } : null;
}

/**
 * Ключ черновика новости в localStorage.
 */
const DRAFT_STORAGE_KEY = 'lh-news-draft';

/**
 * Максимальная длина заголовка.
 */
const TITLE_MAX_LENGTH = 120;

/**
 * Максимальный размер обложки, байт.
 */
const MAX_COVER_SIZE = 10 * 1024 * 1024;

/**
 * Форма создания новости (админка).
 *
 * - текст пишется в редакторе с разметкой, совместимой с Discord;
 *   на сайт уходит HTML (`renderNewsMarkdown`), в Discord — исходная разметка;
 * - предпросмотр в трёх видах: главная новость, карточка в сетке, страница новости;
 * - черновик заголовка и текста сохраняется в браузере и восстанавливается;
 * - публикацию в Discord можно отключить;
 * - после публикации — ссылка на страницу новости.
 */
@Component({
    selector: 'app-create-news',
    templateUrl: './create-news.component.html',
    styleUrl: './create-news.component.less',
    imports: [
        LHInputComponent,
        ReactiveFormsModule,
        TuiError,
        TuiIcon,
        TuiFieldErrorPipe,
        AsyncPipe,
        TuiFile,
        TuiFiles,
        TuiFilesComponent,
        NewsCardComponent,
        NewsContentEditorComponent,
        AnnouncementBarComponent,
        TranslatePipe,
        RouterLink,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateNewsComponent {
    /**
     * Сервис переводов. Объявлен первым: им пользуются инициализаторы полей ниже (предпросмотр баннера).
     */
    private readonly i18n = inject(I18nService);

    /**
     * Ограничение длины заголовка (для счётчика в шаблоне).
     */
    protected readonly titleMaxLength = TITLE_MAX_LENGTH;

    /**
     * Форма новости.
     */
    protected readonly form = new FormGroup({
        title: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.maxLength(TITLE_MAX_LENGTH)],
        }),
        content: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        preview: new FormControl<File | null>(null, Validators.required),
        publishToDiscord: new FormControl(true, { nonNullable: true }),
        banner: new FormControl(false, { nonNullable: true }),
        bannerUntil: new FormControl(bannerUntilDefault(), {
            nonNullable: true,
            validators: [futureDateValidator],
        }),
        bannerCountdown: new FormControl(false, { nonNullable: true }),
    });

    /**
     * Файл обложки, который не прошёл проверку.
     */
    protected readonly failedFile$ = new Subject<File | null>();

    /**
     * Файл обложки в процессе обработки.
     */
    protected readonly loadingFile$ = new Subject<File | null>();

    /**
     * Принятый файл обложки.
     */
    protected readonly loadedFile$: Observable<File | null> = this.form.controls.preview.valueChanges.pipe(
        switchMap((file) => this.processFile(file))
    );

    /**
     * Data URL обложки для предпросмотра.
     */
    protected readonly previewUrl = signal<string | null>(null);

    /**
     * Режим предпросмотра.
     */
    protected readonly previewMode = signal<NewsPreviewMode>('featured');

    /**
     * Идёт публикация.
     */
    protected readonly submitting = signal(false);

    /**
     * Черновик был восстановлен при открытии формы.
     */
    protected readonly draftRestored = signal(false);

    /**
     * Идентификатор только что опубликованной новости (для ссылки «Открыть»).
     */
    protected readonly createdId = signal<string | null>(null);

    /**
     * Заголовок для предпросмотра.
     */
    protected readonly titleValue = toSignal(
        this.form.controls.title.valueChanges.pipe(startWith(this.form.controls.title.value)),
        { initialValue: '' }
    );

    /**
     * HTML текста для предпросмотра (тот же, что уйдёт на сайт).
     */
    protected readonly contentHtml = toSignal(
        this.form.controls.content.valueChanges.pipe(
            startWith(this.form.controls.content.value),
            map((source) => renderNewsMarkdown(source))
        ),
        { initialValue: '' }
    );

    /**
     * Включён ли баннер (для показа полей и предпросмотра).
     */
    protected readonly bannerEnabled = toSignal(
        this.form.controls.banner.valueChanges.pipe(startWith(this.form.controls.banner.value)),
        { initialValue: false }
    );

    /**
     * Баннер для предпросмотра: заголовок новости и выбранные настройки.
     */
    protected readonly bannerPreview = toSignal(
        merge(
            this.form.controls.title.valueChanges,
            this.form.controls.bannerUntil.valueChanges,
            this.form.controls.bannerCountdown.valueChanges
        ).pipe(
            startWith(null),
            map((): Announcement => {
                const { title, bannerUntil, bannerCountdown } = this.form.getRawValue();
                const until = new Date(bannerUntil);

                return {
                    id: 'preview',
                    title: title.trim() || this.i18n.translate('news.create.titleFallback'),
                    until: Number.isNaN(until.getTime()) ? new Date().toISOString() : until.toISOString(),
                    countdown: bannerCountdown,
                };
            })
        ),
        { requireSync: true }
    );

    /**
     * Время публикации для предпросмотра — «только что».
     */
    protected readonly now = new Date();

    /**
     * Событие успешного создания новости.
     */
    public readonly created = output<void>();

    private readonly requestStatusService = inject(RequestStatusService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly newsApi = inject(NewsApiService);
    private readonly mediaService = inject(MediaService);
    private readonly storage = inject(LocalStorageService);
    private readonly discordWebhook = inject(DiscordWebhookService);

    /**
     * Сервис пользователя (имя автора в предпросмотре).
     */
    protected readonly userService = inject(UserService);

    public constructor() {
        this.restoreDraft();

        this.form.controls.preview.valueChanges.pipe(takeUntilDestroyed()).subscribe((file) => {
            if (!(file instanceof File)) {
                this.previewUrl.set(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = () => this.previewUrl.set(reader.result as string);
            reader.readAsDataURL(file);
        });

        merge(this.form.controls.title.valueChanges, this.form.controls.content.valueChanges)
            .pipe(debounceTime(400), takeUntilDestroyed())
            .subscribe(() => this.saveDraft());
    }

    /**
     * Убирает выбранную обложку.
     */
    protected removeFile(): void {
        this.form.controls.preview.setValue(null);
    }

    /**
     * Сбрасывает форму и удаляет черновик.
     */
    protected clearDraft(): void {
        this.form.reset({
            title: '',
            content: '',
            preview: null,
            publishToDiscord: true,
            banner: false,
            bannerUntil: bannerUntilDefault(),
            bannerCountdown: false,
        });
        this.storage.removeItem(DRAFT_STORAGE_KEY);
        this.draftRestored.set(false);
    }

    /**
     * Публикует новость.
     *
     * Загружает обложку, превращает текст в HTML для сайта, создаёт новость
     * и, если включено, публикует её в Discord со ссылкой на страницу новости.
     */
    protected async submit(): Promise<void> {
        if (this.submitting()) {
            return;
        }

        const { banner } = this.form.getRawValue();
        const invalid = Object.entries(this.form.controls).some(
            ([name, control]) => control.invalid && (banner || !name.startsWith('banner'))
        );

        if (invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.submitting.set(true);
        this.createdId.set(null);

        const { title, content, preview, publishToDiscord, bannerUntil, bannerCountdown } = this.form.getRawValue();
        const source = content.trim();
        const html = renderNewsMarkdown(source);

        let previewUrl = '';

        try {
            previewUrl = preview ? await this.mediaService.uploadFile(preview, 'UPLOAD_PURPOSE_NEWS') : '';
        } catch {
            this.requestStatusService.showError(this.i18n.translate('news.create.coverUploadError'));
            this.submitting.set(false);
            return;
        }

        const request: CreateNewsRequest = {
            title: title.trim(),
            content: banner
                ? appendNewsBanner(html, { until: new Date(bannerUntil).toISOString(), countdown: bannerCountdown })
                : html,
            preview: previewUrl,
        };

        this.newsApi
            .create(request)
            .pipe(
                this.requestStatusService.handleError(),
                this.requestStatusService.handleSuccess(this.i18n.translate('news.create.success')),
                finalize(() => this.submitting.set(false)),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (response) => {
                    // handleError теряет тип потока — ответ POST /news это NewsDto.
                    const createdNews = response as NewsDto;

                    // Метка баннера живёт в HTML новости: если сервер её вырезал, честно говорим об этом.
                    if (banner && createdNews.content && !parseNewsBanner(createdNews.content)) {
                        this.requestStatusService.showError(this.i18n.translate('news.banner.form.lost'));
                    }

                    this.clearDraft();
                    this.createdId.set(createdNews.id ?? null);
                    this.created.emit();

                    if (!publishToDiscord) {
                        return;
                    }

                    const newsUrl = createdNews.id
                        ? `${window.location.origin}/news/${createdNews.id}`
                        : window.location.origin;

                    this.discordWebhook
                        .sendNewsEmbed(
                            createdNews.title,
                            newsMarkdownToDiscord(source),
                            createdNews.preview,
                            newsUrl,
                            createdNews.created_by ?? createdNews.createdBy ?? undefined
                        )
                        .pipe(takeUntilDestroyed(this.destroyRef))
                        .subscribe();
                },
                // Ошибку уже показал handleError; форма и черновик остаются.
                error: () => undefined,
            });
    }

    /**
     * Проверяет выбранный файл обложки.
     *
     * @param file Выбранный файл.
     */
    private processFile(file: File | null): Observable<File | null> {
        this.failedFile$.next(null);

        if (!file) {
            return of(null);
        }

        if (file.size > MAX_COVER_SIZE) {
            this.failedFile$.next(file);
            return of(null);
        }

        this.loadingFile$.next(file);

        return timer(300).pipe(
            map(() => file),
            finalize(() => this.loadingFile$.next(null))
        );
    }

    /**
     * Восстанавливает черновик, если он есть.
     */
    private restoreDraft(): void {
        const draft = this.storage.getItem<NewsDraft>(DRAFT_STORAGE_KEY);

        if (draft && (draft.title || draft.content)) {
            this.form.patchValue({ title: draft.title ?? '', content: draft.content ?? '' });
            this.draftRestored.set(true);
        }
    }

    /**
     * Сохраняет заголовок и текст в черновик (обложка не сохраняется).
     */
    private saveDraft(): void {
        const { title, content } = this.form.getRawValue();

        if (!title && !content) {
            this.storage.removeItem(DRAFT_STORAGE_KEY);
            return;
        }

        this.storage.setItem(DRAFT_STORAGE_KEY, { title, content } satisfies NewsDraft);
    }
}
