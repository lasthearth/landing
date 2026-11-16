import { ChangeDetectionStrategy, Component, HostListener, inject, input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '@core/config/environments/environment';

/**
 * ПРОТОТИП, НЕ ПРОДАКШН. Плавающая панель переключения вариантов макета.
 *
 * Живёт только в dev-сборке (`isDevMode`), чтобы случайный мерж прототипа
 * не показал панель пользователям. Удалить вместе с прототипом, когда
 * вариант выбран: см. `features/market/components/tabs-motion-prototype`.
 */
@Component({
    selector: 'app-prototype-switcher',
    standalone: true,
    templateUrl: './prototype-switcher.component.html',
    styleUrl: './prototype-switcher.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrototypeSwitcherComponent {
    /**
     * Ключи вариантов в порядке переключения, например `['A', 'B', 'C']`.
     */
    public readonly variants = input<string[]>([]);

    /**
     * Ключ текущего варианта.
     */
    public readonly current = input('');

    /**
     * Человекочитаемые имена вариантов по ключу.
     */
    public readonly names = input<Record<string, string>>({});

    /**
     * Признак dev-сборки: в проде панель не рисуется вовсе. Гейт по
     * `environment.production`, а не по isDevMode: нужен и на сервере.
     */
    protected readonly dev = !environment.production;

    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    /**
     * Листает варианты стрелками клавиатуры. Поля ввода не перехватывает.
     *
     * @param event Событие клавиши.
     */
    @HostListener('window:keydown', ['$event'])
    protected onKey(event: KeyboardEvent): void {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
            return;
        }

        const target = event.target as HTMLElement | null;

        if (target?.closest('input, textarea, select, [contenteditable]')) {
            return;
        }

        this.cycle(event.key === 'ArrowRight' ? 1 : -1);
    }

    /**
     * Переключает вариант с записью в адрес, чтобы ссылкой можно было
     * поделиться и вариант переживал перезагрузку.
     *
     * @param delta Шаг по списку вариантов, со знаком.
     */
    protected cycle(delta: number): void {
        const list = this.variants();

        if (list.length === 0) {
            return;
        }

        const at = Math.max(0, list.indexOf(this.current()));
        const next = list[(at + delta + list.length) % list.length];

        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { variant: next },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }
}
