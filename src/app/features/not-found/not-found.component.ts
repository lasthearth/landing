import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    NgZone,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TuiIcon } from '@taiga-ui/core';
import { TranslatePipe } from '@core/i18n';

/**
 * Страница "Не найдено" (404).
 * Отображается при переходе по несуществующему маршруту.
 *
 * Оформлена как атмосферная ночная сцена в стиле проекта: заблудившийся
 * путник ищет последний очаг в темноте. Поверх тёмного фона поднимаются
 * тлеющие угли, в центре мерцает пламя очага, а свет факела следует за
 * курсором, «освещая» сцену — единственная интерактивная часть.
 */
@Component({
    standalone: true,
    selector: 'app-not-found',
    imports: [RouterLink, TranslatePipe, TuiIcon],
    templateUrl: './not-found.component.html',
    styleUrl: './not-found.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
    /**
     * Количество тлеющих углей в сцене.
     * Разброс, задержка и длительность анимации каждого задаются в LESS
     * через `:nth-child` — здесь важно только их число для `@for`.
     */
    protected readonly embers = Array.from({ length: 14 });

    /**
     * Корневой элемент компонента.
     * По нему считается положение курсора для свечения факела.
     */
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Зона Angular.
     * Слушатель `pointermove` вешается вне зоны: он только пишет
     * CSS-переменные и не должен запускать проверку изменений на каждом
     * движении мыши.
     */
    private readonly zone = inject(NgZone);

    /**
     * Регистрирует слушатель движения курсора в браузере.
     * `afterNextRender` гарантирует, что код не выполнится в SSR, где нет
     * ни DOM, ни указателя. Слушатель обновляет позицию свечения факела
     * через CSS-переменные `--torch-x` / `--torch-y` и снимается при
     * уничтожении компонента.
     */
    constructor() {
        const destroyRef = inject(DestroyRef);

        afterNextRender(() => {
            const element = this.host.nativeElement;

            /**
             * Переносит центр свечения факела под курсор.
             * @param event Событие движения указателя.
             */
            const onPointerMove = (event: PointerEvent): void => {
                const rect = element.getBoundingClientRect();
                element.style.setProperty('--torch-x', `${event.clientX - rect.left}px`);
                element.style.setProperty('--torch-y', `${event.clientY - rect.top}px`);
            };

            this.zone.runOutsideAngular(() =>
                element.addEventListener('pointermove', onPointerMove, { passive: true })
            );

            destroyRef.onDestroy(() => element.removeEventListener('pointermove', onPointerMove));
        });
    }
}
