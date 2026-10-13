import { Observable } from 'rxjs';

/**
 * Выдаёт одно значение, когда браузер освободится, и завершается.
 *
 * Нужна для фоновой работы, которая не должна спорить за сеть и главный поток
 * с первым экраном. `requestIdleCallback` есть не во всех браузерах, поэтому
 * запасной вариант — `setTimeout` с тем же пределом: без него на занятой
 * странице фоновая работа не стартовала бы вовсе.
 *
 * Только для браузера: на сервере (SSR и пререндер) `window` отсутствует,
 * поэтому вызывающий код обязан сначала проверить платформу.
 *
 * @param timeoutMs Предел ожидания в миллисекундах: по его истечении значение приходит в любом случае.
 * @returns Поток, который выдаёт одно значение и завершается.
 */
export function whenIdle(timeoutMs: number): Observable<void> {
    return new Observable<void>((subscriber) => {
        let fired = false;

        const run = (): void => {
            if (fired) {
                return;
            }

            fired = true;
            subscriber.next();
            subscriber.complete();
        };

        if (typeof requestIdleCallback === 'function') {
            const handle = requestIdleCallback(run, { timeout: timeoutMs });

            return () => cancelIdleCallback(handle);
        }

        const timer = window.setTimeout(run, timeoutMs);

        return () => window.clearTimeout(timer);
    });
}
