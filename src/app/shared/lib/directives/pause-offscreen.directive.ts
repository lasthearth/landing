import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/**
 * Ставит CSS-анимации элемента на паузу, пока он вне экрана.
 *
 * Вешает на хост класс `lh-offscreen`, когда элемент не пересекается
 * с вьюпортом; глобальное правило в `styles.css` останавливает
 * `animation-play-state` у хоста и всех потомков. Используется
 * для анимированной косметики игрока (рамки, баннеры): эффекты
 * сохраняются, но не тратят ресурсы в списках и за пределами экрана.
 */
@Directive({
    selector: '[appPauseOffscreen]',
    standalone: true,
})
export class PauseOffscreenDirective implements OnInit, OnDestroy {
    /**
     * Ссылка на DOM-элемент хоста.
     */
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Наблюдатель пересечения с вьюпортом. На сервере не создаётся.
     */
    private observer?: IntersectionObserver;

    /**
     * Запускает наблюдение за видимостью элемента.
     */
    public ngOnInit(): void {
        if (typeof IntersectionObserver === 'undefined') {
            return;
        }

        const element = this.elementRef.nativeElement;

        this.observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                element.classList.toggle('lh-offscreen', !entry.isIntersecting);
            }
        });
        this.observer.observe(element);
    }

    /**
     * Останавливает наблюдение при уничтожении хоста.
     */
    public ngOnDestroy(): void {
        this.observer?.disconnect();
    }
}
