import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    OnDestroy,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { TuiIcon } from '@taiga-ui/core';
import { DEFAULT_LOFI_STATIONS } from '@features/radio-widget/config/lofi-stations';
import { RadioStation } from '@features/radio-widget/model/radio-station';

/**
 * Идентификатор загруженного скрипта YouTube IFrame API.
 */
const YOUTUBE_SCRIPT_ID = 'youtube-iframe-api';

declare global {
    interface Window {
        YT: {
            Player: new (
                elementId: string | HTMLElement,
                options: {
                    videoId?: string;
                    playerVars?: Record<string, number | string | undefined>;
                    events?: {
                        onReady?: (event: { target: Player }) => void;
                        onStateChange?: (event: { data: number; target: Player }) => void;
                    };
                },
            ) => Player;
        };
        onYouTubeIframeAPIReady?: () => void;
    }

    interface Player {
        playVideo(): void;
        pauseVideo(): void;
        stopVideo(): void;
        setVolume(volume: number): void;
        getVolume(): number;
        destroy(): void;
        getIframe(): HTMLIFrameElement;
        cueVideoById(videoId: string): void;
        loadVideoById(videoId: string): void;
    }
}

/**
 * Компактный виджет lo-fi радио на основе YouTube-стримов.
 *
 * Воспроизводит заданный список live-стримов через скрытый YouTube embed.
 * Поддерживает выбор станции, play/pause, громкость и сворачивание.
 */
