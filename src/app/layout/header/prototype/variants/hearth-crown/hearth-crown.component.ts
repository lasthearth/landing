/**
 * Вариант шапки «Очаг и корона».
 *
 * Композиция двух принятых решений без копирования их разметки: компонент
 * «Корона» отвечает за телеметрию, вензель, навигацию и шторки, а этот
 * компонент добавляет к ней тёмный зал, линию жара, ореол и опускающиеся
 * угли из «Врат очага». Поэтому состояние и поведение меню у обеих версий
 * совпадают и не расходятся при дальнейших правках «Короны».
 *
 * Движение только на CSS. При `prefers-reduced-motion` циклы остановлены
 * в видимом состоянии, ничего не спрятано; «Корона» применяет свой покой
 * самостоятельно. Шапка не липкая, как у двух исходных вариантов.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CrownComponent } from '../crown/crown.component';

@Component({
    standalone: true,
    selector: 'app-header-hearth-crown',
    imports: [CrownComponent],
    templateUrl: './hearth-crown.component.html',
    styleUrl: './hearth-crown.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HearthCrownComponent {}
