import { Directive, ElementRef, OnDestroy, OnInit, inject, numberAttribute, input } from '@angular/core';

/**
 * Появление элемента при входе во вьюпорт.
 *
 * Навешивает класс `lh-reveal` (стартовое состояние — сдвиг и прозрачность)
 * и добавляет `is-visible` при пересечении. Наблюдатель отключается после
 * первого срабатывания: повторное исчезновение при обратной прокрутке
 * читается как мигание.
 *
 * `prefers-reduced-motion` обрабатывается в CSS, а не здесь: медиазапрос
 * реагирует на смену системной настройки без перезагрузки страницы.
 *
 * Использование: `<section appReveal>` или `<div appReveal [appRevealDelay]="150">`.
 */
@Directive({
    selector: '[appReveal]',
    standalone: true,
    host: {
        class: 'lh-reveal',
    },
})
export class RevealDirective implements OnInit, OnDestroy {
    /**
     * Задержка появления в миллисекундах.
     * Нужна для каскада внутри одной секции: элементы получают разный
     * `transition-delay`, а не разные анимации.
     */
    public readonly appRevealDelay = input(0, { transform: numberAttribute });

    /**
     * Доля видимости элемента (0..1), при которой запускается появление.
     * Для высоких блоков стоит занижать: секция на весь экран никогда
     * не пересечёт вьюпорт на 12%.
     */
    public readonly appRevealThreshold = input(0.12, { transform: numberAttribute });

    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    private observer?: IntersectionObserver;

    /** @inheritdoc */
    public ngOnInit(): void {
        const element = this.elementRef.nativeElement;

        element.style.setProperty('--lh-reveal-delay', `${this.appRevealDelay()}ms`);

        // На сервере IntersectionObserver отсутствует. Пререндер обязан
        // отдавать видимый контент: иначе страница без JS остаётся пустой.
        if (typeof IntersectionObserver === 'undefined') {
            element.classList.add('is-visible');

            return;
        }

        // Гидратация предрендеренной страницы: класс уже стоит в разметке.
        // Элементы ниже сгиба возвращаются в скрытое состояние, чтобы
        // отыграть появление при прокрутке. Видимые сейчас не трогаем —
        // сброс уже нарисованного блока дал бы мигание.
        if (element.classList.contains('is-visible')) {
            if (element.getBoundingClientRect().top < window.innerHeight) {
                return;
            }

            element.classList.remove('is-visible');
        }

        this.observer = new IntersectionObserver(
            (entries) => {
                if (!entries.some((entry) => entry.isIntersecting)) {
                    return;
                }

                element.classList.add('is-visible');
                this.observer?.disconnect();
            },
            { threshold: this.appRevealThreshold() },
        );

        this.observer.observe(element);
    }

    /** @inheritdoc */
    public ngOnDestroy(): void {
        this.observer?.disconnect();
    }
}
