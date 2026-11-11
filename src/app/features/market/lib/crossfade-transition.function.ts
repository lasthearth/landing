import { NgZone } from '@angular/core';

/**
 * Обновляет витрину внутри document view transition: браузер снимает старые
 * снимки именованных элементов (`view-transition-name` в LESS компонента),
 * применяет обновление и морфит старое состояние в новое — картинку в
 * картинку, текст в текст. Панель-обёртка без имени не мигает целиком.
 *
 * Фолбэк: без API (старые браузеры) или при `prefers-reduced-motion`
 * обновление применяется сразу, без анимации — морфинг не блокирует покупку.
 *
 * Снимок «нового» состояния делается сразу после колбэка, поэтому
 * `update` обязан обновить DOM синхронно: состояние + `detectChanges`.
 *
 * @param zone Зона Angular: колбэк браузера выполняется вне зоны.
 * @param update Синхронное обновление состояния компонента.
 */
export function crossfadeUpdate(zone: NgZone, update: () => void): void {
    const documentWithTransition = document as Document & {
        startViewTransition?: (callback: () => void) => unknown;
    };

    const reduced =
        typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduced || typeof documentWithTransition.startViewTransition !== 'function') {
        zone.run(update);
        return;
    }

    documentWithTransition.startViewTransition(() => zone.run(update));
}
