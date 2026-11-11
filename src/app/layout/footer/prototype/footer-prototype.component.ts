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
import { FooterComponent } from '../footer.component';
import { FOOTER_PROTOTYPE_VARIANTS } from './config/footer-prototype-variants.constant';
import { FooterVariantId, FooterVariantOption } from './model/footer-variant.model';
import { FooterPrototypeState } from './footer-prototype-state.service';
import { FooterPrototypeSwitcherComponent } from './footer-prototype-switcher.component';
import { EmberFieldComponent } from './variants/ember-field/ember-field.component';
import { HearthGateComponent } from './variants/hearth-gate/hearth-gate.component';
import { NightSkylineComponent } from './variants/night-skyline/night-skyline.component';

/** Имя параметра адреса, включающего вариант прототипа. */
const VARIANT_QUERY_PARAM = 'fvariant';

/**
 * Хост прототипа подвала.
 *
 * Читает параметр `?fvariant=` и рисует выбранный вариант вместо боевого
 * `<app-footer />`; без параметра рисуется боевой подвал. Начальный серверный
 * рендер всегда боевой: вариант подставляется после гидратации, чтобы не
 * расходиться с разметкой пререндера. Пилюля-переключатель скрыта в production.
 */
@Component({
    standalone: true,
    selector: 'app-footer-prototype',
    imports: [
        FooterComponent,
        FooterPrototypeSwitcherComponent,
        EmberFieldComponent,
        HearthGateComponent,
        NightSkylineComponent,
    ],
    templateUrl: './footer-prototype.component.html',
    styleUrl: './footer-prototype.component.less',
    providers: [FooterPrototypeState],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FooterPrototypeComponent {
    /**
     * Варианты прототипа в порядке переключения.
     */
    protected readonly variants: readonly FooterVariantOption[] = FOOTER_PROTOTYPE_VARIANTS;

    /**
     * Выбранный вариант; `null` — боевой подвал.
     */
    protected readonly activeVariantId = signal<FooterVariantId | null>(null);

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

        // Подстановка варианта после первого кадра: сервер рисует боевой
        // подвал, и клиентский рендер гидратации обязан с ним совпасть.
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
     * @param variantId Идентификатор варианта; `null` — вернуться к боевому подвалу.
     */
    protected selectVariant(variantId: FooterVariantId | null): void {
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
     * @param value Значение `?fvariant=`.
     * @returns true, если значение есть в списке вариантов.
     */
    private isKnownVariant(value: string | null): value is FooterVariantId {
        return this.variants.some((variant) => variant.id === value);
    }
}
