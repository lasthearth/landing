import { AfterViewInit, ChangeDetectionStrategy, Component, HostListener, inject, output, ViewChild, ElementRef } from '@angular/core';
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
export class WelcomeComponent implements AfterViewInit {
    private readonly localStorageService = inject(LocalStorageService);

    public onScroll = output();

    /**
     * Ссылка на видео.
     */
    public readonly videoUrl = '/welcome-video.mp4';

    /**
     * Ссылка на видео-плеер в разметке компонента.
     */
    @ViewChild('videoPlayer', { static: false })
    videoPlayer?: ElementRef<HTMLVideoElement>;

    @HostListener('window:wheel', ['$event'])
    onMouseWheel(event: WheelEvent) {
        if (event.deltaY > 0) {
            this.onScroll.emit();
        }
    }

    ngAfterViewInit() {
        this.initializeVideo();
    }

    /**
     * Обрабатывает событие swipe на мобильных устройствах.
     */
    onSwipe(swipe: TuiSwipeEvent) {
        if (swipe.direction === 'top') {
            this.onScroll.emit();
        }
    }

    async initializeVideo() {
        const video = this.videoPlayer?.nativeElement;

        if (video) {
            // Устанавливаем muted явно (требуется браузерами)
            video.muted = true;
            video.playsInline = true;

            // Пытаемся запустить видео
            await video.play().catch(() => {});
        }
    }

    // Дополнительно: перезапуск видео при возврате на страницу
    onVisibilityChange() {
        if (!document.hidden && this.videoPlayer?.nativeElement.paused) {
            this.videoPlayer.nativeElement.play().catch(() => {});
        }
    }

    scroll() {
        this.onScroll.emit();
    }
}
