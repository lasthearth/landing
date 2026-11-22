import { ChangeDetectionStrategy, Component } from '@angular/core';
import { environment } from '@core/config/environments/environment';
import { SnowfallDirective } from './snowfall.directive';

/**
 * Число звеньев гирлянды. Звено — 72px, поэтому гирлянда
 * закрывает экран шириной до 2880px; лишнее обрезает контейнер.
 */
const GARLAND_LINKS = 40;

/**
 * Новогоднее оформление сайта: гирлянда по верхней кромке страницы и снегопад.
 *
 * Включается флагом `environment.newYear`: `enabled` выключает оформление
 * целиком, `snow` и `garland` — отдельные части. Оформление чисто декоративное:
 * скрыто от скринридеров и не перехватывает клики.
 */
@Component({
    selector: 'app-festive-decor',
    imports: [SnowfallDirective],
    templateUrl: './festive-decor.component.html',
    styleUrl: './festive-decor.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FestiveDecorComponent {
    /**
     * Настройки новогоднего оформления из окружения.
     */
    protected readonly config = environment.newYear;

    /**
     * Порядковые номера звеньев гирлянды: от номера зависит цвет лампы.
     */
    protected readonly links: number[] = Array.from({ length: GARLAND_LINKS }, (_, index) => index);
}
