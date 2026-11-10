import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, OnDestroy, afterNextRender, inject, PLATFORM_ID, NgZone } from '@angular/core';

/**
 * Позиция и размер плашки: отступ слева в системе координат паддинг-бокса
 * ряда вкладок и ширина, px.
 */
interface PillBox {
    x: number;
    w: number;
}

/**
 * Летающая плашка активной вкладки для ряда `[role='tablist']`.
 *
 * Вставляет в ряд прозрачный элемент-носитель с визуальным слоем-потомком
 * (требования `@web-kits/motion-blur`) и держит его на вкладке с
 * `aria-selected='true'`. При смене вкладки директива пишет новую позицию
 * в inline-стиль, а полёт делает CSS-переход на самой плашке:
 * 200ms (`--lh-dur-fast`) по кривой `--lh-ease-smooth` (вход панелей —
 * быстрый старт без рывка и длинное торможение). Перехват посреди
 * полёта браузер берёт на себя: переходы переносят цель с текущей
 * визуальной позиции, без событий и без стека анимаций.
 *
 * Шлейф движения здесь НЕ ставится — и это осознанно: blur положен
 * движению, которое глаз не успевает отследить (закрытие лайтбокса),
 * а за плашкой вкладки глаз идёт напрямую. Проба с Echo на летящей
 * плашке дала ровно то, что запрещает skill: на пропущенных кадрах
 * копии экстраполировались за края ряда, несли устаревшую ширину
 * и дёргали визуальный слой — «прыжки» и фантомные размеры.
 *
 * Подсветку активной кнопки плашка берёт на себя: класс `is-ready` на ряду
 * гасит заливку самой кнопки в глобальных стилях. До готовности (SSR,
 * нет JS) кнопка подсвечивается собой — пререндер не меняется.
 *
 * Смена отслеживается через `aria-selected`, поэтому работает при любом
 * способе выбора: клик, клавиатура, программно. `prefers-reduced-motion`
 * переносит плашку мгновенно (глобальный kill-switch сжимает переход),
 * шлейф пакет снимает сам.
 *
 * Первый вариант полёта был на WAAPI с fill:'forwards' и полагался на
 * событие finish: у части полётов оно не приходило (inline оставался
 * устаревшим), часы анимации замерзали на перелёте пружины, а закрытые
 * fill-анимации копились в стеке — плашка дрейфовала. Переход не имеет
 * жизненного цикла, который можно сломать: что написано в inline,
 * то и видно.
 *
 * Использование: `<div class="lh-chips" role="tablist" appTabsPill>`.
 */
@Directive({
    selector: '[appTabsPill]',
    standalone: true,
})
export class TabsPillDirective implements OnDestroy {
    /**
     * Ссылка на DOM-элемент ряда вкладок.
     */
    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Признак браузерного окружения: на сервере плашка не создаётся.
     */
    private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

    /**
     * Запрос prefers-reduced-motion; на сервере не создаётся.
     */
    private readonly reducedMotion = this.isBrowser
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    /**
     * Зона Angular: плашка, её переходы и шлейф живут вне зоны — иначе
     * каждый кадр полёта дёргал бы change detection всего приложения.
     */
    private readonly zone = inject(NgZone);

    /**
     * Носитель плашки: абсолют в паддинг-боксе ряда, несёт transform
     * и ширину полёта в inline-стилях.
     */
    private pill?: HTMLElement;

    /**
     * Наблюдатель смены активной вкладки (атрибут `aria-selected`).
     */
    private selection?: MutationObserver;

    /**
     * Наблюдатель изменения размеров ряда: переносит плашку
     * без анимации при ресайзе и подгрузке шрифтов.
     */
    private resize?: ResizeObserver;

