import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TuiIcon } from '@taiga-ui/core';
import { YoutubeService } from '../../api/youtube.service';
import { YoutubeVideo } from '../../model/youtube-video';
import { VideoCardComponent } from '../video-card/video-card.component';
import { SafeUrlPipe } from '../../lib/safe-url.pipe';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';

/**
 * Страница видео-галереи с роликами YouTube-канала.
 */
@Component({
    selector: 'app-videos-page',
    standalone: true,
    imports: [CommonModule, TuiIcon, VideoCardComponent, SafeUrlPipe],
    templateUrl: './videos-page.component.html',
    styleUrl: './videos-page.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideosPageComponent {
    /**
     * Сервис для загрузки видео с YouTube.
     */
    private readonly youtubeService = inject(YoutubeService);

    /**
     * Признак загрузки видео.
     */
    protected readonly loading = signal(true);

    /**
     * Текст ошибки при загрузке.
     */
    protected readonly error = signal('');

    /**
     * Идентификатор видео, открытого в превью.
     */
    protected readonly previewVideoId = signal<string | null>(null);

    /**
     * Список видео.
     */
    protected readonly videos = toSignal(
        toObservable(this.loading).pipe(
            switchMap(() =>
                this.youtubeService.getVideos().pipe(
                    catchError(() => {
                        this.error.set('Не удалось загрузить видео. Попробуйте позже.');
                        return of([]);
                    })
                )
            )
        ),
        { initialValue: [] }
    );

    /**
     * Открывает превью видео.
     *
     * @param videoId Идентификатор видео.
     */
    protected openVideo(videoId: string): void {
        this.previewVideoId.set(videoId);
    }

    /**
     * Закрывает превью видео.
     */
    protected closeVideo(): void {
        this.previewVideoId.set(null);
    }

    /**
     * Форматирует дату публикации в локальный формат.
     *
     * @param date Дата в формате ISO 8601.
     * @returns Строка в формате "DD.MM.YYYY".
     */
    protected formatDate(date: string): string {
        return new Date(date).toLocaleDateString('ru-RU');
    }
}
