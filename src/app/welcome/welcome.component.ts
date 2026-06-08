import { AfterViewInit, Component, HostListener, inject, output, ViewChild, ElementRef } from '@angular/core';
import { LocalStorageService } from '@app/services/local-storage.service';
import { TuiIcon } from '@taiga-ui/core';
import { TuiSwipe, TuiSwipeEvent } from '@taiga-ui/cdk';

@Component({
    selector: 'app-welcome',
    templateUrl: './welcome.component.html',
    imports: [TuiIcon, TuiSwipe],
    styleUrl: './welcome.component.css',
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

    /**
     * Обрабатывает событие swipe на мобильных устройствах.
     */
    onSwipe(swipe: TuiSwipeEvent) {
        if (swipe.direction === 'top') {
            this.onScroll.emit();
        }
    }

    ngAfterViewInit() {
        this.initializeVideo();
    }

    async initializeVideo() {
        const video = this.videoPlayer?.nativeElement;

        try {
            if (video) {
                // Устанавливаем muted явно (требуется браузерами)
                video.muted = true;
                video.playsInline = true;

                // Пытаемся запустить видео
                await video.play();
            }

            console.log('Видео успешно запущено');
        } catch (error) {
            console.warn('Автозапуск видео заблокирован:', error);
        }
    }

    // Дополнительно: перезапуск видео при возврате на страницу
    onVisibilityChange() {
        if (!document.hidden && this.videoPlayer?.nativeElement.paused) {
            this.videoPlayer.nativeElement.play().catch(console.warn);
        }
    }

    scroll() {
        this.onScroll.emit();
    }
}
