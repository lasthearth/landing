import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';
import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ShareButtonComponent } from '@shared/ui/share-button';
import { YoutubeService } from '../../api/youtube.service';
import { VIDEO_KINDS } from '../../config/video-kinds.constant';
import { VideoKind } from '../../model/video-kind';
import { VideoKindState } from '../../model/video-kind-state';
import { YoutubeVideo } from '../../model/youtube-video';
import { VideoCardComponent } from '../video-card/video-card.component';
import { SafeUrlPipe } from '../../lib/safe-url.pipe';

/**
 * Сколько карточек показывать сразу и добавлять по «Показать ещё».
 */
const PAGE_SIZE: Record<VideoKind, number> = {
    videos: 9,
    streams: 9,
    shorts: 12,
};

/**
 * Допустимый id ролика YouTube.
 */
const VIDEO_ID_PATTERN = /^[\w-]{6,20}$/;

/**
 * Пустое состояние раздела.
 */
const EMPTY_STATE: VideoKindState = {
    videos: [],
    nextPageToken: null,
    total: 0,
    loading: false,
    error: false,
    loaded: false,
};

/**
 * Страница видео YouTube-канала: вкладки «Ролики», «Стримы», «Shorts».
 *
 * Свежий ролик раздела — крупно, остальные сеткой с «Показать ещё».
 * Вкладка и открытый ролик хранятся в адресе (`?tab=shorts&v=<id>`), поэтому ссылкой можно поделиться.
 */
@Component({
    selector: 'app-videos-page',
    standalone: true,
    imports: [TuiIcon, TranslatePipe, RelativeTimeComponent, ShareButtonComponent, VideoCardComponent, SafeUrlPipe],
    templateUrl: './videos-page.component.html',
    styleUrl: './videos-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '(document:keydown.escape)': 'closeVideo()',
    },
})
export class VideosPageComponent {
    /**
     * Сервис для загрузки видео с YouTube.
     */
    private readonly youtubeService = inject(YoutubeService);

    /**
     * Роутер для синхронизации вкладки и ролика с адресом.
     */
    private readonly router = inject(Router);

    /**
     * Текущий маршрут.
     */
    private readonly route = inject(ActivatedRoute);

    /**
     * Ссылка на жизненный цикл компонента.
     */
    private readonly destroyRef = inject(DestroyRef);

    /**
     * Компонент работает в браузере.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Разделы в порядке вкладок.
     */
    protected readonly kinds = VIDEO_KINDS;

    /**
     * Активный раздел.
     */
    protected readonly kind = signal<VideoKind>(this.readKind());

    /**
     * Состояние всех разделов.
     */
    private readonly states = signal<Record<VideoKind, VideoKindState>>({
        videos: EMPTY_STATE,
        streams: EMPTY_STATE,
        shorts: EMPTY_STATE,
    });

    /**
     * Сколько карточек сетки показано в каждом разделе.
     */
    private readonly visibleCounts = signal<Record<VideoKind, number>>({ ...PAGE_SIZE });

    /**
     * Состояние активного раздела.
     */
    protected readonly state = computed(() => this.states()[this.kind()]);

    /**
     * Раздел с вертикальными роликами.
     */
    protected readonly isShorts = computed(() => this.kind() === 'shorts');

    /**
     * Свежий ролик раздела (для шортсов не выделяется — они идут ровной сеткой).
     */
    protected readonly featured = computed<YoutubeVideo | null>(() =>
        this.isShorts() ? null : (this.state().videos[0] ?? null)
    );

    /**
     * Карточки сетки.
     */
    protected readonly visible = computed(() => {
        const offset = this.featured() ? 1 : 0;
        return this.state().videos.slice(offset, offset + this.visibleCounts()[this.kind()]);
    });

    /**
     * Сколько роликов раздела ещё не показано.
     */
    protected readonly hiddenCount = computed(() => {
        const shown = this.visible().length + (this.featured() ? 1 : 0);
        return Math.max(0, this.state().total - shown);
    });

    /**
     * Идентификатор ролика, открытого в плеере.
     */
    protected readonly previewVideoId = signal<string | null>(this.readVideoId());

    /**
     * Открытый ролик вертикальный.
     */
    protected readonly previewVertical = signal(this.readKind() === 'shorts');

    constructor() {
        this.load(this.kind());
    }

    /**
     * Переключает вкладку.
     *
     * @param kind Раздел.
     */
    protected selectKind(kind: VideoKind): void {
        if (kind === this.kind()) {
            return;
        }

        this.kind.set(kind);
        this.syncUrl();
        this.load(kind);
    }

