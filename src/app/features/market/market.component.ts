import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { afterNextRender, Component, ChangeDetectionStrategy, ElementRef, inject, NgZone, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AsyncPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { TuiDialogService, TuiIcon } from '@taiga-ui/core';
import { catchError, filter, map, Observable, of, switchMap } from 'rxjs';
import { TranslatePipe, AmountPipe } from '@core/i18n';
import { environment } from '@core/config/environments/environment';
import { DonateService } from '@entities/donate';
import { UserService } from '@entities/user/api/user.service';
import { TitlesComponent } from './components/titles/titles.component';
import { KitsComponent } from './components/kits/kits.component';
import { SpecialComponent } from './components/special/special.component';
import { HowToBuyComponent } from './components/how-to-buy/how-to-buy.component';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { PrototypeSwitcherComponent } from '@shared/ui/prototype-switcher';
import { RevealDirective, TabsPillDirective } from '@shared/lib/directives';
import { ProtoPraisComponent } from './components/proto-prais/proto-prais.component';
import { ProtoSplitComponent } from './components/proto-split/proto-split.component';
import { ProtoVitrinaComponent } from './components/proto-vitrina/proto-vitrina.component';
import { FUNDING_TARGETS } from './lib/funding-targets.constant';
import { WORLD_SHOTS } from './lib/world-shots.constant';

/**
 * Компонент магазина привилегий.
 */
@Component({
    selector: 'app-market',
    imports: [AmountPipe, PageHeaderComponent, TitlesComponent, KitsComponent, SpecialComponent, TuiIcon, TranslatePipe, AsyncPipe, RevealDirective, TabsPillDirective, PrototypeSwitcherComponent, ProtoPraisComponent, ProtoSplitComponent, ProtoVitrinaComponent],
    templateUrl: './market.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketComponent {
    /**
     * Текущий маршрут — для чтения вкладки из адреса.
     */
    private readonly route = inject(ActivatedRoute);

    /**
     * Сервис навигации — для записи вкладки в адрес.
     */
    private readonly router = inject(Router);

    /**
     * ПРОТОТИП РЕДИЗАЙНА, НЕ ПРОДАКШН: ключ варианта страницы из
     * `?variant=`. Только dev-сборка; в проде адрес игнорируется.
     * Удалить вместе с папками proto-* после выбора варианта.
     */
    protected readonly marketProto = toSignal(
        this.route.queryParamMap.pipe(
            map((params) => {
                const variant = params.get('variant');

                if (environment.production || !['prais', 'vitrina', 'split'].includes(variant ?? '')) {
                    return null;
                }

                return variant;
            }),
        ),
        { initialValue: null },
    );

    /**
     * Ключи вариантов для панели переключения.
     */
    protected readonly protoVariants = ['prais', 'vitrina', 'split'];

    /**
     * Имена вариантов для панели переключения.
     */
    protected readonly protoNames: Record<string, string> = {
        prais: 'прайс строками, без вкладок',
        vitrina: 'витрина карточек, цена на картинке',
        split: 'сетка + липкая боковая панель',
    };

    /**
     * Ключи вкладок в адресе (`?tab=`), в порядке `tabs`.
     * Позволяют дать ссылку сразу на наборы или особые товары.
     */
    private readonly tabKeys = ['titles', 'kits', 'special'] as const;

    /**
     * Индекс открытой вкладки. Начальное значение берётся из `?tab=`.
     */
    protected readonly activeItemIndex = signal(
        Math.max(0, this.tabKeys.indexOf(this.route.snapshot.queryParamMap.get('tab') as (typeof this.tabKeys)[number]))
    );

    /**
     * Открывает вкладку и сохраняет её в адресе без новой записи в истории.
     *
     * @param index Индекс вкладки.
     */
    /**
     * Сцена смены вкладок: в неё клонируется уходящая панель.
     */
    private readonly tabStage = viewChild.required<ElementRef<HTMLElement>>('tabStage');

    /**
     * Направление перехода: 1 — вправо по списку вкладок, -1 — влево.
     * Из него сцена берёт, с какой стороны въезжает контент.
     */
    protected readonly tabDirection = signal(1);

    /**
     * Открывает вкладку: направление и уходящая панель для выхода,
     * ключ вкладки в адрес для ссылки.
     *
     * @param index Индекс вкладки в `tabs`.
     */
    protected selectTab(index: number): void {
        if (index === this.activeItemIndex()) {
            return;
        }

        this.tabDirection.set(index > this.activeItemIndex() ? 1 : -1);

        // Отклик в тот же кадр: плашка стартует до тяжёлой смены панелей.
        const button = this.elementRef.nativeElement.querySelectorAll<HTMLElement>('[role="tab"]')[index];

        if (button) {
            this.tabsPill()?.flyToButton(button);
        }

        // Смена панелей — следующим кадром: её раскладка и первая
        // отрисовка не задерживают первый кадр полёта плашки.
        requestAnimationFrame(() => {
            this.activeItemIndex.set(index);
            void this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { tab: index === 0 ? null : this.tabKeys[index] },
                queryParamsHandling: 'merge',
                replaceUrl: true,
            });
        });
    }

    /**
     * Прогревает картинки скрытых панелей в простое браузера: ленивая
     * загрузка не стартует внутри display:none, и первое раскрытие
     * вкладки платило декодированием всех её картинок в клике.
     */
    private readonly warmHiddenImages = afterNextRender(() => {
        if (typeof requestIdleCallback === 'undefined') {
            return;
        }

        requestIdleCallback(
            () => {
                for (const image of Array.from(
                    this.elementRef.nativeElement.querySelectorAll<HTMLImageElement>('img'),
                )) {
                    void image.decode().catch(() => undefined);
                }
            },
            { timeout: 4000 },
        );
    });

    /**
     * Клонирует уходящую панель в статичный DOM-призрак поверх входящей.
     *
     * Раньше уходящая панель была второй Angular-инстанцией через
     * `ngTemplateOutlet`: каждый клик собирал вкладку дважды — с DI,
     * подписками и сервисами, — и на тяжёлой вкладке «Особое» это
     * роняло кадры в момент старта полёта плашки. Клон — голые узлы:
     * слушателей у него нет, картинки бьются в кэш, живёт он 150ms
     * и снимает себя по `animationend`.
     */
    private spawnExitGhost(): void {
        // Вне зоны: призрак не участвует в change detection.
        this.zone.runOutsideAngular(() => {
            const stage = this.tabStage().nativeElement;
            const current = stage.querySelector<HTMLElement>(
                '.market-tab-content:not(.market-tab-content--exit):not(.market-tab-content--hidden)',
            );

            // Быстрый повторный клик: прежний призрак долетает — снимаем.
            for (const stale of Array.from(stage.querySelectorAll<HTMLElement>('.market-tab-content--exit'))) {
                stale.remove();
            }

            if (!current) {
                return;
            }

            const ghost = current.cloneNode(true) as HTMLElement;

            // Идентификаторы снимаются: дубль id в DOM ломает якоря.
            for (const node of Array.from([ghost, ...ghost.querySelectorAll<HTMLElement>('[id]')])) {
                node.removeAttribute('id');
            }

            ghost.classList.add('market-tab-content--exit');
            ghost.addEventListener(
                'animationend',
                (event) => {
                    if (event.target === ghost && event.animationName.startsWith('market-tab-out-')) {
                        ghost.remove();
                    }
                },
                { once: true },
            );

            stage.appendChild(ghost);
        });
    }

    /**
     * Зона Angular: призрак уходящей панели живёт вне change detection.
     */
    private readonly zone = inject(NgZone);

    /**
     * Подписи вкладок магазина (ключи переводов) в порядке `activeItemIndex`.
     */
    protected readonly tabs = [
        'market.marketPage.tabPrivileges',
        'market.marketPage.tabKits',
        'market.marketPage.tabSpecial',
    ] as const;

    private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

    /**
     * Директива летающей плашки на ряде вкладок.
     */
    private readonly tabsPill = viewChild(TabsPillDirective);

    private readonly dialogs = inject(TuiDialogService);

    /**
     * Скриншоты мира сервера для раздела «Поддержка сервера».
     */
    protected readonly worldShots = WORLD_SHOTS;

    /**
     * Направления, на которые идут покупки, для раздела «Поддержка сервера».
     */
    protected readonly fundingTargets = FUNDING_TARGETS;

    /**
     * Сервис донат-магазина.
     */
    private readonly donateService = inject(DonateService);

    /**
     * Сервис пользователя.
     */
    private readonly userService = inject(UserService);

    /**
     * Текущий баланс осколков авторизованного игрока.
     *
     * Запрашивается только после авторизации, при ошибке поток молчит.
     */
    protected readonly balance$: Observable<string> = this.userService.authState$.pipe(
        filter((isAuth): isAuth is true => isAuth === true),
        switchMap(() =>
            this.donateService.getMyBalance$().pipe(
                map((response) => response.coins),
                catchError(() => of(''))
            )
        )
    );

    /**
     * Открывает диалог пополнения осколков.
     */
    protected howToBuy() {
        this.dialogs.open(new PolymorpheusComponent(HowToBuyComponent), { size: 'auto' }).subscribe();
    }
}
