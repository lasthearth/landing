import { ChangeDetectionStrategy, Component, HostListener, inject, output } from '@angular/core';
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