    /**
     * Обрабатывает стрелки на вкладках (паттерн WAI-ARIA tabs).
     *
     * @param event Событие клавиатуры.
     */
    protected onTabKeydown(event: KeyboardEvent): void {
        const index = this.kinds.indexOf(this.kind());
        const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;

        if (!delta) {
            return;
        }

        event.preventDefault();
        const next = this.kinds[(index + delta + this.kinds.length) % this.kinds.length];
        this.selectKind(next);

        const tab = (event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLElement>(
            `[data-kind="${next}"]`
        );
        tab?.focus();
    }

    /**
     * Показывает следующую порцию роликов, при необходимости догружая страницу API.
     */
    protected showMore(): void {
        const kind = this.kind();
        const nextCount = this.visibleCounts()[kind] + PAGE_SIZE[kind];
        this.visibleCounts.update((counts) => ({ ...counts, [kind]: nextCount }));

        const state = this.states()[kind];
        const needed = nextCount + (this.featured() ? 1 : 0);

        if (state.videos.length < needed && state.nextPageToken && !state.loading) {
            this.load(kind, state.nextPageToken);
        }
    }

    /**
     * Повторяет загрузку после ошибки.
     */
    protected retry(): void {
        const state = this.state();
        this.load(this.kind(), state.loaded ? (state.nextPageToken ?? undefined) : undefined);
    }

    /**
     * Открывает ролик в плеере.
     *
     * @param video Ролик.
     */
    protected openVideo(video: YoutubeVideo): void {
        this.previewVertical.set(this.isShorts());
        this.previewVideoId.set(video.id);
        this.syncUrl();
    }

    /**
     * Закрывает плеер.
     * Вызывается кликом по оверлею, кнопкой закрытия и клавишей Escape.
     */
    protected closeVideo(): void {
        if (!this.previewVideoId()) {
            return;
        }

        this.previewVideoId.set(null);
        this.syncUrl();
    }

    /**
     * Ссылка на ролик на этой странице.
     *
     * @param videoId Идентификатор ролика.
     */
    protected shareUrl(videoId: string): string {
        const tab = this.kind() === 'videos' ? '' : `tab=${this.kind()}&`;
        return `/videos?${tab}v=${encodeURIComponent(videoId)}`;
    }

    /**
     * Загружает страницу роликов раздела.
     *
     * @param kind Раздел.
     * @param pageToken Токен следующей страницы; без него — первая страница.
     */
    private load(kind: VideoKind, pageToken?: string): void {
        const current = this.states()[kind];

        if (!this.isBrowser || current.loading || (!pageToken && current.loaded)) {
            return;
        }

        this.patch(kind, { loading: true, error: false });

        this.youtubeService
            .getPage(kind, pageToken)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (page) => {
                    const known = new Set(this.states()[kind].videos.map((video) => video.id));
                    const fresh = page.videos.filter((video) => !known.has(video.id));

                    this.patch(kind, {
                        videos: pageToken ? [...this.states()[kind].videos, ...fresh] : page.videos,
                        nextPageToken: page.nextPageToken,
                        total: page.total,
                        loading: false,
                        loaded: true,
                    });
                },
                error: () => this.patch(kind, { loading: false, error: true }),
            });
    }

    /**
     * Обновляет часть состояния раздела.
     *
     * @param kind Раздел.
     * @param patch Изменения.
     */
    private patch(kind: VideoKind, patch: Partial<VideoKindState>): void {
        this.states.update((states) => ({ ...states, [kind]: { ...states[kind], ...patch } }));
    }

    /**
     * Записывает вкладку и открытый ролик в адрес, не добавляя запись в историю.
     */
    private syncUrl(): void {
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                tab: this.kind() === 'videos' ? null : this.kind(),
                v: this.previewVideoId(),
            },
            replaceUrl: true,
        });
    }

    /**
     * Читает id ролика из адреса.
     *
     * Id подставляется в адрес плеера, поэтому пропускаем только допустимый формат YouTube.
     */
    private readVideoId(): string | null {
        const id = this.route.snapshot.queryParamMap.get('v');
        return id && VIDEO_ID_PATTERN.test(id) ? id : null;
    }

    /**
     * Читает раздел из адреса.
     */
    private readKind(): VideoKind {
        const tab = this.route.snapshot.queryParamMap.get('tab');
        return VIDEO_KINDS.includes(tab as VideoKind) ? (tab as VideoKind) : 'videos';
    }
}
