import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Компонент страницы "Как зайти".
 */
@Component({
  standalone: true,
  selector: 'app-how-play',
  templateUrl: './how-play.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HowPlayComponent { }
