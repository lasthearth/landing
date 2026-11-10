import { isPlatformBrowser } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input, numberAttribute, PLATFORM_ID } from '@angular/core';
import { motionBlur, type MotionBlur } from '@web-kits/motion-blur';

/**
 * Шлейф движения (motion blur) для летящего элемента.
 *
 * Оборачивает `motionBlur()` из `@web-kits/motion-blur`: пакет следит за
 * `transform` хоста, пока на нём идут transition или animation, и рисует
 * шлейф приёмником Echo (копии слоя вдоль пути). В покое подписок на кадры
 * нет — пакет слушает только `transitionrun`/`animationstart`, поэтому цена
 * появляется лишь на время движения. Подходит для слабых машин.
 *
 * Требования к разметке (правила пакета):
 * - хост прозрачен: фон, рамка, тень и скругление — на первом
 *   элементе-потомке (слое) или внутри него;
 * - слой не имеет собственного `transform` — техники пакета пишут его сами;
 * - содержимое слоя при `squeeze()`/`svg()` сворачивается в один узел:
 *   эти техники поворачивают слой и потомка в разные стороны.
 *
 * `prefers-reduced-motion: reduce` отключает шлейф автоматически
 * (режим `"user"` по умолчанию), переопределять не нужно.
 *
 * Использование: `<div appMotionBlur><div class="bg-… border-…">…</div></div>`.
 */
@Directive({
    selector: '[appMotionBlur]',
    standalone: true,
})
export class MotionBlurDirective implements AfterViewInit, OnDestroy {
    /**
     * Угол затвора в градусах: 180 — шлейф на половину пути кадра,
     * 360 — на весь путь. Больше 360 замедляет демонстрации, сохраняя
     * шлейф полной скорости.
     */
    public readonly appMotionBlurShutter = input(180, { transform: numberAttribute });

    /**
     * Ссылка на DOM-элемент хоста.
     */
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Признак браузерного окружения: на сервере пакет не запускается.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Экземпляр blur, создаётся в `ngAfterViewInit` после появления потомков.
     */
    private blur?: MotionBlur;

    /**
     * @inheritdoc
     */
    public ngAfterViewInit(): void {
        if (!this.isBrowser) {
            return;
        }

        // Слой пакета — первый потомок хоста: `ngAfterViewInit` директивы
        // выполняется после полной инициализации содержащего её вью,
        // поэтому статичные потомки хоста к этому моменту существуют.
        // Динамические (*ngIf) потомки требуют слоя к моменту первого
        // движения — такие разметки здесь не используются.
        this.blur = motionBlur(this.elementRef.nativeElement, {
            shutter: this.appMotionBlurShutter(),
        });
    }

    /**
     * Освобождает слушатели пакета при уничтожении хоста.
     */
    public ngOnDestroy(): void {
        this.blur?.destroy();
    }
}
