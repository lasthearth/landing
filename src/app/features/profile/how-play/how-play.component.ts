import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiCopy } from '@taiga-ui/kit';
import { environment } from '@core/config/environments/environment';
import { TranslatePipe } from '@core/i18n';

/**
 * Компонент страницы "Как зайти".
 */
@Component({
    standalone: true,
    selector: 'app-how-play',
    templateUrl: './how-play.component.html',
    styleUrl: './how-play.component.css',
    imports: [TuiCopy, TranslatePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowPlayComponent {
    protected readonly environment = environment;
}
