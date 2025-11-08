import { AfterViewInit, Component, ElementRef, HostListener, inject, OnInit, output, ViewChild } from '@angular/core';
import { LocalStorageService } from '@app/services/local-storage.service';
import { TuiIcon } from '@taiga-ui/core';

@Component({
    selector: 'app-welcome',
    templateUrl: './welcome.component.html',
    imports: [TuiIcon],
    styleUrl: './welcome.component.css'
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

            // Добавляем кнопку для ручного запуска
            this.addFallbackPlayButton();
        }
    }

    addFallbackPlayButton() {
        // Создаем кнопку для ручного запуска видео
        const playButton = document.createElement('button');
        playButton.innerHTML = '🎬 Начать видео';
        playButton.className = 'absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg z-50';
        playButton.onclick = () => {
            this.videoPlayer?.nativeElement.play();
            playButton.remove();
        };

        document.querySelector('.relative')?.appendChild(playButton);
    }

    // Дополнительно: перезапуск видео при возврате на страницу
    onVisibilityChange() {
        if (!document.hidden && this.videoPlayer?.nativeElement.paused) {
            this.videoPlayer.nativeElement.play().catch(console.warn);
        }
    }

    test() {
        this.onScroll.emit();
    }
}
