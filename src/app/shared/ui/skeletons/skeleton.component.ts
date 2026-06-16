import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * Универсальный скелетон-заглушка.
 *
 * Отображает пульсирующий прямоугольник заданного размера и формы.
 */
@Component({
    selector: 'app-skeleton',
    standalone: true,
    template: `<div [class]="classes()"></div>`,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkeletonComponent {
    /**
     * Ширина скелетона.
     * Поддерживает значения Tailwind (full, 1/2, 24 и т.д.).
     */
    public readonly width = input<string>('full');

    /**
     * Высота скелетона.
     * Поддерживает значения Tailwind (4, 6, 10 и т.д.).
     */
    public readonly height = input<string>('4');

    /**
     * Флаг круглой формы.
     */
    public readonly circle = input<boolean>(false);

    /**
     * Радиус скругления.
     * Поддерживает значения Tailwind (none, sm, lg, xl, 2xl и т.д.).
     */
    public readonly rounded = input<string>('lg');

    /**
     * Дополнительные CSS-классы.
     */
    public readonly className = input<string>('');

    protected readonly classes = computed(() => {
        const widthClass = this.width().startsWith('w-') ? this.width() : `w-${this.width()}`;
        const heightClass = this.height().startsWith('h-') ? this.height() : `h-${this.height()}`;
        const roundedClass = this.circle()
            ? 'rounded-full'
            : this.rounded().startsWith('rounded')
              ? this.rounded()
              : `rounded-${this.rounded()}`;

        return `${widthClass} ${heightClass} ${roundedClass} bg-lh-primary-2/30 animate-pulse ${this.className()}`;
    });
}
