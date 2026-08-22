import { ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, output } from '@angular/core';
import { LocalStorageService } from '@core/services/local-storage.service';
import { TuiIcon } from '@taiga-ui/core';
import { TuiSwipe, TuiSwipeEvent } from '@taiga-ui/cdk';
import { TranslatePipe } from '@core/i18n';

@Component({
    selector: 'app-welcome',
    templateUrl: './welcome.component.html',
    imports: [TuiIcon, TuiSwipe, TranslatePipe],
    styleUrl: './welcome.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent {
    private readonly localStorageService = inject(LocalStorageService);

    /**
     * Корневой элемент компонента.
     * Используется, чтобы найти актуальный `<video>` в момент жеста
     * пользователя, а не хранить ссылку, которая может устареть.
     */
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    public onScroll = output();

    /**
     * Ссылка на видео.
     *
     * Воспроизведение включается атрибутом `autoplay` в разметке, а не через
     * `play()` в `ngAfterViewInit`: Angular пересоздаёт DOM приветственного
     * экрана, и `ViewChild`-ссылка успевает устареть — `play()` падал с
     * `AbortError: media was removed from the document`, а на оставшемся
     * элементе оставался виден только `poster`.
     */
    public readonly videoUrl = '/welcome-video.mp4';

    @HostListener('window:wheel', ['$event'])
    onMouseWheel(event: WheelEvent) {
        if (event.deltaY > 0) {
            this.onScroll.emit();
        }
    }

    /**
     * Признак того, что фолбэк-запуск видео уже отработал.
     * Дальше воспроизведением управляет только клик по видео.
     */
    private isPlaybackStarted = false;

    /**
     * Запускает видео по первому жесту пользователя.
     *
     * Часть браузеров (например Zen и другие сборки Firefox с усиленной
     * политикой) блокируют даже `muted`-автоплей, и на экране остаётся
     * только `poster`. Слушатели навешены на документ, потому что жест
     * может прийти по любому элементу приветственного экрана.
     *
     * Жесты по самому видео игнорируются: там уже висит клик-переключатель
     * паузы, и запуск здесь отменил бы постановку на паузу.
     *
     * @param target Элемент, по которому пришёл жест.
     */
    @HostListener('document:pointerdown', ['$event.target'])
    @HostListener('document:keydown', ['$event.target'])
    onFirstGesture(target: EventTarget | null): void {
        if (this.isPlaybackStarted) {
            return;
        }

        const video = this.host.nativeElement.querySelector('video');

        if (!video || target === video) {
            return;
        }

        this.isPlaybackStarted = true;

        if (video.paused) {
            video.play().catch(() => {});
        }
    }

    /**
     * Обрабатывает событие swipe на мобильных устройствах.
     */
    onSwipe(swipe: TuiSwipeEvent) {
        if (swipe.direction === 'top') {
            this.onScroll.emit();
        }
    }

    scroll() {
        this.onScroll.emit();
    }
}
