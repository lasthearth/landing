import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, NgZone, OnDestroy, afterNextRender, inject, PLATFORM_ID } from '@angular/core';
import { motionBlur, type MotionBlur } from '@web-kits/motion-blur';

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
 * `aria-selected='true'`. При смене вкладки плашка перелетает на новое
 * место одним непрерывным движением: 200ms (`--lh-dur-fast`), кривая
 * `--lh-ease-spring` с перелётом у цели и посадкой. Полёт длинный
 * и быстрый (~10px за кадр), поэтому шлейф движения (Echo) реально
 * рисуется — это первое место в проекте, где blur проходит порог
 * заметности.
 *
 * Подсветку активной кнопки плашка берёт на себя: класс `is-ready` на ряду
 * гасит заливку самой кнопки в глобальных стилях. До готовности (SSR,
 * нет JS) кнопка подсвечивается собой — пререндер не меняется.
 *
 * Смена отслеживается через `aria-selected`, поэтому работает при любом
 * способе выбора: клик, клавиатура, программно. `prefers-reduced-motion`
 * выключает полёт: плашка переносится мгновенно, шлейф пакет снимает сам.
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
     * Зона Angular: полёт и шлейф выполняются вне зоны — иначе rAF пакета
     * и слушатели анимации дёргали бы change detection каждый кадр полёта.
     */
    private readonly zone = inject(NgZone);

    /**
     * Прозрачный носитель плашки: несёт transform полёта, шлейф
     * рисуется по нему.
     */
    private pill?: HTMLElement;

    /**
     * Экземпляр шлейфа движения для носителя.
     */
    private blur?: MotionBlur;

    /**
     * Текущий полёт плашки, если идёт.
     */
    private flight?: Animation;

    /**
     * Последняя позиция плашки, px.
     */
    private current: PillBox = { x: 0, w: 0 };

    /**
     * Длительность полёта, ms, из токена `--lh-dur-fast`.
     */
    private durationMs = 200;

    /**
     * Кривая приземления, из токена `--lh-ease-spring`.
     */
    private easeSpring = 'cubic-bezier(0.34, 1.4, 0.64, 1)';

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
            this.blur = motionBlur(pill);
            this.readTokens();

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
        this.flight?.cancel();
        this.selection?.disconnect();
        this.resize?.disconnect();
        this.blur?.destroy();
        this.pill?.remove();
    }

    /**
     * Ставит плашку на активную вкладку: с полётом или мгновенно.
     *
     * @param animate Запустить полёт; иначе перенести без движения.
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

        if (!animate || this.reducedMotion?.matches) {
            this.commit(target);
            host.classList.add('is-ready');
            this.current = target;

            return;
        }

        this.flyTo(target);
        host.classList.add('is-ready');
    }

    /**
     * Измеряет кнопку в координатах паддинг-бокса ряда — той же системы,
     * в которой живёт абсолютно позиционированная плашка.
     *
     * @param button Кнопка активной вкладки.
     * @returns Позиция и ширина, px.
     */
    private measure(button: HTMLElement): PillBox {
        const host = this.elementRef.nativeElement;
        const hostRect = host.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();

        return {
            x: buttonRect.left - hostRect.left - host.clientLeft,
            w: buttonRect.width,
        };
    }

    /**
     * Запускает полёт плашки к цели одним непрерывным движением: пружина
     * разгоняет, даёт лёгкий перелёт у цели и посадку обратно.
     * Промежуточных кейфреймов нет: любая «середина» с собственной кривой
     * гасила скорость до нуля ровно на центральной вкладке ряда — плашка
     * замирала на ней и заново разгонялась. Прерванный полёт продолжается
     * из текущей позиции — считается вычисленным стилем.
     *
     * @param target Позиция и ширина активной вкладки.
     */
    private flyTo(target: PillBox): void {
        const pill = this.pill;

        if (!pill) {
            return;
        }

        // Позиция читается до cancel: после него вычисленный стиль
        // откатывается к inline, и перехват полёта сработал бы со скачком.
        const from = this.readBox();

        this.flight?.cancel();

        this.flight = pill.animate(
            [
                {
                    transform: `translateX(${from.x}px)`,
                    width: `${from.w}px`,
                },
                {
                    transform: `translateX(${target.x}px)`,
                    width: `${target.w}px`,
                },
            ],
            { duration: this.durationMs, easing: this.easeSpring, fill: 'forwards' },
        );

        this.current = target;
        this.flight.addEventListener('finish', () => this.commit(target));
    }

    /**
     * Читает текущее визуальное положение плашки из вычисленного стиля:
     * во время полёта — из WAAPI, после — из inline-стилей.
     *
     * @returns Позиция и ширина, px.
     */
    private readBox(): PillBox {
        const pill = this.pill;

        if (!pill) {
            return this.current;
        }

        const style = getComputedStyle(pill);
        const matrix = new DOMMatrixReadOnly(style.transform === 'none' ? undefined : style.transform);

        return { x: matrix.m41, w: parseFloat(style.width) };
    }

    /**
     * Фиксирует плашку на позиции inline-стилем — видимое состояние
     * без полёта.
     *
     * @param box Позиция и ширина, px.
     */
    private commit(box: PillBox): void {
        if (!this.pill) {
            return;
        }

        this.pill.style.transform = `translateX(${box.x}px)`;
        this.pill.style.width = `${box.w}px`;
    }

    /**
     * Читает длительность и кривые полёта из токенов дизайн-системы,
     * чтобы движение осталось управляемым из одного места.
     */
    private readTokens(): void {
        const style = getComputedStyle(this.elementRef.nativeElement);
        const rawDuration = style.getPropertyValue('--lh-dur-fast').trim() || '200ms';
        const parsed = Number.parseFloat(rawDuration);
        const seconds = rawDuration.includes('s') && !rawDuration.includes('ms');

        this.durationMs = (Number.isNaN(parsed) ? 200 : seconds ? parsed * 1000 : parsed);
        this.easeSpring = style.getPropertyValue('--lh-ease-spring').trim() || this.easeSpring;
    }
}
