import { RelativeTimeComponent } from '@shared/ui/relative-time';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { YoutubeVideo } from '../../model/youtube-video';

/**
 * Карточка видео для галереи.
 */
@Component({
    selector: 'app-video-card',
    standalone: true,
    imports: [TuiIcon, RelativeTimeComponent],
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
     * Вертикальная карточка для шортсов.
     */
    public readonly vertical = input(false);

    /**
     * Событие клика по карточке.
     */
    public readonly clickVideo = output<void>();
}
