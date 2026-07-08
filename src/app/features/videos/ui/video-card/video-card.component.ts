import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { YoutubeVideo } from '../../model/youtube-video';

/**
 * Карточка видео для галереи.
 */
@Component({
    selector: 'app-video-card',
    standalone: true,
    imports: [CommonModule, TuiIcon],
    templateUrl: './video-card.component.html',
    styleUrl: './video-card.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VideoCardComponent {
    /**
     * Данные видео.
     */
    public readonly video = input.required<YoutubeVideo>();

    /**
     * Событие клика по карточке.
     */
    public readonly clickVideo = output<void>();

    /**
     * Форматирует дату публикации.
     *
     * @param date Дата в формате ISO 8601.
     * @returns Строка в формате "DD.MM.YYYY".
     */
    protected formatDate(date: string): string {
        return new Date(date).toLocaleDateString('ru-RU');
    }
}