@Component({
    selector: 'app-radio-widget',
    standalone: true,
    imports: [TuiIcon],
    templateUrl: './radio-widget.component.html',
    styleUrl: './radio-widget.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RadioWidgetComponent implements OnDestroy {
    /**
     * Идентификатор платформы.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Список доступных станций.
     */
    protected readonly stations = signal<RadioStation[]>(DEFAULT_LOFI_STATIONS);

    /**
     * Индекс текущей станции.
     */
    protected readonly currentIndex = signal(0);

    /**
     * Признак воспроизведения.
     */
    protected readonly isPlaying = signal(false);

    /**
     * Уровень громкости от 0 до 1.
     */
    protected readonly volume = signal(0.6);

    /**
     * Признак развёрнутого состояния виджета.
     */
    protected readonly isExpanded = signal(false);

    /**
     * Текущая станция.
     */
    protected readonly currentStation = signal<RadioStation>(DEFAULT_LOFI_STATIONS[0]);

    /**
     * URL для iframe с YouTube embed.
     */
    protected readonly iframeSrc = signal<SafeResourceUrl | null>(null);

    /**
     * Элемент iframe плеера.
     */
    private iframeElement: HTMLIFrameElement | null = null;

    /**
     * Флаг загрузки YouTube IFrame API.
     */
    private apiLoading = false;

    /**
     * Флаг готовности YouTube IFrame API.
     */
    private apiReady = false;

    /**
     * Плеер YouTube.
     */
    private player: Player | null = null;

    /**
     * Идентификатор станции, ожидающей инициализации плеера.
     */
    private pendingVideoId: string | null = null;

    /**
     * Санитайзер для доверенных ресурсных URL.
     */
    private readonly sanitizer = inject(DomSanitizer);

    /**
     * Инициализирует виджет.
     */
    public constructor() {
        if (isPlatformBrowser(this.platformId)) {
            this.updateIframeSrc(false);
        }
    }

    /**
     * Останавливает воспроизведение при уничтожении компонента.
     */
    public ngOnDestroy(): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        this.destroyPlayer();
        this.iframeSrc.set(null);
    }

    /**
     * Переключает воспроизведение текущей станции.
     */
    protected togglePlay(): void {
        const next = !this.isPlaying();

        this.isPlaying.set(next);

        if (next) {
            this.play();
        } else {
            this.pause();
        }
    }

    /**
     * Переключает виджет в развёрнутое/свёрнутое состояние.
     */
    protected toggleExpanded(): void {
        this.isExpanded.update((value) => !value);
    }

    /**
     * Выбирает станцию по индексу.
     *
     * @param index Индекс станции.
     */
    protected selectStation(index: number): void {
        if (index === this.currentIndex()) {
            return;
        }

        this.currentIndex.set(index);
        this.currentStation.set(this.stations()[index]);

        if (this.player) {
            this.player.loadVideoById(this.currentStation().id);
        } else {
            this.updateIframeSrc(this.isPlaying());
        }
    }

    /**
     * Изменяет громкость воспроизведения.
     *
     * @param event Событие изменения ползунка.
     */
    protected onVolumeChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const value = Math.max(0, Math.min(1, Number(input.value)));

        this.volume.set(value);
        this.setVolume(value);
    }

    /**
     * Иконка громкости в зависимости от уровня.
     */
    protected readonly volumeIcon = computed(() => {
        const value = this.volume();

        if (value === 0) {
            return '@tui.volume-off';
        }

        return value < 0.5 ? '@tui.volume-1' : '@tui.volume-2';
    });

    /**
     * Воспроизводит текущую станцию.
     */
    private play(): void {
        if (this.player) {
            this.player.playVideo();
            return;
        }

        this.updateIframeSrc(true);
    }

    /**
     * Приостанавливает воспроизведение.
     */
    private pause(): void {
        if (this.player) {
            this.player.pauseVideo();
        }
    }

    /**
     * Устанавливает громкость плеера.
     *
     * @param value Уровень громкости от 0 до 1.
     */
    private setVolume(value: number): void {
        if (this.player) {
            this.player.setVolume(Math.round(value * 100));
        }
    }

    /**
     * Обновляет src iframe для текущей станции и состояния воспроизведения.
     *
     * @param autoplay Включить автовоспроизведение.
     */
    private updateIframeSrc(autoplay: boolean): void {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        const station = this.currentStation();
        const volumePercent = Math.round(this.volume() * 100);
        const url = new URL(`https://www.youtube.com/embed/${station.id}`);

        url.searchParams.set('autoplay', autoplay ? '1' : '0');
        url.searchParams.set('mute', '0');
        url.searchParams.set('controls', '0');
        url.searchParams.set('rel', '0');
        url.searchParams.set('showinfo', '0');
        url.searchParams.set('modestbranding', '1');
        url.searchParams.set('playsinline', '1');
        url.searchParams.set('enablejsapi', '1');
        url.searchParams.set('widgetid', '1');
        url.searchParams.set('origin', window.location.origin);

        this.pendingVideoId = station.id;
        this.iframeSrc.set(this.sanitizer.bypassSecurityTrustResourceUrl(url.toString()));
        this.loadApiAndInitPlayer(station.id, volumePercent, autoplay);
    }

    /**
     * Загружает YouTube IFrame API и инициализирует плеер.
     *
     * @param videoId Идентификатор видео.
     * @param volume Уровень громкости в процентах.
     * @param autoplay Флаг автовоспроизведения.
     */
    private loadApiAndInitPlayer(videoId: string, volume: number, autoplay: boolean): void {
        if (this.apiReady) {
            this.initPlayer(videoId, volume, autoplay);
            return;
        }

        if (this.apiLoading) {
            return;
        }

        this.apiLoading = true;

        const existing = document.getElementById(YOUTUBE_SCRIPT_ID) as HTMLScriptElement | null;

        if (existing) {
            return;
        }

        const tag = document.createElement('script');
        tag.id = YOUTUBE_SCRIPT_ID;
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onload = () => {
            this.apiLoading = false;
            this.apiReady = true;
            this.initPlayer(videoId, volume, autoplay);
        };
        tag.onerror = () => {
            this.apiLoading = false;
        };

        document.head.appendChild(tag);
    }

    /**
     * Инициализирует плеер YouTube.
     *
     * @param videoId Идентификатор видео.
     * @param volume Уровень громкости в процентах.
     * @param autoplay Флаг автовоспроизведения.
     */
    private initPlayer(videoId: string, volume: number, autoplay: boolean): void {
        const iframe = document.getElementById('radio-player-iframe') as HTMLIFrameElement | null;

        if (!iframe) {
            window.setTimeout(() => this.initPlayer(videoId, volume, autoplay), 100);
            return;
        }

        this.destroyPlayer();
        this.iframeElement = iframe;

        this.player = new window.YT.Player(iframe, {
            videoId,
            playerVars: {
                autoplay: autoplay ? 1 : 0,
                controls: 0,
                rel: 0,
                showinfo: 0,
                modestbranding: 1,
                playsinline: 1,
                enablejsapi: 1,
                origin: window.location.origin,
            },
            events: {
                onReady: (event) => {
                    event.target.setVolume(volume);
                    if (autoplay) {
                        event.target.playVideo();
                    }
                },
            },
        });
    }

    /**
     * Уничтожает текущий плеер.
     */
    private destroyPlayer(): void {
        if (this.player) {
            this.player.destroy();
            this.player = null;
        }

        this.iframeElement = null;
    }
}
