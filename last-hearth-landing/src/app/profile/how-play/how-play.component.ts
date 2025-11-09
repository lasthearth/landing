import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TuiCopy } from '@taiga-ui/kit';

/**
 * Компонент страницы "Как зайти".
 */
@Component({
    standalone: true,
    selector: 'app-how-play',
    templateUrl: './how-play.component.html',
    styleUrl: './how-play.component.css',
    imports: [TuiCopy],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowPlayComponent {}
