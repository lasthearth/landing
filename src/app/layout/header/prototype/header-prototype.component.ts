import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    inject,
    PLATFORM_ID,
    signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '@core/config/environments/environment';
import { HeaderComponent } from '../header.component';
import { HeaderState } from '../header-state.service';
import { HEADER_PROTOTYPE_VARIANTS } from './config/header-prototype-variants.constant';
import { HeaderVariantId, HeaderVariantOption } from './model/header-variant.model';
import { HeaderPrototypeSwitcherComponent } from './header-prototype-switcher.component';
import { HearthGateComponent } from './variants/hearth-gate/hearth-gate.component';
import { RailComponent } from './variants/rail/rail.component';
import { HudComponent } from './variants/hud/hud.component';
import { CrownComponent } from './variants/crown/crown.component';
import { DeckComponent } from './variants/deck/deck.component';
import { MorphComponent } from './variants/morph/morph.component';

/** Имя параметра адреса, включающего вариант прототипа. */
const VARIANT_QUERY_PARAM = 'hvariant';

/**
 * Хост прототипа шапки.
 *
 * Читает параметр `?hvariant=` и рисует выбранный вариант вместо боевого
 * `<app-header />`; без параметра рисуется боевая шапка. Начальный серверный
 * рендер всегда боевой: вариант подставляется после гидратации, чтобы не
 * расходиться с разметкой пререндера. Пилюля-переключатель скрыта в production.
 *
 * Данные шапки живут в {@link HeaderState} из провайдеров хоста: вариант
 * берёт тот же сервис, что и боевая шапка, поэтому телеметрия, блок игрока
 * и списки меню не дублируются. Боевая шапка объявляет `HeaderState` в своих
 * провайдерах и держит свой экземпляр, так что двух живых копий не бывает.
 */
@Component({
    standalone: true,
    selector: 'app-header-prototype',
    imports: [
        HeaderComponent,
        HeaderPrototypeSwitcherComponent,
        HearthGateComponent,
        RailComponent,
        HudComponent,
        CrownComponent,
        DeckComponent,
        MorphComponent,
    ],
    templateUrl: './header-prototype.component.html',
    styleUrl: './header-prototype.component.less',
    providers: [HeaderState],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderPrototypeComponent {
    /**
     * Варианты прототипа в порядке переключения.
     */
    protected readonly variants: readonly HeaderVariantOption[] = HEADER_PROTOTYPE_VARIANTS;

    /**
     * Выбранный вариант; `null` — боевая шапка.
     */
    protected readonly activeVariantId = signal<HeaderVariantId | null>(null);

    /**
     * Признак видимости пилюли-переключателя: только разработка и только
     * когда вариант уже включён.
     */
    protected readonly isSwitcherVisible = computed(() => !environment.production && this.activeVariantId() !== null);

    private readonly router = inject(Router);

    private readonly platformId = inject(PLATFORM_ID);

    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        // Подстановка варианта после первого кадра: сервер рисует боевую
        // шапку, и клиентский рендер гидратации обязан с ней совпасть.
        afterNextRender(() => {
            this.syncFromUrl(this.router.url);

            this.router.events
                .pipe(
                    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
                    takeUntilDestroyed(this.destroyRef)
                )
                .subscribe((event) => this.syncFromUrl(event.urlAfterRedirects));
        });
    }

    /**
     * Выбирает вариант и синхронизирует параметр адреса.
     *
     * @param variantId Идентификатор варианта; `null` — вернуться к боевой шапке.
     */
    protected selectVariant(variantId: HeaderVariantId | null): void {
        this.activeVariantId.set(variantId);

        void this.router.navigate([], {
            queryParams: { [VARIANT_QUERY_PARAM]: variantId },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    /**
     * Читает идентификатор варианта из адреса и кладёт его в сигнал.
     *
     * @param url Полный адрес перехода из события роутера.
     */
    private syncFromUrl(url: string): void {
        const query = url.split('?')[1] ?? '';
        const value = new URLSearchParams(query).get(VARIANT_QUERY_PARAM);

        this.activeVariantId.set(this.isKnownVariant(value) ? value : null);
    }

    /**
     * Проверяет, что значение параметра — известный вариант.
     *
     * @param value Значение `?hvariant=`.
     * @returns true, если значение есть в списке вариантов.
     */
    private isKnownVariant(value: string | null): value is HeaderVariantId {
        return this.variants.some((variant) => variant.id === value);
    }
}
