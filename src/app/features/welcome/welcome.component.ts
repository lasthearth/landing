import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    HostListener,
    inject,
    output,
} from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TuiSwipe, TuiSwipeEvent } from '@taiga-ui/cdk';
import { TranslatePipe } from '@core/i18n';

/**
 * Приветственный экран: фоновое видео и первичные действия.
 */
@Component({
    selector: 'app-welcome',
    templateUrl: './welcome.component.html',
    imports: [TuiIcon, TuiSwipe, TranslatePipe],
    styleUrl: './welcome.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WelcomeComponent implements AfterViewInit {
    /**
     * Корневой элемент компонента.
     * Видео ищется в нём по месту вызова, а не хранится в `ViewChild`:
     * Angular пересоздаёт DOM приветственного экрана, и сохранённая
     * ссылка успевала устареть — `play()` падал с `AbortError:
     * media was removed from the document`.
     */
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Запрос на переход к основному содержимому сайта.
     */
    public onScroll = output();

    /**
     * Путь к фоновому видео.
     */
    public readonly videoUrl = '/welcome-video.mp4';

    /**
     * Пользователь остановил видео вручную.
     * Флаг не даёт автоматическим попыткам запуска (жест, `canplay`)
     * возобновить воспроизведение против воли пользователя.
     */
    private isPausedByUser = false;

    /** @inheritdoc */
    public ngAfterViewInit(): void {
        const video = this.findVideo();

        if (!video) {
            return;
        }

        // Firefox и Zen проверяют свойство `muted`, а не атрибут: при
        // гидратации предрендеренной страницы элемент успевает получить
        // src раньше, чем атрибут превращается в свойство, и автоплей
        // отклоняется как «со звуком». Выставляем свойство явно.
        video.muted = true;
        video.defaultMuted = true;

        void this.tryPlay(video);

        // Политика автоплея проверяется в момент, когда данных ещё нет,
        // поэтому первый play() может быть отклонён. Повторяем, когда
        // браузер готов проигрывать. once — чтобы не спорить с паузой.
        video.addEventListener('canplay', () => void this.tryPlay(video), { once: true });
    }

    /**
     * Переключает воспроизведение по клику на видео.
     *
     * @param video Элемент видео.
     */
    public togglePlayback(video: HTMLVideoElement): void {
        if (video.paused) {
            this.isPausedByUser = false;
            void this.tryPlay(video);

            return;
        }

        this.isPausedByUser = true;
        video.pause();
    }

    /**
     * Запускает видео по первому жесту пользователя.
     *
     * Сборки с усиленной политикой блокируют даже `muted`-автоплей,
     * и на экране остаётся только `poster`. Жест по самому видео
     * игнорируется: там уже висит переключатель паузы, и запуск здесь
     * отменил бы постановку на паузу.
     *
     * @param target Элемент, по которому пришёл жест.
     */
    @HostListener('document:pointerdown', ['$event.target'])
    @HostListener('document:keydown', ['$event.target'])
    public onFirstGesture(target: EventTarget | null): void {
        if (this.isPausedByUser) {
            return;
        }

        const video = this.findVideo();

        if (!video || target === video) {
            return;
        }

        void this.tryPlay(video);
    }

    /**
     * Обрабатывает свайп на мобильных устройствах.
     *
     * @param swipe Событие свайпа.
     */
    public onSwipe(swipe: TuiSwipeEvent): void {
        if (swipe.direction === 'top') {
            this.onScroll.emit();
        }
    }

    /**
     * Запрашивает переход к содержимому сайта.
     */
    public scroll(): void {
        this.onScroll.emit();
    }

    @HostListener('window:wheel', ['$event'])
    protected onMouseWheel(event: WheelEvent): void {
        if (event.deltaY > 0) {
            this.onScroll.emit();
        }
    }

    /**
     * Пытается запустить воспроизведение.
     * Отказ браузера — ожидаемый исход (политика автоплея), поэтому
     * ошибка гасится: на экране остаётся `poster`, а видео запустится
     * по первому жесту пользователя.
     *
     * @param video Элемент видео.
     */
    private async tryPlay(video: HTMLVideoElement): Promise<void> {
        if (!video.paused || this.isPausedByUser) {
            return;
        }

        try {
            await video.play();
        } catch {
            // Автоплей запрещён — ждём жеста пользователя.
        }
    }

    /**
     * Возвращает актуальный элемент видео.
     *
     * @returns Элемент видео или `null`, если он ещё не в DOM.
     */
    private findVideo(): HTMLVideoElement | null {
        return this.host.nativeElement.querySelector('video');
    }
}
