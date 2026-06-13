import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiIcon } from '@taiga-ui/core';
import { TuiCopy } from '@taiga-ui/kit';
import { environment } from '@core/config/environments/environment';

/**
 * Компонент страницы "Как зайти".
 */
@Component({
    standalone: true,
    selector: 'app-how-play',
    templateUrl: './how-play.component.html',
    styleUrl: './how-play.component.css',
    imports: [TuiCopy, TuiIcon],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowPlayComponent {
    protected readonly environment = environment;
}
