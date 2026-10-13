import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DonateService } from '@entities/donate';
import { whenIdle } from '@shared/lib/when-idle.function';
import { catchError, EMPTY, switchMap, take } from 'rxjs';

/** Предел ожидания окна простоя перед запросом товаров, мс. */
const PREFETCH_IDLE_TIMEOUT_MS = 4000;

/**
 * Заранее запрашивает список товаров магазина.
 *
 * Пререндер кладёт в HTML `/market` только разметку: в `ng-state` товаров нет,
 * поэтому сетка показывала скелетон, пока браузер не получит ответ
 * `/donate/shop/items`. Ответ кэшируется в `DonateService` на всю сессию, так
 * что один тихий запрос в простое убирает это ожидание при открытии страницы.
 *
 * Запуск — из `LayoutComponent` через `afterNextRender`: запрос не должен
 * соревноваться с первым экраном. Ошибка прогрева молчит и не портит кэш —
 * страницу магазин отрисует как обычно, своим запросом. Повторные вызовы
 * `start()` игнорируются.
 */
@Injectable({ providedIn: 'root' })
export class ShopPrefetchService {
    /**
     * Сервис донат-магазина: держит кэш списка товаров.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Идентификатор платформы: на сервере прогрев не запускается.
     */
    private readonly platformId = inject(PLATFORM_ID);

    /**
     * Признак того, что прогрев уже поставлен в очередь.
     */
    private started = false;

    /**
     * Ставит запрос списка товаров в очередь простоя браузера.
     */
    public start(): void {
        if (this.started || !isPlatformBrowser(this.platformId)) {
            return;
        }

        this.started = true;

        whenIdle(PREFETCH_IDLE_TIMEOUT_MS)
            .pipe(
                switchMap(() => this.donateService.prefetchShopItems$()),
                take(1),
                catchError(() => EMPTY)
            )
            .subscribe();
    }
}
