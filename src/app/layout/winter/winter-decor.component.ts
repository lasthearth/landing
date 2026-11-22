import { ChangeDetectionStrategy, Component } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SnowfallDirective } from './snowfall.directive';

/**
 * Зимнее оформление сайта: снегопад в два плана и морозная дымка по углам экрана.
 *
 * Дальний снег и дымка лежат под контентом (`--lh-z-backdrop`), ближний снег —
 * над ним (`--lh-z-decor`), поэтому панели оказываются внутри снегопада,
 * а не под плоской плёнкой точек. Сугробы на кромках панелей рисует
 * глобальный стиль по классу `lh-winter-drifts` на `app-layout`.
 *
 * Включается флагом `environment.newYear`. Оформление декоративное:
 * скрыто от скринридеров и не перехватывает клики.
 */
@Component({
    selector: 'app-winter-decor',
    imports: [SnowfallDirective],
    templateUrl: './winter-decor.component.html',
    styleUrl: './winter-decor.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinterDecorComponent {
    /**
     * Настройки зимнего оформления из окружения.
     */
    protected readonly config = environment.newYear;
}
