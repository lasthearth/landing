import {
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ImageViewerComponent, ImageViewerItem } from '@shared/ui/image-viewer';
import { DiscordGalleryImage, DiscordGalleryService } from '@shared/lib/discord-gallery/discord-gallery.service';
import { GalleryImageComponent } from './ui/gallery-image/gallery-image.component';
import { PageHeaderComponent } from '@shared/ui/page-header';

/**
 * Сколько скриншотов показывать сразу (без «свежего кадра»).
 */
const INITIAL_COUNT = 24;

/**
 * Сколько скриншотов добавляет «Показать ещё».
 */
const STEP = 24;

/**
 * Страница галереи скриншотов из Discord.
 *
 * Самый свежий скриншот показывается крупно («Свежий кадр»), остальные —
 * кирпичной кладкой с кнопкой «Показать ещё». Клик открывает полноэкранный
 * просмотрщик со стрелками; у каждого кадра своя ссылка `/gallery#<id>`,
 * по которой просмотрщик открывается сразу на нём.
 */
@Component({
    selector: 'app-gallery',
    standalone: true,
    imports: [PageHeaderComponent, TuiIcon, TranslatePipe, GalleryImageComponent, RelativeTimeComponent, ImageViewerComponent],
    templateUrl: './gallery.component.html',
    styleUrl: './gallery.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GalleryComponent {
    private readonly galleryService = inject(DiscordGalleryService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly location = inject(Location);
    private readonly route = inject(ActivatedRoute);
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Все скриншоты (как пришли из API).
     */
    private readonly images = signal<DiscordGalleryImage[]>([]);

    /**
     * Идёт загрузка.
     */
    protected readonly isLoading = signal(true);

    /**
     * Ошибка загрузки.
     */
    protected readonly hasError = signal(false);

    /**
     * Заглушки для скелетона.
     */
    protected readonly skeletons = Array.from({ length: 12 }, (_, index) => index);

    /**
     * Сколько скриншотов сетки показано.
     */
    protected readonly visibleCount = signal(INITIAL_COUNT);

    /**
     * Индекс открытого в просмотрщике кадра или null.
     */
    protected readonly viewerIndex = signal<number | null>(null);

    /**
     * Скриншоты от новых к старым.
     */
    protected readonly sorted = computed(() =>
        [...this.images()].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    );

    /**
     * Свежий кадр.
     */
    protected readonly featured = computed(() => this.sorted()[0] ?? null);

    /**
     * Показанные кадры сетки (без свежего).
     */
    protected readonly visible = computed(() => this.sorted().slice(1, 1 + this.visibleCount()));

    /**
     * Сколько кадров ещё скрыто.
     */
    protected readonly hiddenCount = computed(() => Math.max(0, this.sorted().length - 1 - this.visibleCount()));

    /**
     * Кадры для просмотрщика — все, чтобы стрелками можно было пройти галерею целиком.
     */
    protected readonly viewerItems = computed<ImageViewerItem[]>(() =>
        this.sorted().map((image) => ({
            src: image.url,
            alt: image.alt || image.author,
            caption: image.author,
            date: image.timestamp,
            shareUrl: `/gallery#${encodeURIComponent(image.id)}`,
        }))
    );

    public constructor() {
        this.loadImages();
    }

    /**
     * Показывает следующую порцию скриншотов.
     */
    protected showMore(): void {
        this.visibleCount.update((count) => count + STEP);
    }

    /**
     * Открывает кадр в просмотрщике.
     *
     * @param image Скриншот.
     */
    protected open(image: DiscordGalleryImage): void {
        this.setViewerIndex(this.sorted().indexOf(image));
    }

    /**
     * Меняет открытый кадр и адрес страницы (`#<id>`), чтобы ссылкой можно было поделиться.
     *
     * @param index Индекс кадра или null — закрыть.
     */
    protected setViewerIndex(index: number | null): void {
        this.viewerIndex.set(index);

        if (!this.isBrowser) {
            return;
        }

        const image = index === null ? null : this.sorted()[index];
        this.location.replaceState(image ? `/gallery#${encodeURIComponent(image.id)}` : '/gallery');
    }

    /**
     * Новый ли кадр (последние сутки).
     *
     * @param timestamp Время публикации.
     */
    protected isNew(timestamp: string): boolean {
        const publishedAt = new Date(timestamp).getTime();
        return !Number.isNaN(publishedAt) && publishedAt > Date.now() - 24 * 60 * 60 * 1000;
    }

    /**
     * Пропорции кадра для резервирования места до загрузки.
     *
     * @param image Скриншот.
     */
    protected getImageAspect(image: DiscordGalleryImage): string {
        return image.width && image.height ? `${image.width} / ${image.height}` : '4 / 3';
    }

    /**
     * Высота заглушки скелетона.
     *
     * @param index Номер заглушки.
     */
    protected getSkeletonHeight(index: number): number {
        const heights = [260, 380, 300, 220, 340, 280];
        return heights[index % heights.length];
    }

    /**
     * Задержка анимации заглушки.
     *
     * @param index Номер заглушки.
     */
    protected getSkeletonDelay(index: number): number {
        return (index % 6) * 120;
    }

    /**
     * Загружает скриншоты (сначала из кэша, затем свежие).
     */
    private loadImages(): void {
        this.isLoading.set(true);
        this.hasError.set(false);

        const cached = this.galleryService.getCachedImages();

        if (cached) {
            this.images.set(cached);
            this.isLoading.set(false);
            this.openFromFragment();
        }

        this.galleryService
            .getAllImages$()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (loadedImages) => {
                    this.images.set(loadedImages);
                    this.galleryService.saveCache(loadedImages);
                    this.isLoading.set(false);
                    this.openFromFragment();
                },
                error: () => {
                    this.hasError.set(true);
                    this.isLoading.set(false);
                },
            });
    }

    /**
     * Открывает кадр из ссылки `/gallery#<id>` (один раз, после загрузки).
     */
    private openFromFragment(): void {
        const fragment = this.route.snapshot.fragment;

        if (!fragment || this.viewerIndex() !== null) {
            return;
        }

        const id = decodeURIComponent(fragment);
        const index = this.sorted().findIndex((image) => image.id === id);

        if (index >= 0) {
            this.viewerIndex.set(index);
        }
    }
}