    /**
     * Создаёт плашку и наблюдателей после первой отрисовки ряда:
     * к этому моменту кнопки уже имеют реальные размеры.
     */
    private readonly mount = afterNextRender(() =>
        this.zone.runOutsideAngular(() => {
            const host = this.elementRef.nativeElement;

            host.classList.add('lh-tabs-pill');

            const pill = document.createElement('span');
            pill.className = 'lh-tabs-pill__el';
            pill.setAttribute('aria-hidden', 'true');

            const face = document.createElement('span');
            face.className = 'lh-tabs-pill__face';
            pill.appendChild(face);

            host.prepend(pill);
            this.pill = pill;

            this.selection = new MutationObserver(() => this.syncSelection(true));
            this.selection.observe(host, { attributeFilter: ['aria-selected'], subtree: true });

            this.resize = new ResizeObserver(() => this.syncSelection(false));
            this.resize.observe(host);

            this.syncSelection(false);
        }),
    );

    /**
     * @inheritdoc
     */
    public ngOnDestroy(): void {
        this.selection?.disconnect();
        this.resize?.disconnect();
        this.pill?.remove();
    }

    /**
     * Немедленно отправляет плашку к указанной кнопке, не дожидаясь
     * смены `aria-selected`. Нужно, чтобы визуальный отклик на клик
     * ушёл в первый же кадр: тяжёлая смена панелей выполняется позже,
     * и без этого первый кадр полёта задерживался бы её раскладкой.
     *
     * @param button Кнопка вкладки, к которой лететь.
     */
    public flyToButton(button: HTMLElement): void {
        if (!this.pill) {
            return;
        }

        this.commit(this.measure(button));
        this.elementRef.nativeElement.classList.add('is-ready');
    }

    /**
     * Ставит плашку на активную вкладку: переходом или мгновенно.
     *
     * @param animate Ехать переходом; иначе перенести без движения.
     */
    private syncSelection(animate: boolean): void {
        const host = this.elementRef.nativeElement;
        const active = Array.from(host.querySelectorAll<HTMLElement>('[role="tab"]')).find(
            (button) => button.getAttribute('aria-selected') === 'true',
        );

        if (!active || !this.pill) {
            return;
        }

        const target = this.measure(active);

        // Мгновенно: первый показ, ресайз ряда, отключённое движение.
        if (!animate || this.reducedMotion?.matches) {
            this.commit(target, true);
            host.classList.add('is-ready');

            return;
        }

        this.commit(target);
        host.classList.add('is-ready');
    }

    /**
     * Измеряет кнопку в координатах раскладки ряда — той же системы,
     * в которой живёт inline-стиль плашки.
     *
     * Только offsetLeft/offsetWidth: getBoundingClientRect возвращает
     * масштабированные зумом страницы пиксели, и запись их в inline-стиль
     * сдвигала плашку на (зум − 1) × путь при каждой посадке — на зуме
     * ≠ 100% она дрейфовала на кнопку за несколько переключений.
     * offsetLeft заодно не видит ховер-надж кнопки: transform не влияет
     * на раскладку, вычитать его не нужно. Разность с offsetLeft плашки
     * отсекает начало координат ряда: оба — потомки одного offsetParent.
     *
     * @param button Кнопка активной вкладки.
     * @returns Позиция и ширина, px раскладки.
     */
    private measure(button: HTMLElement): PillBox {
        const pill = this.pill;

        if (!pill) {
            return { x: 0, w: 0 };
        }

        return {
            x: button.offsetLeft - pill.offsetLeft,
            w: button.offsetWidth,
        };
    }

    /**
     * Фиксирует плашку на позиции inline-стилем. С классом `is-placed`
     * изменение едет CSS-переходом (кривая и длительность — в стилях),
     * без него встаёт сразу: первая установка не должна прокатываться
     * от левого края ряда.
     *
     * @param box Позиция и ширина, px.
     * @param immediate Встать без перехода.
     */
    private commit(box: PillBox, immediate = false): void {
        const pill = this.pill;

        if (!pill) {
            return;
        }

        if (immediate) {
            pill.classList.remove('is-placed');
        }

        pill.style.transform = `translateX(${box.x}px)`;
        pill.style.width = `${box.w}px`;

        if (immediate) {
            // Класс возвращается после кадра установки: иначе первая
            // позиция прокатилась бы переходом от левого края ряда.
            requestAnimationFrame(() => pill.classList.add('is-placed'));
        }
    }
}
