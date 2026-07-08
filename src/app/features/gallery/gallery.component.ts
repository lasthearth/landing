import { DatePipe } from '@angular/common';
import {
    afterNextRender,
    afterRenderEffect,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    signal,
    TemplateRef,
    ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '@core/i18n';
import { GalleryImageComponent } from './ui/gallery-image/gallery-image.component';
import { TuiDialogContext, TuiIcon, TuiLoader } from '@taiga-ui/core';
import { TuiPreview, TuiPreviewDialogService } from '@taiga-ui/kit';
import { PolymorpheusContent, PolymorpheusOutlet } from '@taiga-ui/polymorpheus';
import {
    DiscordGalleryImage,
    DiscordGalleryService,
} from '@shared/lib/discord-gallery/discord-gallery.service';

/**
 * Количество изображений, подгружаемых за один запрос.
 */
const IMAGES_PER_PAGE = 50;

/**
 * Компонент страницы галереи скриншотов.
 *
 * Загружает изображения из Discord-канала при каждом открытии страницы,
 * отображает их в адаптивной сетке и поддерживает бесконечную прокрутку.
 */
@Component({
    selector: 'app-gallery',
    standalone: true,
    imports: [
        DatePipe,
        TuiIcon,
        TuiLoader,
        TuiPreview,
        PolymorpheusOutlet,
        TranslatePipe,
        GalleryImageComponent,
    ],
    templateUrl: './gallery.component.html',
    styleUrl: './gallery.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryComponent {
    /**
     * Сервис загрузки скриншотов из Discord.
     */
    private readonly galleryService = inject(DiscordGalleryService);

    /**
     * Сервис предпросмотра изображений.
     */
    private readonly previewService = inject(TuiPreviewDialogService);

    /**
     * Ссылка уничтожения компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Ссылка на DOM-элемент компонента.
     */
    private readonly elementRef = inject(ElementRef);

    /**
     * Список изображений галереи.
     */
    protected readonly images = signal<DiscordGalleryImage[]>([]);

    /**
     * Признак загрузки изображений.
     */
    protected readonly isLoading = signal(true);

    /**
     * Признак дозагрузки следующей порции изображений.
     */
    protected readonly isLoadingMore = signal(false);

    /**
     * Признак ошибки загрузки.
     */
    protected readonly hasError = signal(false);

    /**
     * Признак того, что все изображения загружены.
     */
    protected readonly allLoaded = signal(false);

    /**
     * Список индексов скелетонов для первичной загрузки.
     */
    protected readonly skeletons = signal(Array.from({ length: 16 }, (_, index) => index));

    /**
     * Текущий IntersectionObserver для бесконечной прокрутки.
     */
    private observer: IntersectionObserver | null = null;

    /**
     * Ссылка на sentinel для бесконечной прокрутки.
     */
    @ViewChild('sentinel')
    private readonly sentinelRef?: ElementRef<HTMLElement>;

    /**
     * Ссылка на шаблон окна предпросмотра.
     */
    @ViewChild('preview')
    protected readonly preview?: TemplateRef<TuiDialogContext>;

    /**
     * Содержимое предпросмотра (URL изображения).
     */
    protected previewContent: PolymorpheusContent = '';

    /**
     * Подпись для окна предпросмотра.
     */
    protected previewCaption = '';

    /**
     * Инициализирует компонент и запускает загрузку изображений.
     */
    public constructor() {
        this.loadImages();

        afterRenderEffect(() => {
            const loading = this.isLoading();
            const loadedAll = this.allLoaded();
            const sentinel = this.sentinelRef?.nativeElement;

            if (loading || loadedAll || !sentinel || this.observer) {
                return;
            }

            this.observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry?.isIntersecting) {
                        this.loadMoreImages();
                    }
                },
                { rootMargin: '200px' }
            );

            this.observer.observe(sentinel);
        });
    }

    /**
     * Загружает первую порцию изображений из Discord-канала.
     */
    private loadImages(): void {
        this.isLoading.set(true);
        this.hasError.set(false);
        this.allLoaded.set(false);

        this.galleryService
            .getImages$(IMAGES_PER_PAGE)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (page) => {
                    this.images.set(page.images);
                    this.isLoading.set(false);
                    this.allLoaded.set(page.isLastPage);
                },
                error: () => {
                    this.hasError.set(true);
                    this.isLoading.set(false);
                },
            });
    }

    /**
     * Подгружает следующую порцию изображений при прокрутке.
     */
    private loadMoreImages(): void {
        if (this.isLoadingMore() || this.allLoaded()) {
            return;
        }

        this.isLoadingMore.set(true);

        const lastImage = this.images()[this.images().length - 1];
        const lastMessageId = lastImage?.id.split('-')[0];

        this.galleryService
            .getImages$(IMAGES_PER_PAGE, lastMessageId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (page) => {
                    if (page.images.length === 0) {
                        this.allLoaded.set(true);
                    } else {
                        this.images.update((current) => current.concat(page.images));
                        this.allLoaded.set(page.isLastPage);
                    }

                    this.isLoadingMore.set(false);
                },
                error: () => {
                    this.isLoadingMore.set(false);
                },
            });
    }

    /**
     * Инициализирует IntersectionObserver для бесконечной прокрутки.
     *
     * @deprecated Используется автоматически через {@link afterRenderEffect}.
     */
    private initIntersectionObserver(): void {
        // Реализация больше не нужна, observer создаётся в afterRenderEffect.
    }

    /**
     * Открывает изображение в окне предпросмотра.
     *
     * @param image Изображение галереи.
     */
    protected openImage(image: DiscordGalleryImage): void {
        this.previewContent = image.url;
        this.previewCaption = `${image.author}${image.alt ? ' — ' + image.alt : ''}`;
        this.previewService.open(this.preview || '').subscribe();
    }

    /**
     * Проверяет, опубликовано ли изображение менее суток назад.
     *
     * @param timestamp Дата публикации в формате ISO 8601.
     * @returns `true`, если изображение опубликовано менее 24 часов назад.
     */
    protected isNew(timestamp: string): boolean {
        const publishedAt = new Date(timestamp).getTime();
        const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

        return !Number.isNaN(publishedAt) && publishedAt > dayAgo;
    }

    /**
     * Возвращает соотношение сторон для скелетона по его индексу.
     *
     * @param index Индекс скелетона.
     * @returns Строка с CSS-соотношением сторон.
     */
    protected getSkeletonAspect(index: number): string {
        const aspects = ['4 / 3', '3 / 4', '1 / 1', '16 / 9', '3 / 2', '2 / 3'];

        return aspects[index % aspects.length];
    }
}
