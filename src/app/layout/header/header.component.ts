/**
 * Боевая шапка «Очаг и корона».
 *
 * Композиция из двух частей: содержание (телеметрия, вензель, навигация
 * и шторки) рисует дочерний {@link CrownComponent}, а этот компонент
 * добавляет к ней тёмный зал, линию жара, ореол и опускающиеся угли.
 * Такое деление держит состояние меню в одном месте: правки «Короны»
 * попадают в шапку целиком, слои жара о ней не знают.
 *
 * Движение только на CSS. При `prefers-reduced-motion` циклы остановлены
 * в видимом состоянии, ничего не спрятано; «Корона» применяет свой покой
 * самостоятельно. Шапка не липкая.
 *
 * {@link HeaderState} объявлен здесь: и «Корона», и её будущие соседи по
 * шапке берут один экземпляр сервиса.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HeaderState } from './header-state.service';
import { CrownComponent } from './crown/crown.component';

@Component({
    selector: 'app-header',
    imports: [CrownComponent],
    providers: [HeaderState],
    templateUrl: './header.component.html',
    styleUrl: './header.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {}
