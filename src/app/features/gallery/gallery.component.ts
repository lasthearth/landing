import { DatePipe } from '@angular/common';
import {
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
 * Компонент страницы галереи скриншотов.
 *
 * Загружает все изображения из Discord-канала при открытии страницы,
 * отображает их в адаптивной сетке и открывает предпросмотр по клику.
 */
@Component({
    selector: 'app-gallery',
    standalone: true,
    imports: [
        DatePipe,
        TuiIcon,
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
     * Список изображений галереи.
     */
    protected readonly images = signal<DiscordGalleryImage[]>([]);

    /**
     * Признак загрузки изображений.
     */
    protected readonly isLoading = signal(true);

    /**
     * Признак ошибки загрузки.
     */
    protected readonly hasError = signal(false);

    /**
     * Список индексов скелетонов для первичной загрузки.
     */
    protected readonly skeletons = signal(Array.from({ length: 16 }, (_, index) => index));

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
    }

    /**
     * Загружает все изображения из Discord-канала.
     */
    private loadImages(): void {
        this.isLoading.set(true);
        this.hasError.set(false);

        const cached = this.galleryService.getCachedImages();

        if (cached) {
            this.images.set(cached);
            this.isLoading.set(false);
        }

        this.galleryService
            .getAllImages$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (loadedImages) => {
                    this.images.set(loadedImages);
                    this.galleryService.saveCache(loadedImages);
                    this.isLoading.set(false);
                },
                error: () => {
                    this.hasError.set(true);
                    this.isLoading.set(false);
                },
            });
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
