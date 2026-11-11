import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output } from '@angular/core';
import { FooterVariantId, FooterVariantOption } from './model/footer-variant.model';

/**
 * Плавающая пилюля-переключатель вариантов подвала.
 *
 * Листает варианты стрелками и клавишами `←` `→`, по `Esc` и крестику
 * возвращает боевой подвал. Клавиши не перехватываются, когда фокус
 * в поле ввода. Подписи — литералы прототипа, в словарь не попадают.
 */
@Component({
    standalone: true,
    selector: 'app-footer-prototype-switcher',
    templateUrl: './footer-prototype-switcher.component.html',
    styleUrl: './footer-prototype-switcher.component.less',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterPrototypeSwitcherComponent {
    /**
     * Варианты в порядке переключения.
     */
    public readonly variants = input.required<readonly FooterVariantOption[]>();

    /**
     * Текущий вариант; `null` — боевой подвал.
     */
    public readonly activeId = input.required<FooterVariantId | null>();

    /**
     * Выбор варианта; `null` — вернуться к боевому подвалу.
     */
    public readonly pick = output<FooterVariantId | null>();

    /**
     * Подпись пилюли: название варианта и его позиция в списке.
     */
    protected readonly label = computed(() => {
        const list = this.variants();
        const index = list.findIndex((variant) => variant.id === this.activeId());

        if (index < 0) {
            return 'Боевой подвал';
        }

        return `Подвал: ${list[index]?.title ?? ''} · ${index + 1}/${list.length}`;
    });

    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        // Пилюля рендерится только в браузере, но слушатель снимаем явно.
        window.addEventListener('keydown', this.onKeydown);
        this.destroyRef.onDestroy(() => window.removeEventListener('keydown', this.onKeydown));
    }

    /**
     * Листает варианты на шаг вперёд или назад.
     *
     * @param direction 1 — следующий вариант, -1 — предыдущий.
     */
    protected step(direction: 1 | -1): void {
        const list = this.variants();

        if (list.length === 0) {
            return;
        }

        const index = list.findIndex((variant) => variant.id === this.activeId());
        const base = index < 0 ? (direction > 0 ? -1 : 0) : index;
        const next = (base + direction + list.length) % list.length;

        this.pick.emit(list[next]?.id ?? null);
    }

    /**
     * Возвращает боевой подвал.
     */
    protected close(): void {
        this.pick.emit(null);
    }

    /**
     * Обработчик клавиатуры: `←` `→` листают варианты, `Esc` закрывает прототип.
     * Поля ввода сохраняют клавиши себе.
     */
    private readonly onKeydown = (event: KeyboardEvent): void => {
        if (this.isTypingTarget(event.target)) {
            return;
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.step(-1);

            return;
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.step(1);

            return;
        }

        if (event.key === 'Escape') {
            this.close();
        }
    };

    /**
     * Проверяет, что событие пришло из поля ввода.
     *
     * @param target Цель клавиатурного события.
     * @returns true, когда перехватывать клавишу нельзя.
     */
    private isTypingTarget(target: EventTarget | null): boolean {
        if (!(target instanceof HTMLElement)) {
            return false;
        }

        const tag = target.tagName;

        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
    }
}
