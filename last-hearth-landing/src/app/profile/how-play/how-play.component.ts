import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiCopy } from '@taiga-ui/kit';

/**
 * Компонент страницы "Как зайти".
 */
@Component({
    standalone: true,
    selector: 'app-how-play',
    templateUrl: './how-play.component.html',
    imports: [TuiCopy],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowPlayComponent {}
