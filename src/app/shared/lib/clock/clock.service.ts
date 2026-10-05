import { DestroyRef, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Текущее время, обновляемое раз в минуту.
 *
 * Нужен для «живых» подписей вида «5 минут назад»: компоненты читают
 * сигнал `now`, и подпись пересчитывается без перезагрузки страницы.
 * При возврате на вкладку время обновляется сразу.
 *
 * На сервере таймер не запускается: он не дал бы пререндеру завершиться.
 */
@Injectable({ providedIn: 'root' })
export class ClockService {
    /**
     * Период обновления, мс.
     */
    private static readonly TICK_MS = 60_000;

    /**
     * Внутреннее состояние текущего времени.
     */
    private readonly nowState = signal(Date.now());

    /**
     * Текущее время в миллисекундах (только чтение).
     */
    public readonly now = this.nowState.asReadonly();

    public constructor() {
        if (!isPlatformBrowser(inject(PLATFORM_ID))) {
            return;
        }

        const tick = (): void => this.nowState.set(Date.now());
        const onVisibilityChange = (): void => {
            if (document.visibilityState === 'visible') {
                tick();
            }
        };

        const intervalId = setInterval(tick, ClockService.TICK_MS);
        document.addEventListener('visibilitychange', onVisibilityChange);

        inject(DestroyRef).onDestroy(() => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', onVisibilityChange);
        });
    }
}
