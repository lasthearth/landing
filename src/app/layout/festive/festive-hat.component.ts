import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Новогодняя шапка с помпоном: надевается на эмблему в шапке сайта.
 *
 * Сама себя не позиционирует: место и наклон задаёт родитель
 * (вензель шапки), компонент только рисует SVG во всю свою ширину.
 * Декоративная: скрыта от скринридеров и не перехватывает клики.
 */
@Component({
    selector: 'app-festive-hat',
    templateUrl: './festive-hat.component.html',
    styleUrl: './festive-hat.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FestiveHatComponent {}
