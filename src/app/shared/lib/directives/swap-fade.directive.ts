import { Directive, ElementRef, inject, NgZone } from '@angular/core';

/**
 * Кроссфейд точечной смены контента: `swap()` снимает клон текущего состояния
 * хоста и растворяет его поверх нового контента, пока живой узел проигрывает
 * вход. Карточка товара в магазине морфит картинкой и текстом вместо мигания.
 * Клон — голые узлы без слушателей; живёт 150ms и снимает себя по `animationend`.
 */
@Directive({
    selector: '[appSwapFade]',
    host: { class: 'lh-swap-host' },
})
export class SwapFadeDirective {
    private readonly elementRef = inject(ElementRef<HTMLElement>);

    /**
     * Зона Angular: клон и его выход живут вне change detection.
     */
    private readonly zone = inject(NgZone);

    /**
     * Закрепляет текущий контент растворяющимся клоном поверх хоста.
     * Вызывать до смены данных, чтобы клон снял старое состояние.
     */
    public swap(): void {
        // Вне зоны: классы входа и клон не дёргают change detection.
        this.zone.runOutsideAngular(() => {
            const host: HTMLElement = this.elementRef.nativeElement;

            // Быстрые клики подряд: прежний призрак ещё дорастворяется — снимаем.
            for (const stale of Array.from(host.querySelectorAll(':scope > .lh-swap-ghost'))) {
                stale.remove();
            }

            const ghost = host.cloneNode(true) as HTMLElement;

            // Идентификаторы снимаются: дубль id в DOM ломает якоря и aria-ссылки.
            for (const node of [ghost, ...Array.from(ghost.querySelectorAll('[id]'))]) {
                node.removeAttribute('id');
            }

            ghost.classList.remove('lh-swap-enter');
            ghost.classList.add('lh-swap-ghost');

            const onEnd = (event: AnimationEvent): void => {
                if (event.target === ghost && event.animationName === 'lh-swap-out') {
                    ghost.removeEventListener('animationend', onEnd);
                    ghost.remove();
                }
            };

            ghost.addEventListener('animationend', onEnd);

            // Предохранитель: если animationend потерян на брошенном кадре,
            // призрак не должен оставаться поверх витрины.
            setTimeout(() => ghost.remove(), 600);

            host.appendChild(ghost);

            // Вход живого узла заново: класс снимается, реflow, возвращается.
            host.classList.remove('lh-swap-enter');
            void host.offsetWidth;
            host.classList.add('lh-swap-enter');
        });
    }
}
