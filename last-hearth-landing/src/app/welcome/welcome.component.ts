import { AfterViewInit, Component, ElementRef, HostListener, inject, OnInit, output, ViewChild } from '@angular/core';
import { LocalStorageService } from '@app/services/local-storage.service';
import { TuiIcon } from '@taiga-ui/core';

@Component({
    selector: 'app-welcome',
    templateUrl: './welcome.component.html',
    imports: [TuiIcon],
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

    /**
     * Начальная позиция касания для обработки свайпов на мобильных устройствах.
     */
    private touchStartY = 0;
    private touchStartX = 0;

    @HostListener('window:wheel', ['$event'])
    onMouseWheel(event: WheelEvent) {
        if (event.deltaY > 0) {
            this.onScroll.emit();
        }
    }

    /**
     * Обработчик начала касания для мобильных устройств.
     */
    @HostListener('window:touchstart', ['$event'])
    onTouchStart(event: TouchEvent) {
        if (event.touches.length === 1) {
            this.touchStartY = event.touches[0].clientY;
            this.touchStartX = event.touches[0].clientX;
        }
    }

    /**
     * Обработчик конца касания для мобильных устройств.
     * Определяет свайп вниз и эмитит событие прокрутки.
     */
    @HostListener('window:touchend', ['$event'])
    onTouchEnd(event: TouchEvent) {
        if (!this.touchStartY || event.changedTouches.length === 0) {
            return;
        }

        const touchEndY = event.changedTouches[0].clientY;
        const touchEndX = event.changedTouches[0].clientX;
        const deltaY = touchEndY - this.touchStartY;
        const deltaX = Math.abs(touchEndX - this.touchStartX);

        // Проверяем, что движение в основном вертикальное (не горизонтальный свайп)
        // и пользователь провел пальцем вниз (положительное значение deltaY)
        // Минимум 50px для избежания случайных срабатываний
        if (deltaY > 50 && deltaY > deltaX) {
            this.onScroll.emit();
        }

        // Сбрасываем начальную позицию
        this.resetTouchState();
    }

    /**
     * Обработчик отмены касания (например, при прерывании жеста системой).
     */
    @HostListener('window:touchcancel', ['$event'])
    onTouchCancel() {
        this.resetTouchState();
    }

    /**
     * Сброс состояния касания.
     */
    private resetTouchState() {
        this.touchStartY = 0;
        this.touchStartX = 0;
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
        playButton.className =
            'absolute bottom-32 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-6 py-3 rounded-lg z-50';
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
